import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Only initialize rate limiter when Redis is available
const redisAvailable = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

function makeRedis() {
  return new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

// Per-IP limiters (anonymous / unauthenticated)
const aiLimiter = redisAvailable
  ? new Ratelimit({ redis: makeRedis(), limiter: Ratelimit.slidingWindow(10, '60 s'), prefix: 'rl:ip:ai',  analytics: false })
  : null;

const apiLimiter = redisAvailable
  ? new Ratelimit({ redis: makeRedis(), limiter: Ratelimit.slidingWindow(60, '60 s'), prefix: 'rl:ip:api', analytics: false })
  : null;

// Per-API-key limiters (keyed by keyId, not IP)
const keyAiLimiter = redisAvailable
  ? new Ratelimit({ redis: makeRedis(), limiter: Ratelimit.slidingWindow(10, '60 s'), prefix: 'rl:key:ai',  analytics: false })
  : null;

const keyApiLimiter = redisAvailable
  ? new Ratelimit({ redis: makeRedis(), limiter: Ratelimit.slidingWindow(60, '60 s'), prefix: 'rl:key:api', analytics: false })
  : null;

/** Routes that call AI providers — tighter rate limit */
const AI_ROUTES = ['/api/thesis/', '/api/stress', '/api/v2/thesis/'];

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

function rl429(limit: number, remaining: number, reset: number, message: string): NextResponse {
  return NextResponse.json(
    { ok: false, error: { code: 'RATE_LIMITED', message, retryAfter: Math.ceil((reset - Date.now()) / 1000) } },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit':     String(limit),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset':     String(reset),
        'Retry-After':           String(Math.ceil((reset - Date.now()) / 1000)),
      },
    }
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith('/api/')) return NextResponse.next();
  if (!redisAvailable)              return NextResponse.next();

  const isAiRoute = AI_ROUTES.some((r) => pathname.startsWith(r));

  // If an X-API-Key header is present, use per-key rate limits (higher allowance)
  const apiKeyHeader = req.headers.get('x-api-key');
  if (apiKeyHeader && apiKeyHeader.startsWith('qe_')) {
    // Use first 32 chars as the rate-limit identifier (avoids storing full hash in memory)
    const keyId = apiKeyHeader.slice(0, 32);
    const limiter = isAiRoute ? keyAiLimiter : keyApiLimiter;
    if (limiter) {
      const { success, limit, remaining, reset } = await limiter.limit(keyId);
      if (!success) {
        return rl429(limit, remaining, reset, 'API key rate limit exceeded');
      }
    }
    return NextResponse.next();
  }

  // Fallback to IP-based limits
  const ip = getIp(req);
  const limiter = isAiRoute ? aiLimiter : apiLimiter;
  if (limiter) {
    const { success, limit, remaining, reset } = await limiter.limit(ip);
    if (!success) {
      const msg = isAiRoute
        ? 'Rate limit exceeded — max 10 AI requests per minute per IP'
        : 'Rate limit exceeded — max 60 requests per minute per IP';
      return rl429(limit, remaining, reset, msg);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
