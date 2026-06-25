import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { sharedTheses } from '@/lib/db/schema';
import { safeJson } from '@/lib/utils/security';
import { randomBytes } from 'crypto';

// Rate limit: 10 shares per minute per IP
const rateMap = new Map<string, { count: number; reset: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || entry.reset < now) {
    rateMap.set(ip, { count: 1, reset: now + 60_000 });
    return false;
  }
  if (entry.count >= 10) return true;
  entry.count++;
  return false;
}

/**
 * POST /api/share/thesis
 * Body: { symbol: string, thesis: object }
 * Returns: { token: string, url: string, expiresAt: string }
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const body = await safeJson<{ symbol?: unknown; thesis?: unknown }>(req);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { symbol, thesis } = body;

  if (typeof symbol !== 'string' || !symbol.trim()) {
    return NextResponse.json({ error: 'symbol is required' }, { status: 400 });
  }
  if (!thesis || typeof thesis !== 'object') {
    return NextResponse.json({ error: 'thesis object is required' }, { status: 400 });
  }

  const token = randomBytes(8).toString('hex'); // 16-char hex
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days

  try {
    await db.insert(sharedTheses).values({
      token,
      symbol: symbol.trim().toUpperCase(),
      thesisJson: thesis as Record<string, unknown>,
      expiresAt,
    });

    const baseUrl = req.headers.get('x-forwarded-proto') === 'https'
      ? `https://${req.headers.get('host')}`
      : `http://${req.headers.get('host')}`;

    return NextResponse.json({
      token,
      url: `${baseUrl}/share/${token}`,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error('Share thesis error:', err);
    return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 });
  }
}
