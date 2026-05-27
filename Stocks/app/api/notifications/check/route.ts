/**
 * GET /api/notifications/check
 * Fetches the user's untriggered price alerts, gets current prices for each
 * distinct symbol, marks triggered alerts, and returns the fired ones.
 *
 * Called by the client on load and on a polling interval.
 * Prices are served from Redis cache (1hr TTL) so this is cheap.
 */

import { NextRequest, NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and } from 'drizzle-orm';
import { priceAlerts } from '@/lib/db/schema';
import { supabaseServer } from '@/lib/supabase/server';
import { cached } from '@/lib/cache/redis';
import { fetchPrices } from '@/lib/data/yahoo';
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

async function getCurrentPrice(symbol: string): Promise<number | null> {
  try {
    const result = await cached(`stock:${symbol}:prices:1y`, 3600, () =>
      fetchPrices(symbol, '1y')
    );
    const prices = result.data;
    if (!prices.length) return null;
    return prices[prices.length - 1].close;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Get all untriggered alerts for this user
    const pending = await withDb((db) =>
      db
        .select()
        .from(priceAlerts)
        .where(and(eq(priceAlerts.userId, userId), eq(priceAlerts.triggered, false)))
    );

    if (pending.length === 0) {
      return NextResponse.json({ triggered: [] });
    }

    // Deduplicate symbols and fetch current prices
    const symbols = [...new Set(pending.map((a) => a.symbol))];
    const prices: Record<string, number | null> = {};
    await Promise.all(
      symbols.map(async (sym) => {
        prices[sym] = await getCurrentPrice(sym);
      })
    );

    // Check which alerts have fired
    const triggered: typeof pending = [];
    const toMarkTriggered: string[] = [];

    for (const alert of pending) {
      const currentPrice = prices[alert.symbol];
      if (currentPrice === null) continue;

      const fired =
        (alert.direction === 'above' && currentPrice >= alert.targetPrice) ||
        (alert.direction === 'below' && currentPrice <= alert.targetPrice);

      if (fired) {
        triggered.push({ ...alert, triggeredAt: new Date() });
        toMarkTriggered.push(alert.id);
      }
    }

    // Mark triggered alerts in DB (best-effort, don't block response)
    if (toMarkTriggered.length > 0) {
      withDb(async (db) => {
        for (const id of toMarkTriggered) {
          await db
            .update(priceAlerts)
            .set({ triggered: true, triggeredAt: new Date() })
            .where(and(eq(priceAlerts.id, id), eq(priceAlerts.userId, userId)));
        }
      }).catch((err) =>
        logger.error({ userId, error: (err as Error).message }, 'Alert trigger update failed')
      );
    }

    logger.info(
      { userId, pending: pending.length, triggered: triggered.length },
      'Alert check complete'
    );

    return NextResponse.json({
      triggered: triggered.map((a) => ({
        id:          a.id,
        symbol:      a.symbol,
        targetPrice: a.targetPrice,
        direction:   a.direction,
        label:       a.label,
        currentPrice: prices[a.symbol],
        triggeredAt: a.triggeredAt,
      })),
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ userId, error: (err as Error).message }, 'Notifications check error');
    return NextResponse.json({ error: 'Check failed' }, { status: 500 });
  }
}
