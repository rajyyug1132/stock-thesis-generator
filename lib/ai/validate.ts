import { nvidiaGenerate, nvidiaAvailable } from './nvidia';
import {
  ValidationResultSchema,
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

const SCHEMA_HINT = `
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

function buildPrompt(thesis: Thesis, context: Context): { userPrompt: string } {
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

  // Percentage-form stats so the verifier can match numbers.
  // compactContext() converts annualReturn 0.052 → 5.2 (%) for token efficiency.
  // The full context stores it as 0.052. Without both forms, the verifier sees
  // "5.2%" in the thesis evidence but only finds "0.052" in source → UNVERIFIED.
  const statsPct = {
    annualReturnPct: +(context.stats.annualReturn * 100).toFixed(1),
    annualVolPct:    +(context.stats.annualVol    * 100).toFixed(1),
    pctFromHighPct:  +(context.priceTrend.pctFromHigh * 100).toFixed(1),
    pctFromLowPct:   +(context.priceTrend.pctFromLow  * 100).toFixed(1),
  };

  // Strip prices array + truncate news — keeps request compact
  const sourceData = {
    ...context,
    prices: [],
    news: (context.news ?? []).slice(0, 3).map((n) => ({ title: n.title })),
    _statsPct: statsPct,
  };

  const userPrompt = `SOURCE DATA:\n${JSON.stringify(sourceData, null, 2)}\n\nTHESIS CLAIMS TO VERIFY:\n${JSON.stringify(allClaims, null, 2)}`;
  return { userPrompt };
}

export async function validateThesis(
  thesis: Thesis,
  context: Context
): Promise<ValidationResult> {
  if (!nvidiaAvailable()) {
    // Soft fail: return a neutral validation rather than crashing the whole thesis
    return ValidationResultSchema.parse({
      claims: [],
      overallScore: 0.5,
      summary: 'Validation unavailable — NVIDIA_API_KEY not set.',
    });
  }

  const { userPrompt } = buildPrompt(thesis, context);
  const text = await nvidiaGenerate({
    systemPrompt: SYSTEM_PROMPT + SCHEMA_HINT,
    userPrompt,
    temperature: 0,
  });

  return ValidationResultSchema.parse(JSON.parse(text));
}
