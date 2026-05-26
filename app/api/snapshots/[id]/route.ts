import { NextRequest, NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and } from 'drizzle-orm';
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

/* DELETE /api/snapshots/[id] — delete a snapshot */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const db = getDb();
    await db
      .delete(simulationSnapshots)
      .where(and(
        eq(simulationSnapshots.id, id),
        eq(simulationSnapshots.userId, userId),
      ));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[snapshots DELETE]', err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
