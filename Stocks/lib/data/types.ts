import { z } from 'zod';

// Price point schema
export const PriceSchema = z.object({
  date: z.string(),
  close: z.number(),
  volume: z.number(),
});

export type Price = z.infer<typeof PriceSchema>;

// Fundamentals schema (all nullable to handle missing Yahoo data)
export const FundamentalsSchema = z.object({
  marketCap: z.number().nullable(),
  peRatio: z.number().nullable(),
  pbRatio: z.number().nullable(),
  roe: z.number().nullable(),
  debtToEquity: z.number().nullable(),
  dividendYield: z.number().nullable(),
});

export type Fundamentals = z.infer<typeof FundamentalsSchema>;

// Main API response schema
export const StockDataSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  currency: z.string(),
  prices: z.array(PriceSchema),
  fundamentals: FundamentalsSchema,
  priceDropEvent: z.object({
    dropPercent: z.string(),
    eventHeadline: z.string(),
  }).nullable().optional(),
  meta: z.object({
    fetchedAt: z.string(),
    cached: z.boolean(),
    stale: z.boolean(),
    source: z.string(),
    cacheError: z.boolean().optional(),
  }),
});

export type StockData = z.infer<typeof StockDataSchema>;

// Yahoo API response schemas
export const YahooPriceSchema = z.object({
  date: z.number(),
  close: z.number(),
  volume: z.number(),
});

export const YahooQuoteSummarySchema = z.object({
  quoteSummary: z.object({
    result: z.array(z.record(z.string(), z.unknown())).nullable(),
    error: z.unknown().nullable(),
  }),
});
