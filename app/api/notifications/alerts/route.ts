import { NextRequest, NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and } from 'drizzle-orm';
import { priceAlerts } from '@/lib/db/schema';
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

/* GET /api/notifications/alerts — list user's active alerts */
export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const alerts = await withDb((db) =>
      db.select().from(priceAlerts).where(eq(priceAlerts.userId, userId))
    );
    return NextResponse.json({ alerts });
  } catch (err) {
    logger.error({ userId, error: (err as Error).message }, 'Alerts GET error');
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

/* POST /api/notifications/alerts — create an alert */
export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { symbol: rawSymbol, targetPrice, direction, label } = body as {
      symbol?: string;
      targetPrice?: unknown;
      direction?: string;
      label?: string;
    };

    if (!rawSymbol) return NextResponse.json({ error: 'symbol is required' }, { status: 400 });
    if (!targetPrice || typeof targetPrice !== 'number' || targetPrice <= 0) {
      return NextResponse.json({ error: 'targetPrice must be a positive number' }, { status: 400 });
    }
    if (direction !== 'above' && direction !== 'below') {
      return NextResponse.json({ error: 'direction must be "above" or "below"' }, { status: 400 });
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

    // Max 50 alerts per user
    const all = await withDb((db) =>
      db.select({ id: priceAlerts.id }).from(priceAlerts).where(eq(priceAlerts.userId, userId))
    );
    if (all.length >= 50) {
      return NextResponse.json({ error: 'Alert limit is 50 per user' }, { status: 400 });
    }

    const [alert] = await withDb((db) =>
      db
        .insert(priceAlerts)
        .values({
          userId,
          symbol,
          targetPrice: targetPrice as number,
          direction: direction as 'above' | 'below',
          label: label?.slice(0, 60) ?? null,
        })
        .returning()
    );

    return NextResponse.json({ alert }, { status: 201 });
  } catch (err) {
    logger.error({ userId, error: (err as Error).message }, 'Alerts POST error');
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

/* DELETE /api/notifications/alerts?id=<uuid> — delete an alert */
export async function DELETE(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id query param required' }, { status: 400 });

  try {
    await withDb((db) =>
      db
        .delete(priceAlerts)
        .where(and(eq(priceAlerts.id, id), eq(priceAlerts.userId, userId)))
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ userId, id, error: (err as Error).message }, 'Alert DELETE error');
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
