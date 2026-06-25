import { NextRequest, NextResponse } from 'next/server';
import { buildPortfolio } from '@/lib/ai/build-portfolio';
import { safeJson } from '@/lib/utils/security';
import logger from '@/lib/utils/logger';

// Rate limit: 5 requests per minute per IP
const rateMap = new Map<string, { count: number; reset: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || entry.reset < now) {
    rateMap.set(ip, { count: 1, reset: now + 60_000 });
    return false;
  }
  if (entry.count >= 5) return true;
  entry.count++;
  return false;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Rate limit: 5 build-portfolio requests per minute' }, { status: 429 });
  }

  const body = await safeJson<{ prompt?: unknown }>(req);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { prompt } = body;
  if (typeof prompt !== 'string' || prompt.trim().length < 5) {
    return NextResponse.json({ error: 'prompt must be a string of at least 5 characters' }, { status: 400 });
  }
  if (prompt.length > 500) {
    return NextResponse.json({ error: 'prompt must be under 500 characters' }, { status: 400 });
  }

  try {
    const result = await buildPortfolio(prompt.trim());
    return NextResponse.json(result);
  } catch (err) {
    logger.error({ prompt, error: (err as Error).message }, 'Build portfolio error');
    return NextResponse.json(
      { error: 'Failed to build portfolio. Try rephrasing your goal.' },
      { status: 500 }
    );
  }
}
