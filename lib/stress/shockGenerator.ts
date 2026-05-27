import { getAI, flashModel, geminiAvailable } from '@/lib/ai/gemini';
import { groqGenerate, groqAvailable } from '@/lib/ai/groq';
import type { ShockSpec } from './types';
import { NIFTY_50, getSector } from '@/lib/data/nifty50';

const SYSTEM_PROMPT = `You are a financial risk analyst translating natural-language stress scenarios into structured shock specifications for a Monte Carlo simulator on Indian equities.

Given a user query and a portfolio composition with sector tags, output a structured JSON ShockSpec that maps the scenario to specific parameter shocks.

SHOCK TYPES:
1. initialPriceShock: instantaneous price jump as fraction. Range [-0.5, 0.5]. Use for: M&A, earnings surprise, geopolitical events, immediate supply shocks.
2. driftMultiplier: multiply daily expected return. Range [-2, 3]. Use for: regime changes (rate hikes affect BFSI drift), structural shifts.
3. volMultiplier: multiply volatility. Range [0.5, 4]. Use for: uncertainty events, crisis periods, regulatory ambiguity.
4. correlationAdjustments: in crisis scenarios correlations approach 1. Use sparingly.

MAPPING RULES:
- Oil price up: RELIANCE, ONGC initialPriceShock positive. Auto/Aviation: drift negative.
- Rate hike: BFSI drift positive short-term, vol up. IT large: drift negative. Real estate proxies: drift very negative.
- INR depreciation: IT exporters (TCS, INFY, WIPRO): drift positive. Importers/Auto: drift negative.
- Equity crisis / black swan / crash: all volMultiplier 1.8-2.5x, correlations toward 0.85+.
- Bullish breakout: driftMultiplier 1.5-2.0x positive across all, vol unchanged.
- Sector-specific (e.g. tech crash): only IT stocks shocked.

DISCIPLINE:
- Only shock symbols present in the provided portfolio. Do not invent symbols.
- If query is unclear or unrelated to markets, return shocks: [] with a rationale explaining why.
- confidence='high' for clearly mapped scenarios, 'medium' for plausible uncertain mappings, 'low' for stretched interpretations.
- rationale: 1-2 sentences. Plain English. Explain WHY these specific shocks.
- scenarioName: 3-6 words. Title case.

Output JSON only. No prose preamble.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    rationale: { type: 'string' },
    scenarioName: { type: 'string' },
    shocks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          symbol: { type: 'string' },
          initialPriceShock: { type: 'number' },
          driftMultiplier: { type: 'number' },
          volMultiplier: { type: 'number' },
        },
        required: ['symbol'],
      },
    },
    correlationAdjustments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          pair: { type: 'array', items: { type: 'string' } },
          newCorrelation: { type: 'number' },
        },
        required: ['pair', 'newCorrelation'],
      },
    },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['rationale', 'scenarioName', 'shocks', 'confidence'],
};

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('quota') ||
    msg.includes('429') ||
    msg.includes('rate limit') ||
    msg.includes('rate_limit')
  );
}

/** Validate + coerce raw parsed JSON into a ShockSpec, throwing if required fields are missing. */
function coerceShockSpec(raw: unknown): ShockSpec {
  if (!raw || typeof raw !== 'object') throw new Error('ShockSpec: expected object');
  const r = raw as Record<string, unknown>;
  if (typeof r.rationale !== 'string') throw new Error('ShockSpec: missing rationale');
  if (typeof r.scenarioName !== 'string') throw new Error('ShockSpec: missing scenarioName');
  if (!Array.isArray(r.shocks)) throw new Error('ShockSpec: missing shocks array');
  if (!['high', 'medium', 'low'].includes(r.confidence as string)) {
    r.confidence = 'medium';
  }
  return r as unknown as ShockSpec;
}

async function generateWithGroq(query: string, portfolioContext: object[]): Promise<ShockSpec> {
  const userPrompt = `Portfolio: ${JSON.stringify(portfolioContext)}\n\nScenario: ${query}`;
  const raw = await groqGenerate({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.2,
  });
  return coerceShockSpec(JSON.parse(raw));
}

export async function generateShockSpec(
  query: string,
  symbols: string[]
): Promise<ShockSpec> {
  const portfolioContext = symbols.map((s) => ({
    symbol: s,
    name: NIFTY_50.find((n) => n.symbol === s)?.name,
    sector: getSector(s),
  }));

  // 1. Try Gemini Flash (structured output with responseSchema)
  if (geminiAvailable()) {
    try {
      const response = await getAI().models.generateContent({
        model: flashModel,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Portfolio:\n${JSON.stringify(portfolioContext, null, 2)}\n\nScenario:\n${query}`,
              },
            ],
          },
        ],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.2,
        },
      });
      return JSON.parse(response.text!) as ShockSpec;
    } catch (err) {
      if (!isQuotaError(err)) throw err;
      // Quota exhausted — fall through to Groq
    }
  }

  // 2. Groq fallback (llama-3.3-70b, json_object mode)
  if (groqAvailable()) {
    return generateWithGroq(query, portfolioContext);
  }

  throw new Error('No AI provider available for stress test — set GEMINI_API_KEY or GROQ_API_KEY');
}
