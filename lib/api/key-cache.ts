/**
 * Validated-API-key Redis cache. Node routes (via resolveAuth) write entries after a
 * DB lookup; the Edge middleware reads them to apply per-key rate limits without ever
 * touching Postgres. No in-memory fallback: middleware (Edge) and routes (Node) run in
 * separate isolates in prod, so a process-local map wouldn't bridge them anyway — if
 * Redis is absent, every helper here is a no-op, matching the middleware's existing
 * no-op-without-Redis behavior.
 */
import { Redis } from '@upstash/redis';

export interface CachedKeyEntry {
  keyId: string; // api_keys.id (UUID)
  userId: string;
  tier: 'free' | 'pro';
}

export const KEY_CACHE_TTL_SEC = 300; // 5 min, per docs/v2-api-plan.md
export const KEY_NEGATIVE_TTL_SEC = 60; // unknown-key negative cache
const INVALID = 'invalid';

export function keyCacheKey(keyHash: string): string {
  return `apikey:v1:${keyHash}`;
}

const redisAvailable = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);
const redis = redisAvailable
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

/** Returns a CachedKeyEntry, the string "invalid" (negative cache), or null (no entry). */
export async function readKeyCache(keyHash: string): Promise<CachedKeyEntry | 'invalid' | null> {
  if (!redis) return null;
  try {
    return (await redis.get(keyCacheKey(keyHash))) as CachedKeyEntry | 'invalid' | null;
  } catch {
    return null;
  }
}

export async function writeKeyCache(keyHash: string, entry: CachedKeyEntry): Promise<void> {
  if (!redis) return;
  try {
    await redis.setex(keyCacheKey(keyHash), KEY_CACHE_TTL_SEC, JSON.stringify(entry));
  } catch {
    // best-effort
  }
}

export async function writeNegativeKeyCache(keyHash: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.setex(keyCacheKey(keyHash), KEY_NEGATIVE_TTL_SEC, INVALID);
  } catch {
    // best-effort
  }
}

export async function deleteKeyCache(keyHash: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(keyCacheKey(keyHash));
  } catch {
    // best-effort
  }
}
