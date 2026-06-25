import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { sharedTheses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/share/thesis/[token]
 * Public endpoint — no auth required.
 * Returns the shared thesis if not expired.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || !/^[0-9a-f]{16}$/i.test(token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  try {
    const rows = await db
      .select()
      .from(sharedTheses)
      .where(eq(sharedTheses.token, token))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    const shared = rows[0];

    if (new Date(shared.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'This share link has expired' }, { status: 410 });
    }

    const daysLeft = Math.ceil(
      (new Date(shared.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return NextResponse.json({
      symbol: shared.symbol,
      thesis: shared.thesisJson,
      createdAt: shared.createdAt,
      expiresAt: shared.expiresAt,
      daysLeft,
    });
  } catch (err) {
    console.error('Share thesis GET error:', err);
    return NextResponse.json({ error: 'Failed to load shared thesis' }, { status: 500 });
  }
}
