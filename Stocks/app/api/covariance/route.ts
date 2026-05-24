import { NextRequest, NextResponse } from 'next/server';
import { normalizeTicker, InvalidTickerError } from '@/lib/utils/tickers';
import { isNifty50 } from '@/lib/data/nifty50';
import { fetchPrices } from '@/lib/data/yahoo';
import { cached } from '@/lib/cache/redis';
import { alignManySeries, type PricePoint } from '@/lib/utils/align';
import { logReturns, meanReturn, covarianceMatrix } from '@/lib/data/returns';
import logger from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const symbolsParam = request.nextUrl.searchParams.get('symbols');

  if (!symbolsParam) {
    return NextResponse.json({ error: 'Missing "symbols" query param' }, { status: 400 });
  }

  const raw = symbolsParam.split(',').map((s) => s.trim()).filter(Boolean);
  if (raw.length < 2 || raw.length > 5) {
    return NextResponse.json(
      { error: 'Covariance requires 2–5 symbols' },
      { status: 400 }
    );
  }

  // Normalize + Nifty 50 gate
  const normalized: string[] = [];
  for (const r of raw) {
    let sym: string;
    try {
      sym = normalizeTicker(r);
    } catch (err) {
      if (err instanceof InvalidTickerError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }
    if (!isNifty50(sym)) {
      return NextResponse.json(
        { error: `${sym} not in Nifty 50` },
        { status: 400 }
      );
    }
    normalized.push(sym);
  }

  // Stable cache key — sorted symbols
  const cacheKey = `cov:${[...normalized].sort().join(',')}`;

  try {
    const result = await cached(cacheKey, 3600, async () => {
      // Fetch + align all price series
      const priceResults = await Promise.all(
        normalized.map((sym) =>
          cached(`stock:${sym}:prices:1y`, 3600, () => fetchPrices(sym, '1y'))
        )
      );

      const seriesList: PricePoint[][] = priceResults.map((r) =>
        r.data.map((p) => ({ date: p.date, close: p.close }))
      );
      const aligned = alignManySeries(seriesList);

      // Initial prices = last close of aligned series for each symbol
      const initialPrices: number[] = aligned.values.map(
        (vs) => vs[vs.length - 1]
      );

      // Daily log-returns per symbol, then covariance
      const returnsBySymbol: Record<string, number[]> = {};
      const dailyMeans: number[] = [];
      normalized.forEach((sym, i) => {
        const rets = logReturns(aligned.values[i]);
        returnsBySymbol[sym] = rets;
        dailyMeans.push(meanReturn(rets));
      });

      const { matrix } = covarianceMatrix(returnsBySymbol);

      return {
        symbols: normalized,
        initialPrices,
        dailyMeans,
        covariance: matrix,
        windowDays: aligned.dates.length,
      };
    });

    const latency = Date.now() - startTime;
    logger.info(
      { symbols: normalized, cached: result.cached, latency },
      'Covariance served'
    );

    return NextResponse.json({
      ...result.data,
      meta: {
        windowDays: result.data.windowDays,
        computedAt: new Date().toISOString(),
        cached: result.cached,
        stale: result.stale,
        ...(result.cacheError ? { cacheError: true } : {}),
      },
    });
  } catch (err) {
    logger.error(
      { symbols: normalized, error: err instanceof Error ? err.message : String(err) },
      'Covariance error'
    );
    return NextResponse.json(
      { error: 'Failed to compute covariance' },
      { status: 502 }
    );
  }
}
