import { z } from 'zod';

// Evidence field rule: MUST cite specific numbers/sources from provided JSON.
// ✓ "P/E ratio of 24.3, below 5Y average ~28"
// ✓ "ROE 8.7% — return improving from FY24 baseline"
// ✓ "Recent news: Q4 results beat estimates (Moneycontrol, 14 days ago)"
// ✗ "strong fundamentals" — no specific number
// ✗ "good management" — unverifiable

// ---- Zod schemas (runtime validation) ----

export const ThesisPointSchema = z.object({
  claim: z.string(),
  evidence: z.string(),
  confidence: z.enum(['high', 'medium', 'low']).catch('medium').optional(),
});

export const ThesisCaseSchema = z.object({
  headline: z.string(),
  points: z.array(ThesisPointSchema).min(1).max(5),
});

const severityEnum = z.enum(['low', 'medium', 'high']).catch('medium');
const impactEnum = z.enum(['positive', 'negative', 'mixed']).catch('mixed');

export const RiskSchema = z.object({
  risk: z.string(),
  severity: severityEnum,
});

export const CatalystSchema = z.object({
  event: z.string(),
  timeframe: z.string(),
  impact: impactEnum,
});

export const ThesisSchema = z.object({
  symbol: z.string(),
  generatedAt: z.string(),
  summary: z.string(),
  bullCase: ThesisCaseSchema,
  bearCase: ThesisCaseSchema,
  risks: z.array(RiskSchema).min(0).max(4),
  catalysts: z.array(CatalystSchema).min(0).max(4),
  priceDropEvent: z.object({
    // Llama models may return a number — coerce to string
    dropPercent: z.union([z.string(), z.number()]).transform(String),
    eventHeadline: z.string(),
  }).nullable().optional(),
});

export type Thesis = z.infer<typeof ThesisSchema>;
export type ThesisPoint = z.infer<typeof ThesisPointSchema>;
export type Risk = z.infer<typeof RiskSchema>;
export type Catalyst = z.infer<typeof CatalystSchema>;

// ---- Validation result schemas ----

export const ValidationClaimSchema = z.object({
  location: z.string(),
  claim: z.string(),
  evidence: z.string(),
  verified: z.boolean(),
  reason: z.string(),
});

export const ValidationResultSchema = z.object({
  // Model sometimes returns score as 0-100 instead of 0-1; normalize
  overallScore: z.number().transform((v) => (v > 1 ? v / 100 : v)),
  claims: z.array(ValidationClaimSchema),
});

export type ValidationClaim = z.infer<typeof ValidationClaimSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
