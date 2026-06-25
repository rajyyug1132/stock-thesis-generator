import { NextRequest, NextResponse } from 'next/server';
import { fetchPrices } from '@/lib/data/yahoo';
import { cached } from '@/lib/cache/redis';
import { normalizeTicker } from '@/lib/utils/tickers';
import logger from '@/lib/utils/logger';

/**
 * GET /api/v2/backtest?symbols=A,B,C&weights=0.4,0.3,0.3&range=1y
 *
 * Returns a historical replay of a weighted portfolio vs Nifty 50 (^NSEI).
 * Both series are indexed to 100 at the start date.
 */

function maxDrawdown(values: number[]): number {
  let peak = values[0];
  let maxDD = 0;
  for (const v of values) {
    if (v > peak) peak = v;
    const dd = (peak - v) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

function rollingAnnualizedSharpe(dailyReturns: number[]): number {
  if (dailyReturns.length < 2) return 0;
  const mean = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / (dailyReturns.length - 1);
  const vol = Math.sqrt(variance);
  const rf = 0.07 / 252;
  return vol > 0 ? ((mean - rf) / vol) * Math.sqrt(252) : 0;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const symbolsParam = searchParams.get('symbols') ?? '';
  const weightsParam = searchParams.get('weights') ?? '';
  const range = (searchParams.get('range') ?? '1y') as '1y' | '5y';

  if (!symbolsParam) {
    return NextResponse.json({ error: 'symbols param required' }, { status: 400 });
  }
  if (range !== '1y' && range !== '5y') {
    return NextResponse.json({ error: 'range must be 1y or 5y' }, { status: 400 });
  }

  let symbols: string[];
  try {
    symbols = symbolsParam.split(',').map((s) => normalizeTicker(s.trim())).slice(0, 5);
  } catch {
    return NextResponse.json({ error: 'Invalid symbol in symbols param' }, { status: 400 });
  }

  if (symbols.length < 1) {
    return NextResponse.json({ error: 'At least 1 symbol required' }, { status: 400 });
  }

  // Parse weights; if missing, use equal weight
  let weights: number[];
  if (weightsParam) {
    weights = weightsParam.split(',').map(Number).slice(0, symbols.length);
    if (weights.some(isNaN)) {
      return NextResponse.json({ error: 'Invalid weights — must be numbers' }, { status: 400 });
    }
    const total = weights.reduce((s, w) => s + w, 0);
    weights = weights.map((w) => w / total);
  } else {
    weights = symbols.map(() => 1 / symbols.length);
  }

  const cacheKey = `backtest:${symbols.sort().join(',')}:${weights.map((w) => w.toFixed(2)).join(',')}:${range}`;

  try {
    const { data } = await cached(cacheKey, 3600, async () => {
      // Fetch all symbol prices + Nifty benchmark in parallel
      const priceArrays = await Promise.all([
        ...symbols.map((sym) => fetchPrices(sym, range)),
        fetchPrices('^NSEI', range),
      ]);

      const niftyPrices = priceArrays[priceArrays.length - 1];
      const stockPrices = priceArrays.slice(0, symbols.length);

      // Find common dates (inner join)
      const dateSet = new Set(niftyPrices.map((p) => p.date));
      for (const prices of stockPrices) {
        const stockDates = new Set(prices.map((p) => p.date));
        for (const d of dateSet) {
          if (!stockDates.has(d)) dateSet.delete(d);
        }
      }

      const commonDates = [...dateSet].sort();
      if (commonDates.length < 10) {
        throw new Error('Not enough common trading days for backtest');
      }

      // Build price maps
      const stockMaps = stockPrices.map((prices) => {
        const m = new Map(prices.map((p) => [p.date, p.close]));
        return m;
      });
      const niftyMap = new Map(niftyPrices.map((p) => [p.date, p.close]));

      // Compute portfolio daily values (indexed to 100 at start)
      const startDate = commonDates[0];
      const portfolioPrices = commonDates.map((date) => {
        // Weighted sum of normalized prices
        let value = 0;
        for (let i = 0; i < symbols.length; i++) {
          const price = stockMaps[i].get(date) ?? 0;
          const startPrice = stockMaps[i].get(startDate) ?? price;
          const normalizedReturn = startPrice > 0 ? price / startPrice : 1;
          value += weights[i] * normalizedReturn;
        }
        return value * 100; // indexed to 100
      });

      // Nifty normalized
      const niftyStart = niftyMap.get(startDate) ?? 1;
      const niftyValues = commonDates.map((date) => {
        const price = niftyMap.get(date) ?? niftyStart;
        return (price / niftyStart) * 100;
      });

      // Daily portfolio returns for Sharpe
      const dailyReturns = portfolioPrices.slice(1).map((v, i) => (v - portfolioPrices[i]) / portfolioPrices[i]);
      const niftyDailyReturns = niftyValues.slice(1).map((v, i) => (v - niftyValues[i]) / niftyValues[i]);

      const portTotalReturn = (portfolioPrices[portfolioPrices.length - 1] - 100) / 100;
      const niftyTotalReturn = (niftyValues[niftyValues.length - 1] - 100) / 100;

      return {
        dates: commonDates,
        portfolioValues: portfolioPrices.map((v) => +v.toFixed(2)),
        niftyValues: niftyValues.map((v) => +v.toFixed(2)),
        symbols,
        weights,
        range,
        metrics: {
          portfolioTotalReturn: +(portTotalReturn * 100).toFixed(2),
          niftyTotalReturn: +(niftyTotalReturn * 100).toFixed(2),
          alpha: +((portTotalReturn - niftyTotalReturn) * 100).toFixed(2),
          maxDrawdown: +(maxDrawdown(portfolioPrices) * 100).toFixed(2),
          sharpe: +rollingAnnualizedSharpe(dailyReturns).toFixed(2),
          niftySharpe: +rollingAnnualizedSharpe(niftyDailyReturns).toFixed(2),
          tradingDays: commonDates.length,
        },
      };
    });

    return NextResponse.json(data);
  } catch (err) {
    logger.error({ symbols, error: (err as Error).message }, 'Backtest error');
    return NextResponse.json(
      { error: 'Failed to compute backtest. Check symbols and try again.' },
      { status: 500 }
    );
  }
}
