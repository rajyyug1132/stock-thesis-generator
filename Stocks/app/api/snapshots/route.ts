import { NextRequest, NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, desc } from 'drizzle-orm';
import { simulationSnapshots } from '@/lib/db/schema';
import { supabaseServer } from '@/lib/supabase/server';

function getDb() {
  const conn = postgres(process.env.DATABASE_URL!, { max: 1 });
  return drizzle(conn);
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
    const db = getDb();
    const snapshots = await db
      .select()
      .from(simulationSnapshots)
      .where(eq(simulationSnapshots.userId, userId))
      .orderBy(desc(simulationSnapshots.createdAt));

    return NextResponse.json({ snapshots });
  } catch (err) {
    console.error('[snapshots GET]', err);
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

    if (!name || !symbols?.length || !weights?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = getDb();
    const [snapshot] = await db
      .insert(simulationSnapshots)
      .values({ userId, name, symbols, weights, horizonDays, computedMetrics })
      .returning();

    return NextResponse.json({ snapshot }, { status: 201 });
  } catch (err) {
    console.error('[snapshots POST]', err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
