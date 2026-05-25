import { ai, proModel, flashModel } from './gemini';
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

export async function generateThesis(context: Context): Promise<Thesis & { tokenUsage?: object }> {
  const userContent = JSON.stringify(context, null, 2);

  // Try pro first, fall back to flash if quota exhausted
  const attempt = async (extraSuffix = '', model = proModel): Promise<Thesis & { tokenUsage?: object }> => {
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
    const parsed: unknown = JSON.parse(text);

    // Inject symbol + generatedAt if Gemini omits them
    if (typeof parsed === 'object' && parsed !== null) {
      const obj = parsed as Record<string, unknown>;
      if (!obj.symbol) obj.symbol = context.symbol;
      if (!obj.generatedAt) obj.generatedAt = new Date().toISOString();
    }

    const thesis = ThesisSchema.parse(parsed);
    const tokenUsage = response.usageMetadata ?? undefined;

    return { ...thesis, tokenUsage };
  };

  try {
    return await attempt();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // If quota exhausted on pro, fall back to flash
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      try {
        return await attempt('', flashModel);
      } catch {
        return await attempt(RETRY_SUFFIX, flashModel);
      }
    }
    // Other error: retry with stricter prompt on same model
    return await attempt(RETRY_SUFFIX);
  }
}
