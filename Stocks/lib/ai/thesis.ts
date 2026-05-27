import { getAI, geminiAvailable, proModel, flashModel, flash2Model } from './gemini';
import { deepseekGenerate, deepseekAvailable, isGeminiQuotaError } from './deepseek';
import { groqGenerate, groqAvailable, isGroqRateLimitError } from './groq';
import { ThesisSchema, thesisResponseSchema, type Thesis } from './schemas';
import type { Context } from './context';

const SYSTEM_PROMPT = `You are a sober equity analyst writing a structured thesis for an Indian-listed stock. You will be given a JSON object with current fundamentals, price stats, and recent news.

STRICT RULES:
1. Every numeric claim in the 'evidence' field MUST reference a number that appears in the provided JSON. Do not invent numbers, estimates, or comparisons to data not provided.
2. If you don't know a fact (e.g., 5Y average P/E), say so explicitly: "(historical comparison not available in data)". Do not guess.
3. Bull and bear cases must be genuinely opposing — not the same point reframed.
4. Risks must be specific to this company/sector, not boilerplate like "market volatility".
5. Catalysts must include a concrete timeframe (e.g., "Q1 FY27 results", "within 3 months").
6. Tone: analytical, neutral. Not promotional. Not doom-mongering.
7. Output ONLY valid JSON matching the schema. No prose preamble.
8. If the stock has a negative 1Y annual return (e.g., -34.7%) and there is recent news context explaining this drop (e.g., weak earnings guidance, margin pressure), populate the 'priceDropEvent' field with the return percent and matching news headline. Otherwise, set it to null.`;

const RETRY_SUFFIX = `\n\nCRITICAL: Your previous response failed schema validation. Ensure ALL evidence fields cite specific numbers from the JSON (e.g. "P/E of 24.3").`;

/** Compact prompt for Groq/DeepSeek — fits within tight TPM budgets */
const GROQ_SYSTEM_PROMPT = `Equity analyst. Write investment thesis as JSON for an Indian NSE stock. Use only numbers from the provided data. Output ONLY JSON, no prose.`;

const GROQ_SCHEMA_HINT = `
Return JSON: {"symbol":"X.NS","generatedAt":"ISO date","summary":"2 sentences","bullCase":{"headline":"str","points":[{"claim":"str","evidence":"cite data numbers"}]},"bearCase":{"headline":"str","points":[{"claim":"str","evidence":"cite data numbers"}]},"risks":[{"risk":"str","severity":"high|medium|low"}],"catalysts":[{"event":"str","timeframe":"str","impact":"positive|negative|mixed"}],"priceDropEvent":null}
3-4 bull, 3-4 bear, 2-3 risks, 2-3 catalysts. Evidence MUST cite actual numbers from the data.`;

const DEEPSEEK_SCHEMA_HINT = `
Output a JSON object with this exact structure:
{
  "symbol": "string (e.g. RELIANCE.NS)",
  "generatedAt": "ISO 8601 datetime string",
  "summary": "2-3 sentence executive summary",
  "bullCase": {
    "headline": "short bull headline",
    "points": [
      { "claim": "string", "evidence": "string citing specific numbers from the data", "confidence": "high|medium|low" }
    ]
  },
  "bearCase": {
    "headline": "short bear headline",
    "points": [
      { "claim": "string", "evidence": "string citing specific numbers from the data", "confidence": "high|medium|low" }
    ]
  },
  "risks": [
    { "risk": "string", "severity": "high|medium|low" }
  ],
  "catalysts": [
    { "event": "string", "timeframe": "string", "impact": "positive|negative|mixed" }
  ],
  "priceDropEvent": null
}
Provide 3-4 bull points, 3-4 bear points, 2-3 risks, 2-3 catalysts.`;

/**
 * Trim context for providers with tight request-size limits (Groq, DeepSeek).
 * Strips the raw prices array entirely (stats already capture annualReturn/vol/sharpe/trend)
 * and keeps only 5 news items. Saves ~15k tokens with no loss of thesis quality.
 */
function trimContext(context: Context): Omit<Context, 'prices'> & { prices: never[] } {
  return {
    ...context,
    prices: [],   // stats object covers everything the AI needs
    news: context.news?.slice(0, 5) ?? [],
  };
}

function injectDefaults(parsed: unknown, context: Context): unknown {
  if (typeof parsed === 'object' && parsed !== null) {
    const obj = parsed as Record<string, unknown>;
    if (!obj.symbol) obj.symbol = context.symbol;
    if (!obj.generatedAt) obj.generatedAt = new Date().toISOString();
  }
  return parsed;
}

// ── Gemini path ──────────────────────────────────────────────────────────────

async function attemptGemini(
  context: Context,
  extraSuffix = '',
  model = proModel
): Promise<Thesis & { tokenUsage?: object }> {
  const ai = getAI();
  const userContent = JSON.stringify(context, null, 2);

  const response = await ai.models.generateContent({
    model,
    config: {
      temperature: 0.3,
      responseMimeType: 'application/json',
      responseSchema: thesisResponseSchema,
      systemInstruction: SYSTEM_PROMPT + extraSuffix,
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: `Generate an investment thesis for this stock:\n\n${userContent}` }],
      },
    ],
  });

  const text = response.text ?? '';
  const parsed = injectDefaults(JSON.parse(text), context);
  const thesis = ThesisSchema.parse(parsed);
  return { ...thesis, tokenUsage: response.usageMetadata ?? undefined };
}

// ── DeepSeek path ────────────────────────────────────────────────────────────

async function attemptDeepSeek(context: Context): Promise<Thesis & { tokenUsage?: object }> {
  const userContent = JSON.stringify(trimContext(context), null, 2);

  const text = await deepseekGenerate({
    systemPrompt: SYSTEM_PROMPT + DEEPSEEK_SCHEMA_HINT,
    userPrompt: `Generate an investment thesis for this stock:\n\n${userContent}`,
    temperature: 0.3,
  });

  const rawDs = JSON.parse(text) as Record<string, unknown>;
  rawDs.priceDropEvent = null; // no prices in trimmed context
  const parsed = injectDefaults(rawDs, context);
  return ThesisSchema.parse(parsed) as Thesis & { tokenUsage?: object };
}

// ── Groq path ────────────────────────────────────────────────────────────────

async function attemptGroq(context: Context): Promise<Thesis & { tokenUsage?: object }> {
  const userContent = JSON.stringify(trimContext(context), null, 2);

  const text = await groqGenerate({
    systemPrompt: GROQ_SYSTEM_PROMPT + GROQ_SCHEMA_HINT,
    userPrompt: `Thesis for:\n${userContent}`,
    temperature: 0.3,
  });

  const raw = JSON.parse(text) as Record<string, unknown>;
  // No prices in context → model can't assess price drops → force null
  raw.priceDropEvent = null;
  const parsed = injectDefaults(raw, context);
  return ThesisSchema.parse(parsed) as Thesis & { tokenUsage?: object };
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function generateThesis(context: Context): Promise<Thesis & { tokenUsage?: object }> {
  // 1. Try Gemini Pro
  if (geminiAvailable()) {
    try {
      return await attemptGemini(context);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      if (isGeminiQuotaError(err)) {
        // 2. Gemini 2.5 Pro quota hit — try Flash 2.5
        try {
          return await attemptGemini(context, '', flashModel);
        } catch (flashErr) {
          if (isGeminiQuotaError(flashErr)) {
            // 3. Flash 2.5 also exhausted — try Gemini 2.0 Flash (separate quota pool)
            try {
              return await attemptGemini(context, '', flash2Model);
            } catch (flash2Err) {
              if (!isGeminiQuotaError(flash2Err)) {
                // 2.0 Flash failed for non-quota reason — retry stricter
                try {
                  return await attemptGemini(context, RETRY_SUFFIX, flash2Model);
                } catch {
                  // Fall through to DeepSeek
                }
              }
              // All Gemini quota exhausted — fall through to DeepSeek
            }
          } else {
            // Flash 2.5 failed for non-quota reason — retry with stricter prompt
            try {
              return await attemptGemini(context, RETRY_SUFFIX, flashModel);
            } catch {
              // Still failing, fall through to DeepSeek
            }
          }
        }
      } else if (!msg.includes('GeminiConfigError')) {
        // Non-quota Gemini error: retry with stricter prompt once
        try {
          return await attemptGemini(context, RETRY_SUFFIX);
        } catch {
          // Fall through to DeepSeek
        }
      }
    }
  }

  // 4. DeepSeek fallback
  if (deepseekAvailable()) {
    try {
      return await attemptDeepSeek(context);
    } catch (err) {
      // Insufficient balance or other failure — try Groq
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('Insufficient Balance') && !isGroqRateLimitError(err)) throw err;
    }
  }

  // 5. Groq fallback (14,400 req/day free, Llama 3.3 70B)
  if (groqAvailable()) {
    try {
      return await attemptGroq(context);
    } catch (err) {
      // Let rate-limit and other Groq errors propagate with clear message
      throw err;
    }
  }

  throw new Error(
    'All AI providers unavailable. Set GEMINI_API_KEY, DEEPSEEK_API_KEY, and/or GROQ_API_KEY.'
  );
}
