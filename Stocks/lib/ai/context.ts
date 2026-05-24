import { fetchPrices, fetchFundamentals } from '@/lib/data/yahoo';
import { fetchNews } from '@/lib/data/news';
import { logReturns, meanReturn, volatility, annualize } from '@/lib/data/returns';
import { getName, getSector } from '@/lib/data/nifty50';
import { cached } from '@/lib/cache/redis';
import type { NewsItem } from '@/lib/data/news';
import type { Fundamentals } from '@/lib/data/types';
import type { Price } from '@/lib/data/types';

export interface PriceTrend {
  high1Y: number;
  low1Y: number;
  pctFromHigh: number;
  pctFromLow: number;
}

export interface StatsContext {
  annualReturn: number;
  annualVol: number;
  sharpe: number;
}

export interface Context {
  symbol: string;
  name: string | null;
  sector: string | null;
  currentPrice: number;
  fundamentals: Fundamentals;
  stats: StatsContext;
  priceTrend: PriceTrend;
  prices: Price[];
  news: NewsItem[];
}

// 7% risk-free rate = RBI 10Y G-Sec proxy
const RISK_FREE_RATE = 0.07;

export async function buildContext(symbol: string): Promise<Context> {
  const [pricesResult, fundamentalsResult, news] = await Promise.all([
    cached(`stock:${symbol}:prices:1y`, 3600, () => fetchPrices(symbol, '1y')),
    cached(`stock:${symbol}:fundamentals`, 86400, () => fetchFundamentals(symbol)),
    fetchNews(symbol, 8),
  ]);

  const prices = pricesResult.data;
  const fundamentals = fundamentalsResult.data;

  // Current price = latest close
  const currentPrice = prices.length > 0 ? prices[prices.length - 1].close : 0;

  // Price trend
  const closes = prices.map((p) => p.close);
  const high1Y = closes.length > 0 ? Math.max(...closes) : 0;
  const low1Y = closes.length > 0 ? Math.min(...closes) : 0;
  const pctFromHigh = high1Y > 0 ? (currentPrice - high1Y) / high1Y : 0;
  const pctFromLow = low1Y > 0 ? (currentPrice - low1Y) / low1Y : 0;

  // Return stats
  const rets = logReturns(closes);
  const ann = annualize({ mean: meanReturn(rets), vol: volatility(rets) });
  const sharpe = ann.vol === 0 ? 0 : (ann.mean - RISK_FREE_RATE) / ann.vol;

  return {
    symbol,
    name: getName(symbol),
    sector: getSector(symbol),
    currentPrice,
    fundamentals,
    stats: {
      annualReturn: ann.mean,
      annualVol: ann.vol,
      sharpe,
    },
    priceTrend: {
      high1Y,
      low1Y,
      pctFromHigh,
      pctFromLow,
    },
    prices,
    news,
  };
}
