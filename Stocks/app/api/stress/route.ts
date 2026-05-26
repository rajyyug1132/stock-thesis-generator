import { NextRequest, NextResponse } from 'next/server';
import { generateShockSpec } from '@/lib/stress/shockGenerator';
import { cached } from '@/lib/cache/redis';

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

  const sortedSymbols = [...symbols].sort().join(',');
  const cacheKey = `stress:${sortedSymbols}:${query.toLowerCase().trim()}`;

  try {
    const { data: spec } = await cached(cacheKey, 1800, () =>
      generateShockSpec(query.trim(), symbols)
    );
    return NextResponse.json({ spec });
  } catch (err) {
    console.error('[stress POST]', err);
    return NextResponse.json(
      { error: 'Failed to parse scenario', details: (err as Error).message },
      { status: 500 }
    );
  }
}
