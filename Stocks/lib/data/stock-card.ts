import { cache } from 'react';
import { cached } from '@/lib/cache/redis';
import { normalizeTicker } from '@/lib/utils/tickers';
import { fetchPrices } from '@/lib/data/yahoo';
import { logReturns, annualize, volatility, meanReturn } from '@/lib/data/returns';
import { getSector, getName } from '@/lib/data/nifty50';

export type StockCardData = {
  symbol: string;
  name: string;
  sector: string | null;
  currentPrice: number;
  annualReturn: number;          // e.g., -0.059
  annualVol: number;             // e.g., 0.20
  sparkline: number[];           // last 60 closes for mini SVG (not all 248)
  fetchedAt: string;
};

// React cache() deduplicates within one render pass
// Redis cache deduplicates across requests and restarts
export const fetchStockForCard = cache(async (rawSymbol: string): Promise<StockCardData> => {
  const symbol = normalizeTicker(rawSymbol);

  const cacheResult = await cached(`card:${symbol}`, 3600, async () => {
    const prices = await fetchPrices(symbol, '1y');

    const closes = prices.map(p => p.close);
    const returns = logReturns(closes);
    const { mean, vol } = annualize({ mean: meanReturn(returns), vol: volatility(returns) });

    return {
      symbol,
      name: getName(symbol) ?? symbol.replace('.NS', ''),
      sector: getSector(symbol),
      currentPrice: closes[closes.length - 1] ?? 0,
      annualReturn: mean,
      annualVol: vol,
      sparkline: closes.slice(-60),   // last 60 points only — smaller, faster SVG
      fetchedAt: new Date().toISOString(),
    };
  });

  return cacheResult.data;
});
