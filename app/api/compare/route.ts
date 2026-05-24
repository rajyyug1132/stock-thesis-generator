import { NextRequest, NextResponse } from 'next/server';
import { normalizeTicker, InvalidTickerError } from '@/lib/utils/tickers';
import { fetchPrices, fetchFundamentals } from '@/lib/data/yahoo';
import { normalizeFundamentals } from '@/lib/data/normalize';
import { cached } from '@/lib/cache/redis';
import { alignManySeries, type PricePoint } from '@/lib/utils/align';
import {
  logReturns,
  meanReturn,
  volatility,
  annualize,
  correlationMatrix,
} from '@/lib/data/returns';
import type { Fundamentals } from '@/lib/data/types';
import logger from '@/lib/utils/logger';

// 7% risk-free rate = RBI 10Y G-Sec proxy
const RISK_FREE_RATE = 0.07;

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const symbolsParam = request.nextUrl.searchParams.get('symbols');

  if (!symbolsParam) {
    return NextResponse.json(
      { error: 'Missing "symbols" query param' },
      { status: 400 }
    );
  }

  const rawSymbols = symbolsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (rawSymbols.length === 0) {
    return NextResponse.json({ error: 'No symbols provided' }, { status: 400 });
  }
  if (rawSymbols.length > 10) {
    return NextResponse.json(
      { error: 'Max 10 symbols per compare' },
      { status: 400 }
    );
  }

  const normalized: string[] = [];
  for (const raw of rawSymbols) {
    try {
      normalized.push(normalizeTicker(raw));
    } catch (err) {
      if (err instanceof InvalidTickerError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }
  }

  try {
    // Fetch prices + fundamentals for all symbols
    const fetched = await Promise.all(
      normalized.map(async (sym) => {
        const [pricesResult, fundamentalsResult] = await Promise.all([
          cached(`stock:${sym}:prices:1y`, 3600, () => fetchPrices(sym, '1y')),
          cached(`stock:${sym}:fundamentals`, 86400, () => fetchFundamentals(sym)),
        ]);
        return {
          symbol: sym,
          prices: pricesResult.data,
          fundamentals: normalizeFundamentals(fundamentalsResult.data),
        };
      })
    );

    // Align all series on common dates
    const seriesList: PricePoint[][] = fetched.map((f) =>
      f.prices.map((p) => ({ date: p.date, close: p.close }))
    );
    const aligned = alignManySeries(seriesList);

    // Build aligned closes object
    const closes: Record<string, number[]> = {};
    fetched.forEach((f, i) => {
      closes[f.symbol] = aligned.values[i];
    });

    // Compute per-symbol stats from aligned series
    const stats: Record<
      string,
      { annualReturn: number; annualVol: number; sharpe: number }
    > = {};
    const returnsBySymbol: Record<string, number[]> = {};

    for (const f of fetched) {
      const seriesCloses = closes[f.symbol];
      const rets = logReturns(seriesCloses);
      returnsBySymbol[f.symbol] = rets;

      const ann = annualize({
        mean: meanReturn(rets),
        vol: volatility(rets),
      });

      stats[f.symbol] = {
        annualReturn: ann.mean,
        annualVol: ann.vol,
        sharpe:
          ann.vol === 0 ? 0 : (ann.mean - RISK_FREE_RATE) / ann.vol,
      };
    }

    // Correlation matrix
    const correlation = correlationMatrix(returnsBySymbol);

    // Fundamentals map
    const fundamentals: Record<string, Fundamentals> = {};
    for (const f of fetched) {
      fundamentals[f.symbol] = f.fundamentals;
    }

    const latency = Date.now() - startTime;
    logger.info(
      {
        symbols: normalized,
        alignedDays: aligned.dates.length,
        latency,
      },
      'Compare computed'
    );

    return NextResponse.json({
      symbols: normalized,
      aligned: {
        dates: aligned.dates,
        closes,
      },
      stats,
      correlation,
      fundamentals,
    });
  } catch (err) {
    logger.error(
      {
        symbols: normalized,
        error: err instanceof Error ? err.message : String(err),
      },
      'Compare error'
    );
    return NextResponse.json(
      { error: 'Failed to compare stocks' },
      { status: 502 }
    );
  }
}
