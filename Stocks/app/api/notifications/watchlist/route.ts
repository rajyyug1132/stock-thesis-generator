import { NextRequest, NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and } from 'drizzle-orm';
import { watchlist } from '@/lib/db/schema';
import { supabaseServer } from '@/lib/supabase/server';
import { normalizeTicker, InvalidTickerError } from '@/lib/utils/tickers';
import { isNifty50 } from '@/lib/data/nifty50';
import logger from '@/lib/utils/logger';

async function withDb<T>(fn: (db: ReturnType<typeof drizzle>) => Promise<T>): Promise<T> {
  const conn = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(conn);
  try {
    return await fn(db);
  } finally {
    await conn.end();
  }
}

async function getUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const supabase = supabaseServer();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

/* GET /api/notifications/watchlist — list user's watchlist */
export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const items = await withDb((db) =>
      db.select().from(watchlist).where(eq(watchlist.userId, userId))
    );
    return NextResponse.json({ watchlist: items });
  } catch (err) {
    logger.error({ userId, error: (err as Error).message }, 'Watchlist GET error');
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

/* POST /api/notifications/watchlist — add a symbol */
export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { symbol: rawSymbol } = body as { symbol?: string };

    if (!rawSymbol) {
      return NextResponse.json({ error: 'symbol is required' }, { status: 400 });
    }

    let symbol: string;
    try {
      symbol = normalizeTicker(rawSymbol);
    } catch (err) {
      if (err instanceof InvalidTickerError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

    if (!isNifty50(symbol)) {
      return NextResponse.json(
        { error: `${symbol} is not in Nifty 50. Only Nifty 50 stocks supported.` },
        { status: 400 }
      );
    }

    // Check for duplicates
    const existing = await withDb((db) =>
      db
        .select({ id: watchlist.id })
        .from(watchlist)
        .where(and(eq(watchlist.userId, userId), eq(watchlist.symbol, symbol)))
    );
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Already in watchlist' }, { status: 409 });
    }

    // Max 20 stocks per user
    const all = await withDb((db) =>
      db.select({ id: watchlist.id }).from(watchlist).where(eq(watchlist.userId, userId))
    );
    if (all.length >= 20) {
      return NextResponse.json({ error: 'Watchlist limit is 20 stocks' }, { status: 400 });
    }

    const [item] = await withDb((db) =>
      db.insert(watchlist).values({ userId, symbol }).returning()
    );

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    logger.error({ userId, error: (err as Error).message }, 'Watchlist POST error');
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

/* DELETE /api/notifications/watchlist?symbol=RELIANCE.NS — remove a symbol */
export async function DELETE(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rawSymbol = request.nextUrl.searchParams.get('symbol');
  if (!rawSymbol) {
    return NextResponse.json({ error: 'symbol query param required' }, { status: 400 });
  }

  let symbol: string;
  try {
    symbol = normalizeTicker(rawSymbol);
  } catch {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
  }

  try {
    await withDb((db) =>
      db
        .delete(watchlist)
        .where(and(eq(watchlist.userId, userId), eq(watchlist.symbol, symbol)))
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ userId, symbol, error: (err as Error).message }, 'Watchlist DELETE error');
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
