import { NextRequest, NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, desc } from 'drizzle-orm';
import { simulationSnapshots } from '@/lib/db/schema';
import { supabaseServer } from '@/lib/supabase/server';
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

/* GET /api/snapshots — list user's snapshots */
export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const snapshots = await withDb((db) =>
      db
        .select()
        .from(simulationSnapshots)
        .where(eq(simulationSnapshots.userId, userId))
        .orderBy(desc(simulationSnapshots.createdAt))
    );

    return NextResponse.json({ snapshots });
  } catch (err) {
    logger.error({ userId, error: (err as Error).message }, 'Snapshots GET error');
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

/* POST /api/snapshots — save a snapshot */
export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { name, symbols, weights, horizonDays, computedMetrics } = body;

    if (!name || typeof name !== 'string' || name.length > 100) {
      return NextResponse.json({ error: 'name must be a string under 100 characters' }, { status: 400 });
    }
    if (!symbols?.length || !weights?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!Array.isArray(symbols) || symbols.length > 50) {
      return NextResponse.json({ error: 'symbols must be an array of max 50 items' }, { status: 400 });
    }

    const [snapshot] = await withDb((db) =>
      db
        .insert(simulationSnapshots)
        .values({ userId, name, symbols, weights, horizonDays, computedMetrics })
        .returning()
    );

    return NextResponse.json({ snapshot }, { status: 201 });
  } catch (err) {
    logger.error({ userId, error: (err as Error).message }, 'Snapshots POST error');
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
