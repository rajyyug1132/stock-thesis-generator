/**
 * v2 API auth resolver — called by API route handlers to authenticate a request.
 * Supports three modes (checked in order):
 *   1. X-API-Key header  → hash lookup in DB → per-key rate limits
 *   2. Authorization: Bearer <JWT>  → Supabase verify → per-user rate limits
 *   3. Unauthenticated  → anonymous IP limits (handled in middleware)
 */

import { randomBytes } from 'crypto';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and } from 'drizzle-orm';
import { apiKeys } from '@/lib/db/schema';
import { supabaseServer } from '@/lib/supabase/server';
import { readKeyCache, writeKeyCache, writeNegativeKeyCache } from '@/lib/api/key-cache';
import { hashKey } from '@/lib/api/hash';
import type { NextRequest } from 'next/server';

export { hashKey };

export type AuthResult =
  | { mode: 'apikey'; keyId: string; userId: string; tier: 'free' | 'pro' }
  | { mode: 'jwt';    userId: string; tier: 'user' }
  | { mode: 'anon' };

export type AuthError = { error: string; status: number };

/** Resolve auth from an incoming API request. Never throws — returns result or error. */
export async function resolveAuth(
  request: NextRequest
): Promise<AuthResult | AuthError> {
  // 1. API key
  const apiKeyHeader = request.headers.get('x-api-key');
  if (apiKeyHeader) {
    const result = await resolveApiKey(apiKeyHeader);
    return result;
  }

  // 2. JWT bearer
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const supabase = supabaseServer();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return { error: 'Invalid or expired token', status: 401 };
    }
    return { mode: 'jwt', userId: user.id, tier: 'user' };
  }

  // 3. Anonymous
  return { mode: 'anon' };
}

async function resolveApiKey(raw: string): Promise<AuthResult | AuthError> {
  if (!raw.startsWith('qe_')) {
    return { error: 'Invalid API key format', status: 401 };
  }

  const hash = hashKey(raw);

  const cached = await readKeyCache(hash);
  if (cached === 'invalid') {
    return { error: 'API key not found or revoked', status: 401 };
  }
  if (cached) {
    return { mode: 'apikey', ...cached };
  }

  const conn = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(conn);
  try {
    const [key] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.keyHash, hash), eq(apiKeys.revoked, false)))
      .limit(1);

    if (!key) {
      await writeNegativeKeyCache(hash);
      return { error: 'API key not found or revoked', status: 401 };
    }

    // Update last_used_at asynchronously (best-effort, don't block response)
    db.update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, key.id))
      .catch(() => {});

    await writeKeyCache(hash, { keyId: key.id, userId: key.userId, tier: key.tier });
    return { mode: 'apikey', keyId: key.id, userId: key.userId, tier: key.tier };
  } finally {
    await conn.end();
  }
}

/** Generate a new API key: returns { raw, hash, prefix } */
export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const secret = randomBytes(24).toString('hex'); // 48 hex chars
  const raw    = `qe_live_${secret}`;
  const hash   = hashKey(raw);
  const prefix = raw.slice(0, 15); // "qe_live_" + first 7 chars
  return { raw, hash, prefix };
}

export function isAuthError(r: AuthResult | AuthError): r is AuthError {
  return 'error' in r;
}
