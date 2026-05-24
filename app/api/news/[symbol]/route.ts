import { NextRequest, NextResponse } from 'next/server';
import { normalizeTicker, InvalidTickerError } from '@/lib/utils/tickers';
import { fetchNews } from '@/lib/data/news';
import { cached } from '@/lib/cache/redis';
import logger from '@/lib/utils/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const startTime = Date.now();
  const { symbol: rawSymbol } = await params;

  try {
    let symbol: string;
    try {
      symbol = normalizeTicker(rawSymbol);
    } catch (err) {
      if (err instanceof InvalidTickerError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

    const result = await cached(
      `stock:${symbol}:news`,
      1800, // 30 min TTL
      () => fetchNews(symbol, 5)
    );

    const latency = Date.now() - startTime;
    logger.info(
      { symbol, count: result.data.length, cached: result.cached, latency },
      'News fetched'
    );

    return NextResponse.json({
      symbol,
      items: result.data,
      meta: {
        fetchedAt: new Date().toISOString(),
        cached: result.cached,
        ...(result.cacheError ? { cacheError: true } : {}),
      },
    });
  } catch (err) {
    logger.error(
      { symbol: rawSymbol, error: err instanceof Error ? err.message : String(err) },
      'News fetch error'
    );
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 502 }
    );
  }
}
