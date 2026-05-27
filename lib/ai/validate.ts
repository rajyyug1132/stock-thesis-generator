import { getAI, geminiAvailable, flashModel, flash2Model } from './gemini';
import { deepseekGenerate, deepseekAvailable, isGeminiQuotaError } from './deepseek';
import {
  ValidationResultSchema,
  validationResponseSchema,
  type ValidationResult,
  type Thesis,
} from './schemas';
import type { Context } from './context';

const SYSTEM_PROMPT = `You are a fact-checker. You will be given a structured investment thesis and the source data it was generated from. For each \`evidence\` field in the thesis, determine if the specific numbers and facts cited actually appear in the source data with matching values.

A claim is VERIFIED if:
- Every number it cites appears in the source (within 1% tolerance for rounding)
- Any news reference appears in the news array
- Direction claims (e.g., "improving") are consistent with available data

A claim is UNVERIFIED if:
- It cites a number not in source data
- It compares to historical baselines not provided (e.g., "below 5Y average") — this is unverifiable, mark unverified
- It makes vague qualitative claims without specific data

Output JSON only.`;

const DEEPSEEK_SCHEMA_HINT = `
Output a JSON object:
{
  "claims": [
    {
      "location": "string (e.g. bullCase.points[0])",
      "claim": "string",
      "evidence": "string",
      "verified": true or false,
      "reason": "string explaining why verified or not"
    }
  ],
  "overallScore": 0.0 to 1.0,
  "summary": "1-2 sentences about overall grounding quality"
}`;

function buildPrompt(thesis: Thesis, context: Context): {
  allClaims: Array<{ location: string; claim: string; evidence: string }>;
  userPrompt: string;
} {
  const allClaims: Array<{ location: string; claim: string; evidence: string }> = [];

  thesis.bullCase.points.forEach((p, i) => {
    allClaims.push({ location: `bullCase.points[${i}]`, claim: p.claim, evidence: p.evidence });
  });
  thesis.bearCase.points.forEach((p, i) => {
    allClaims.push({ location: `bearCase.points[${i}]`, claim: p.claim, evidence: p.evidence });
  });
  thesis.risks.forEach((r, i) => {
    allClaims.push({ location: `risks[${i}]`, claim: r.risk, evidence: r.risk });
  });

  const userPrompt = `SOURCE DATA:\n${JSON.stringify(context, null, 2)}\n\nTHESIS CLAIMS TO VERIFY:\n${JSON.stringify(allClaims, null, 2)}`;
  return { allClaims, userPrompt };
}

async function validateWithGemini(thesis: Thesis, context: Context): Promise<ValidationResult> {
  const ai = getAI();
  const { userPrompt } = buildPrompt(thesis, context);

  const response = await ai.models.generateContent({
    model: flashModel,
    config: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: validationResponseSchema,
      systemInstruction: SYSTEM_PROMPT,
    },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
  });

  const text = response.text ?? '';
  return ValidationResultSchema.parse(JSON.parse(text));
}

async function validateWithDeepSeek(thesis: Thesis, context: Context): Promise<ValidationResult> {
  const { userPrompt } = buildPrompt(thesis, context);

  const text = await deepseekGenerate({
    systemPrompt: SYSTEM_PROMPT + DEEPSEEK_SCHEMA_HINT,
    userPrompt,
    temperature: 0,
  });

  return ValidationResultSchema.parse(JSON.parse(text));
}

export async function validateThesis(
  thesis: Thesis,
  context: Context
): Promise<ValidationResult> {
  if (geminiAvailable()) {
    try {
      return await validateWithGemini(thesis, context);
    } catch (err) {
      if (!isGeminiQuotaError(err)) throw err;
      // Flash 2.5 quota exhausted — try Gemini 2.0 Flash
      try {
        const ai = getAI();
        const { userPrompt } = buildPrompt(thesis, context);
        const response = await ai.models.generateContent({
          model: flash2Model,
          config: { temperature: 0, responseMimeType: 'application/json', responseSchema: validationResponseSchema, systemInstruction: SYSTEM_PROMPT },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        });
        return ValidationResultSchema.parse(JSON.parse(response.text ?? ''));
      } catch (flash2Err) {
        if (!isGeminiQuotaError(flash2Err)) throw flash2Err;
        // All Gemini quota exhausted — fall through to DeepSeek
      }
    }
  }

  if (deepseekAvailable()) {
    return await validateWithDeepSeek(thesis, context);
  }

  // Soft fail: return a neutral validation rather than crashing the whole thesis
  return ValidationResultSchema.parse({
    claims: [],
    overallScore: 0.5,
    summary: 'Validation unavailable — no AI provider configured.',
  });
}
