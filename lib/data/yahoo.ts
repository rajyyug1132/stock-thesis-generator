import YahooFinanceCtor from 'yahoo-finance2';
import { z } from 'zod';
import type { Fundamentals } from './types';

// yahoo-finance2 v3 changed API — default export is a constructor
const YahooFinance = new (YahooFinanceCtor as unknown as new () => {
  historical: (symbol: string, opts: object) => Promise<unknown>;
  quoteSummary: (symbol: string, opts: object) => Promise<unknown>;
  search: (query: string) => Promise<unknown>;
})();

export class YahooFetchError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'YahooFetchError';
  }
}

export interface HistoricalPrice {
  date: string;
  close: number;
  volume: number;
}

const HistoricalPriceSchema = z.object({
  date: z.string(),
  close: z.number(),
  volume: z.number(),
});

export async function fetchPrices(
  symbol: string,
  range: '1y' | '5y' = '1y',
  attempt: number = 0
): Promise<HistoricalPrice[]> {
  try {
    const result = await YahooFinance.historical(symbol, {
      period1: getPeriodStart(range),
      period2: new Date(),
      interval: '1d',
    });

    if (!Array.isArray(result)) {
      throw new Error('Expected array of historical prices');
    }

    interface RawPrice {
      date: Date | number;
      close: number;
      volume: number;
    }

    const typedResult = result as RawPrice[];

    // Yahoo rate limit → empty array. Retry with .BO fallback
    if (typedResult.length === 0 && attempt === 0 && symbol.endsWith('.NS')) {
      await new Promise((r) => setTimeout(r, 2000));
      const boSymbol = symbol.replace('.NS', '.BO');
      return fetchPrices(boSymbol, range, 1);
    }

    if (typedResult.length === 0) {
      throw new Error('No historical data returned (rate limit or invalid symbol)');
    }

    const prices = typedResult.map((r) => ({
      date: new Date(r.date).toISOString().split('T')[0],
      close: r.close,
      volume: r.volume,
    }));

    return HistoricalPriceSchema.array().parse(prices);
  } catch (err) {
    throw new YahooFetchError(`Failed to fetch prices for ${symbol}`, err);
  }
}

export async function fetchFundamentals(symbol: string): Promise<Fundamentals> {
  try {
    const result = await YahooFinance.quoteSummary(symbol, {
      modules: [
        'price',
        'summaryDetail',
        'financialData',
        'defaultKeyStatistics',
      ],
    });

    if (!result) {
      throw new Error('No quote summary result');
    }

    // Extract nested modules
    const price = (result as any).price || {};
    const summaryDetail = (result as any).summaryDetail || {};
    const financialData = (result as any).financialData || {};
    const keyStats = (result as any).defaultKeyStatistics || {};

    // Type guard: strip Yahoo's string values like "N/A"
    const toNumber = (val: unknown): number | null => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string' || val === null) return null;
      return null;
    };

    // Yahoo returns inconsistent shapes; extract with fallbacks
    const marketCap = toNumber(price.marketCap || summaryDetail.marketCap);
    const peRatio = toNumber(summaryDetail.trailingPE);
    const pbRatio = toNumber(keyStats.priceToBook);
    const roe = toNumber(financialData.returnOnEquity);
    const debtToEquity = financialData.debtToEquity
      ? toNumber(financialData.debtToEquity / 100)
      : null;
    const dividendYield = toNumber(summaryDetail.dividendYield);

    return {
      marketCap,
      peRatio,
      pbRatio,
      roe,
      debtToEquity,
      dividendYield,
    };
  } catch (err) {
    throw new YahooFetchError(`Failed to fetch fundamentals for ${symbol}`, err);
  }
}

function getPeriodStart(range: '1y' | '5y'): Date {
  const now = new Date();
  if (range === '1y') {
    return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  }
  return new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
}
