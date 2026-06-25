import { NextRequest, NextResponse } from 'next/server';
import { buildContext } from '@/lib/ai/context';
import { generatePortfolioThesis } from '@/lib/ai/portfolio-thesis';
import { cached } from '@/lib/cache/redis';
import { normalizeTicker } from '@/lib/utils/tickers';
import { safeJson } from '@/lib/utils/security';
import logger from '@/lib/utils/logger';

// Rate limit: 2 requests per minute per IP
const rateMap = new Map<string, { count: number; reset: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || entry.reset < now) {
    rateMap.set(ip, { count: 1, reset: now + 60_000 });
    return false;
  }
  if (entry.count >= 2) return true;
  entry.count++;
  return false;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Rate limit: 2 portfolio thesis requests per minute' }, { status: 429 });
  }

  const body = await safeJson<{ symbols?: unknown; weights?: unknown }>(req);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { symbols, weights } = body;

  if (!Array.isArray(symbols) || symbols.length < 2 || symbols.length > 5) {
    return NextResponse.json({ error: 'symbols must be an array of 2-5 tickers' }, { status: 400 });
  }
  if (!Array.isArray(weights) || weights.length !== symbols.length) {
    return NextResponse.json({ error: 'weights must match symbols length' }, { status: 400 });
  }

  // Normalize and validate tickers
  let normalized: string[];
  try {
    normalized = symbols.map((s) => normalizeTicker(String(s)));
  } catch {
    return NextResponse.json({ error: 'Invalid ticker in symbols array' }, { status: 400 });
  }

  // Ensure weights sum to ~1
  const weightNums = weights.map(Number).filter((w) => !isNaN(w) && w >= 0);
  if (weightNums.length !== weights.length) {
    return NextResponse.json({ error: 'weights must be non-negative numbers' }, { status: 400 });
  }
  const total = weightNums.reduce((s, w) => s + w, 0);
  const normalizedWeights = total > 0 ? weightNums.map((w) => w / total) : weightNums.map(() => 1 / weightNums.length);

  const cacheKey = `portfolio-thesis:${normalized.sort().join(',')}:${normalizedWeights.map((w) => w.toFixed(2)).join(',')}`;

  try {
    const { data: thesis } = await cached(cacheKey, 3600, async () => {
      // Build all contexts in parallel
      const contexts = await Promise.all(normalized.map((sym) => buildContext(sym)));
      return generatePortfolioThesis(contexts, normalizedWeights);
    });

    return NextResponse.json({ thesis });
  } catch (err) {
    logger.error({ symbols: normalized, error: (err as Error).message }, 'Portfolio thesis error');
    return NextResponse.json(
      { error: 'Failed to generate portfolio thesis. Try again in a moment.' },
      { status: 500 }
    );
  }
}
