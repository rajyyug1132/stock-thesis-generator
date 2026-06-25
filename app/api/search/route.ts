import { NextRequest, NextResponse } from 'next/server';
import { ALL_STOCKS } from '@/lib/data/nifty50';

// Simple rate limiting by IP — 30 req/min, no auth required
const rateMap = new Map<string, { count: number; reset: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || entry.reset < now) {
    rateMap.set(ip, { count: 1, reset: now + 60_000 });
    return false;
  }
  if (entry.count >= 30) return true;
  entry.count++;
  return false;
}

/** Levenshtein distance — for fuzzy name matching */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...new Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const q = req.nextUrl.searchParams.get('q')?.trim().toLowerCase() ?? '';

  if (!q || q.length < 1) {
    return NextResponse.json({ results: [] });
  }
  if (q.length > 100) {
    return NextResponse.json({ error: 'Query too long' }, { status: 400 });
  }

  const scored = ALL_STOCKS.map((stock) => {
    const sym = stock.symbol.toLowerCase().replace('.ns', '').replace('.bo', '');
    const name = stock.name.toLowerCase();
    const sector = stock.sector.toLowerCase();

    // Exact prefix match on symbol — highest priority
    if (sym.startsWith(q) || sym === q) return { stock, score: 0 };
    // Substring match on symbol or name — second priority
    if (sym.includes(q) || name.includes(q)) return { stock, score: 1 };
    // Sector match
    if (sector.includes(q)) return { stock, score: 2 };
    // Fuzzy: Levenshtein on short queries (≤ 8 chars) to catch typos
    if (q.length >= 3 && q.length <= 8) {
      const dist = levenshtein(q, sym.slice(0, q.length + 2));
      if (dist <= 1) return { stock, score: 3 + dist };
    }
    return null;
  }).filter(Boolean) as { stock: (typeof ALL_STOCKS)[0]; score: number }[];

  // Sort by score ascending, then alphabetically
  scored.sort((a, b) => a.score - b.score || a.stock.symbol.localeCompare(b.stock.symbol));

  const results = scored.slice(0, 20).map(({ stock }) => ({
    symbol: stock.symbol,
    name: stock.name,
    sector: stock.sector,
    universe: stock.universe,
    shortSymbol: stock.symbol.replace('.NS', '').replace('.BO', ''),
  }));

  return NextResponse.json({ results });
}
