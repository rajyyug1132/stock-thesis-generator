import { NextRequest, NextResponse } from 'next/server';
import { generateShockSpec } from '@/lib/stress/shockGenerator';
import { cached } from '@/lib/cache/redis';
import logger from '@/lib/utils/logger';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { query, symbols } = body as { query?: string; symbols?: string[] };

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 });
  }
  if (query.trim().length > 200) {
    return NextResponse.json({ error: 'query must be under 200 characters' }, { status: 400 });
  }
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return NextResponse.json({ error: 'symbols array is required' }, { status: 400 });
  }
  // Limit symbols to max 20 and each symbol to 20 chars to bound cache key size
  if (symbols.length > 20) {
    return NextResponse.json({ error: 'Max 20 symbols per stress test' }, { status: 400 });
  }
  const sanitizedSymbols = symbols
    .map((s) => (typeof s === 'string' ? s.slice(0, 20) : ''))
    .filter(Boolean);

  const sortedSymbols = [...sanitizedSymbols].sort().join(',');
  const cacheKey = `stress:${sortedSymbols}:${query.toLowerCase().trim()}`;

  try {
    const { data: spec } = await cached(cacheKey, 1800, () =>
      generateShockSpec(query.trim(), sanitizedSymbols)
    );
    return NextResponse.json({ spec });
  } catch (err) {
    logger.error({ query, symbols: sanitizedSymbols, error: (err as Error).message }, 'Stress parse error');
    return NextResponse.json(
      { error: 'Failed to parse scenario — try rephrasing the query' },
      { status: 500 }
    );
  }
}
