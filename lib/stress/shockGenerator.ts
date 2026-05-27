import { getAI, flashModel } from '@/lib/ai/gemini';
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

export async function generateShockSpec(
  query: string,
  symbols: string[]
): Promise<ShockSpec> {
  const portfolioContext = symbols.map((s) => ({
    symbol: s,
    name: NIFTY_50.find((n) => n.symbol === s)?.name,
    sector: getSector(s),
  }));

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
}
