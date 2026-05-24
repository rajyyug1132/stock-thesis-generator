import { ai, flashModel } from './gemini';
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

export async function validateThesis(
  thesis: Thesis,
  context: Context
): Promise<ValidationResult> {
  // Extract all claims from thesis to give Gemini explicit list
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

  const prompt = `SOURCE DATA:\n${JSON.stringify(context, null, 2)}\n\nTHESIS CLAIMS TO VERIFY:\n${JSON.stringify(allClaims, null, 2)}`;

  const response = await ai.models.generateContent({
    model: flashModel,
    config: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: validationResponseSchema,
      systemInstruction: SYSTEM_PROMPT,
    },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  const text = response.text ?? '';
  const parsed: unknown = JSON.parse(text);
  return ValidationResultSchema.parse(parsed);
}
