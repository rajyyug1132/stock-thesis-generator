import { NextRequest, NextResponse } from 'next/server';
import { normalizeTicker, InvalidTickerError } from '@/lib/utils/tickers';
import { fetchPrices, fetchFundamentals } from '@/lib/data/yahoo';
import { normalizeFundamentals } from '@/lib/data/normalize';
import { cached } from '@/lib/cache/redis';
import logger from '@/lib/utils/logger';

interface BatchSuccess {
  status: 'ok';
  data: {
    symbol: string;
    prices: Array<{ date: string; close: number; volume: number }>;
    fundamentals: ReturnType<typeof normalizeFundamentals>;
  };
}

interface BatchError {
  status: 'error';
  error: string;
}

type BatchResult = BatchSuccess | BatchError;

async function fetchOne(rawSymbol: string): Promise<BatchResult> {
  try {
    const symbol = normalizeTicker(rawSymbol);
    const [pricesResult, fundamentalsResult] = await Promise.all([
      cached(`stock:${symbol}:prices:1y`, 3600, () => fetchPrices(symbol, '1y')),
      cached(`stock:${symbol}:fundamentals`, 86400, () => fetchFundamentals(symbol)),
    ]);

    return {
      status: 'ok',
      data: {
        symbol,
        prices: pricesResult.data,
        fundamentals: normalizeFundamentals(fundamentalsResult.data),
      },
    };
  } catch (err) {
    return {
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const symbolsParam = request.nextUrl.searchParams.get('symbols');

  if (!symbolsParam) {
    return NextResponse.json(
      { error: 'Missing "symbols" query param' },
      { status: 400 }
    );
  }

  const rawSymbols = symbolsParam.split(',').map((s) => s.trim()).filter(Boolean);

  if (rawSymbols.length === 0) {
    return NextResponse.json({ error: 'No symbols provided' }, { status: 400 });
  }
  if (rawSymbols.length > 10) {
    return NextResponse.json(
      { error: 'Max 10 symbols per batch' },
      { status: 400 }
    );
  }

  // Validate all symbols upfront (400 if any are syntactically bad)
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

  // Fetch all in parallel; partial success is fine
  const settled = await Promise.allSettled(
    normalized.map((sym) => fetchOne(sym))
  );

  const results: Record<string, BatchResult> = {};
  let succeeded = 0;
  let failed = 0;

  settled.forEach((res, i) => {
    const sym = normalized[i];
    if (res.status === 'fulfilled') {
      results[sym] = res.value;
      if (res.value.status === 'ok') succeeded++;
      else failed++;
    } else {
      results[sym] = { status: 'error', error: String(res.reason) };
      failed++;
    }
  });

  const latency = Date.now() - startTime;
  logger.info(
    { totalRequested: normalized.length, succeeded, failed, latency },
    'Batch stock fetch'
  );

  // If ALL failed, return 502
  if (succeeded === 0) {
    return NextResponse.json(
      {
        results,
        meta: {
          fetchedAt: new Date().toISOString(),
          totalRequested: normalized.length,
          succeeded,
          failed,
        },
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    results,
    meta: {
      fetchedAt: new Date().toISOString(),
      totalRequested: normalized.length,
      succeeded,
      failed,
    },
  });
}
