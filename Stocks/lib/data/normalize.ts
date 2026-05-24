import type { Fundamentals } from './types';

export function normalizeFundamentals(raw: Fundamentals): Fundamentals {
  return {
    marketCap: raw.marketCap, // Already in INR for .NS tickers from Yahoo
    peRatio: raw.peRatio, // Already decimal from Yahoo
    pbRatio: raw.pbRatio, // Already decimal from Yahoo
    roe: raw.roe, // Already normalized in yahoo.ts (Yahoo: financialData.returnOnEquity as decimal)
    debtToEquity: raw.debtToEquity, // Already divided by 100 in yahoo.ts (Yahoo: % → divide by 100)
    dividendYield: raw.dividendYield, // Already decimal from Yahoo (Yahoo: summaryDetail.dividendYield)
  };
}

