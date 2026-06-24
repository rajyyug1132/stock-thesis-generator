import { NextRequest, NextResponse } from 'next/server';
import { normalizeTicker, InvalidTickerError } from '@/lib/utils/tickers';
import { fetchPrices, fetchFundamentals, YahooFetchError } from '@/lib/data/yahoo';
import { normalizeFundamentals } from '@/lib/data/normalize';
import { cached, readCache } from '@/lib/cache/redis';
import { StockDataSchema } from '@/lib/data/types';
import logger from '@/lib/utils/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const startTime = Date.now();
  const { symbol: rawSymbol } = await params;

  try {
    // 1. Normalize ticker
    let symbol: string;
    try {
      symbol = normalizeTicker(rawSymbol);
    } catch (err) {
      if (err instanceof InvalidTickerError) {
        logger.warn({ symbol: rawSymbol, error: err.message }, 'Invalid ticker');
        return NextResponse.json(
          { error: err.message },
          { status: 400 }
        );
      }
      throw err;
    }

    // Index symbols (^NSEI, ^BSESN) have prices but no fundamentals
    const isIndex = symbol.startsWith('^');

    // 2. Fetch prices and fundamentals in parallel with caching
    const [pricesResult, fundamentalsResult] = await Promise.all([
      cached(
        `stock:${symbol}:prices:1y`,
        3600, // 1 hour TTL
        () => fetchPrices(symbol, '1y')
      ),
      isIndex
        ? Promise.resolve({ data: { marketCap: null, peRatio: null, pbRatio: null, roe: null, debtToEquity: null, dividendYield: null }, cached: false, stale: false, cacheError: false })
        : cached(
            `stock:${symbol}:fundamentals`,
            86400, // 24 hour TTL
            () => fetchFundamentals(symbol)
          ),
    ]);

    const prices = pricesResult.data;
    const rawFundamentals = fundamentalsResult.data;
    const fundamentals = isIndex
      ? (rawFundamentals as ReturnType<typeof normalizeFundamentals>)
      : normalizeFundamentals(rawFundamentals);

    // 3. Check for cached thesis to attach priceDropEvent if exists
    let priceDropEvent = null;
    try {
      const thesisCached = await readCache(`thesis:${symbol}:v3`);
      if (thesisCached && thesisCached.thesis) {
        priceDropEvent = thesisCached.thesis.priceDropEvent || null;
      }
    } catch (err) {
      logger.warn({ symbol, error: err instanceof Error ? err.message : String(err) }, 'Failed to read cached thesis');
    }

    // 4. Construct response
    const fetchedAt = new Date().toISOString();
    const isCached = pricesResult.cached || fundamentalsResult.cached;
    const stale = pricesResult.stale || fundamentalsResult.stale;
    const cacheError = pricesResult.cacheError || fundamentalsResult.cacheError;

    const response = {
      symbol,
      name: rawSymbol.toUpperCase(),
      currency: 'INR',
      prices,
      fundamentals,
      priceDropEvent,
      meta: {
        fetchedAt,
        cached: isCached,
        stale,
        source: 'yahoo',
        ...(cacheError ? { cacheError: true } : {}),
      },
    };

    // 4. Validate response schema
    const validated = StockDataSchema.parse(response);

    const latency = Date.now() - startTime;
    logger.info(
      {
        symbol,
        cached: isCached,
        stale,
        latency,
        priceCount: prices.length,
      },
      'Stock data retrieved'
    );

    return NextResponse.json(validated);
  } catch (err) {
    const latency = Date.now() - startTime;

    if (err instanceof YahooFetchError) {
      logger.error(
        {
          symbol: rawSymbol,
          error: err.message,
          cause: err.cause,
          latency,
        },
        'Yahoo fetch failed, no cache available'
      );
      return NextResponse.json(
        { error: 'Failed to fetch stock data' },
        { status: 502 }
      );
    }

    logger.error(
      {
        symbol: rawSymbol,
        error: err instanceof Error ? err.message : String(err),
        latency,
      },
      'Unexpected error'
    );

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
