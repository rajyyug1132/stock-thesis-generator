import { Redis } from '@upstash/redis';

// Verify Redis credentials in .env. Check Upstash dashboard for cache keys:
// stock:{symbol}:prices:1y (1hr TTL), stock:{symbol}:fundamentals (24hr TTL)
const REDIS_AVAILABLE = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

let warnedMissing = false;
if (!REDIS_AVAILABLE && !warnedMissing) {
  console.warn('[cache] Redis env vars missing; running in no-cache mode');
  warnedMissing = true;
}

const redis = REDIS_AVAILABLE
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

export interface CacheResult<T> {
  data: T;
  cached: boolean;
  stale: boolean;
  cacheError?: boolean;
}

export async function cached<T>(
  key: string,
  ttlSec: number,
  fetcher: () => Promise<T>
): Promise<CacheResult<T>> {
  // No-cache mode: just call fetcher
  if (!redis) {
    const data = await fetcher();
    return { data, cached: false, stale: false, cacheError: true };
  }

  // Try to get from cache
  let cacheReadFailed = false;
  try {
    const hit = await redis.get(key);
    if (hit) {
      return {
        data: hit as T,
        cached: true,
        stale: false,
      };
    }
  } catch (err) {
    cacheReadFailed = true;
    console.warn('[cache] read failed', key, err);
  }

  // Cache miss or error; fetch fresh data
  try {
    const freshData = await fetcher();

    // Store in cache (best-effort)
    try {
      await redis.setex(key, ttlSec, JSON.stringify(freshData));
    } catch (cacheErr) {
      console.warn('[cache] write failed', key, cacheErr);
    }

    return {
      data: freshData,
      cached: false,
      stale: false,
      cacheError: cacheReadFailed,
    };
  } catch (fetchErr) {
    // Fetcher failed; check if we have stale cache
    try {
      const staleData = await redis.get(key);
      if (staleData) {
        return {
          data: staleData as T,
          cached: true,
          stale: true,
        };
      }
    } catch {
      // Ignore cache retrieval errors
    }

    // No cache and fetch failed; throw
    throw fetchErr;
  }
}
