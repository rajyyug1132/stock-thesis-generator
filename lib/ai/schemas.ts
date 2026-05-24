import { z } from 'zod';
import { Type } from '@google/genai';

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
});

export const ThesisCaseSchema = z.object({
  headline: z.string(),
  points: z.array(ThesisPointSchema).min(1).max(5),
});

export const RiskSchema = z.object({
  risk: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
});

export const CatalystSchema = z.object({
  event: z.string(),
  timeframe: z.string(),
  impact: z.enum(['positive', 'negative', 'mixed']),
});

export const ThesisSchema = z.object({
  symbol: z.string(),
  generatedAt: z.string(),
  summary: z.string(),
  bullCase: ThesisCaseSchema,
  bearCase: ThesisCaseSchema,
  risks: z.array(RiskSchema).min(0).max(4),
  catalysts: z.array(CatalystSchema).min(0).max(4),
});

export type Thesis = z.infer<typeof ThesisSchema>;
export type ThesisPoint = z.infer<typeof ThesisPointSchema>;
export type Risk = z.infer<typeof RiskSchema>;
export type Catalyst = z.infer<typeof CatalystSchema>;

// ---- Gemini responseSchema (structured output) ----

export const thesisResponseSchema = {
  type: Type.OBJECT,
  properties: {
    symbol: { type: Type.STRING },
    generatedAt: { type: Type.STRING },
    summary: { type: Type.STRING },
    bullCase: {
      type: Type.OBJECT,
      properties: {
        headline: { type: Type.STRING },
        points: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              claim: { type: Type.STRING },
              evidence: {
                type: Type.STRING,
                description:
                  'MUST cite a specific number from the provided JSON. Example: "P/E of 24.3". NEVER write vague phrases like "strong fundamentals" or "good growth". If no data supports the claim, say "(data not available)".',
              },
            },
            required: ['claim', 'evidence'],
          },
        },
      },
      required: ['headline', 'points'],
    },
    bearCase: {
      type: Type.OBJECT,
      properties: {
        headline: { type: Type.STRING },
        points: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              claim: { type: Type.STRING },
              evidence: {
                type: Type.STRING,
                description:
                  'MUST cite a specific number from the provided JSON. NEVER write vague phrases.',
              },
            },
            required: ['claim', 'evidence'],
          },
        },
      },
      required: ['headline', 'points'],
    },
    risks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          risk: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
        },
        required: ['risk', 'severity'],
      },
    },
    catalysts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          event: { type: Type.STRING },
          timeframe: { type: Type.STRING },
          impact: { type: Type.STRING, enum: ['positive', 'negative', 'mixed'] },
        },
        required: ['event', 'timeframe', 'impact'],
      },
    },
  },
  required: ['symbol', 'generatedAt', 'summary', 'bullCase', 'bearCase', 'risks', 'catalysts'],
};

// ---- Validation result schemas ----

export const ValidationClaimSchema = z.object({
  location: z.string(),
  claim: z.string(),
  evidence: z.string(),
  verified: z.boolean(),
  reason: z.string(),
});

export const ValidationResultSchema = z.object({
  // Gemini sometimes returns score as 0-100 instead of 0-1; normalize
  overallScore: z.number().transform((v) => (v > 1 ? v / 100 : v)),
  claims: z.array(ValidationClaimSchema),
});

export type ValidationClaim = z.infer<typeof ValidationClaimSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

export const validationResponseSchema = {
  type: Type.OBJECT,
  properties: {
    overallScore: { type: Type.NUMBER },
    claims: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          location: { type: Type.STRING },
          claim: { type: Type.STRING },
          evidence: { type: Type.STRING },
          verified: { type: Type.BOOLEAN },
          reason: { type: Type.STRING },
        },
        required: ['location', 'claim', 'evidence', 'verified', 'reason'],
      },
    },
  },
  required: ['overallScore', 'claims'],
};
