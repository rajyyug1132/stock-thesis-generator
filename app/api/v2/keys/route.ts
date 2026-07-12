/**
 * POST   /api/v2/keys  — create a new API key (requires JWT auth)
 * GET    /api/v2/keys  — list user's keys (prefix only, never raw key)
 * DELETE /api/v2/keys?id=<uuid> — revoke a key
 */

import { NextRequest, NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and } from 'drizzle-orm';
import { apiKeys } from '@/lib/db/schema';
import { supabaseServer } from '@/lib/supabase/server';
import { generateApiKey } from '@/lib/api/auth';
import { deleteKeyCache } from '@/lib/api/key-cache';
import { v2ok, v2err } from '@/lib/api/response';
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

async function requireJwtUser(request: NextRequest): Promise<{ userId: string } | NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return v2err('UNAUTHORIZED', 'Bearer token required to manage API keys', 401);
  }
  const token = authHeader.slice(7);
  const supabase = supabaseServer();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return v2err('UNAUTHORIZED', 'Invalid or expired token', 401);
  }
  return { userId: user.id };
}

/* GET — list keys */
export async function GET(request: NextRequest) {
  const auth = await requireJwtUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const keys = await withDb((db) =>
      db.select({
        id:         apiKeys.id,
        name:       apiKeys.name,
        keyPrefix:  apiKeys.keyPrefix,
        tier:       apiKeys.tier,
        revoked:    apiKeys.revoked,
        lastUsedAt: apiKeys.lastUsedAt,
        createdAt:  apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.userId, auth.userId))
    );

    return v2ok({ keys }, { cached: false });
  } catch (err) {
    logger.error({ userId: auth.userId, error: (err as Error).message }, 'API keys GET error');
    return v2err('INTERNAL_ERROR', 'Failed to list keys', 500);
  }
}

/* POST — create key */
export async function POST(request: NextRequest) {
  const auth = await requireJwtUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { name } = body as { name?: string };

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return v2err('BAD_REQUEST', 'name is required', 400);
    }
    if (name.length > 60) {
      return v2err('BAD_REQUEST', 'name must be under 60 characters', 400);
    }

    // Max 10 keys per user
    const existing = await withDb((db) =>
      db.select({ id: apiKeys.id })
        .from(apiKeys)
        .where(and(eq(apiKeys.userId, auth.userId), eq(apiKeys.revoked, false)))
    );
    if (existing.length >= 10) {
      return v2err('FORBIDDEN', 'Maximum 10 active API keys per user', 403);
    }

    const { raw, hash, prefix } = generateApiKey();

    const [created] = await withDb((db) =>
      db.insert(apiKeys).values({
        userId:    auth.userId,
        keyHash:   hash,
        keyPrefix: prefix,
        name:      name.trim(),
        tier:      'free',
      }).returning()
    );

    logger.info({ userId: auth.userId, keyId: created.id }, 'API key created');

    // Return raw key ONCE — it will never be shown again
    return v2ok(
      {
        id:         created.id,
        name:       created.name,
        key:        raw,           // ← shown once only
        keyPrefix:  created.keyPrefix,
        tier:       created.tier,
        createdAt:  created.createdAt,
      },
      { cached: false }
    );
  } catch (err) {
    logger.error({ userId: auth.userId, error: (err as Error).message }, 'API key POST error');
    return v2err('INTERNAL_ERROR', 'Failed to create key', 500);
  }
}

/* DELETE — revoke key */
export async function DELETE(request: NextRequest) {
  const auth = await requireJwtUser(request);
  if (auth instanceof NextResponse) return auth;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return v2err('BAD_REQUEST', 'id query param required', 400);

  try {
    const [row] = await withDb((db) =>
      db.update(apiKeys)
        .set({ revoked: true })
        .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, auth.userId)))
        .returning({ keyHash: apiKeys.keyHash })
    );
    if (row) await deleteKeyCache(row.keyHash).catch(() => {});

    logger.info({ userId: auth.userId, keyId: id }, 'API key revoked');
    return v2ok({ revoked: true, id }, { cached: false });
  } catch (err) {
    logger.error({ userId: auth.userId, error: (err as Error).message }, 'API key DELETE error');
    return v2err('INTERNAL_ERROR', 'Failed to revoke key', 500);
  }
}
