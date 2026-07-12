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

// Shared instance for the API-key validation lookup
const redis = redisAvailable ? makeRedis() : null;

// Per-IP limiters (anonymous / unauthenticated)
const aiLimiter = redisAvailable
  ? new Ratelimit({ redis: makeRedis(), limiter: Ratelimit.slidingWindow(10, '60 s'), prefix: 'rl:ip:ai',  analytics: false })
  : null;

const apiLimiter = redisAvailable
  ? new Ratelimit({ redis: makeRedis(), limiter: Ratelimit.slidingWindow(60, '60 s'), prefix: 'rl:ip:api', analytics: false })
  : null;

// Per-API-key limiters (keyed by keyId, not IP), split by tier + minute/day window
const keyMinuteLimiters = {
  free: redisAvailable ? new Ratelimit({ redis: makeRedis(), limiter: Ratelimit.slidingWindow(10, '60 s'), prefix: 'rl:key:free:min', analytics: false }) : null,
  pro:  redisAvailable ? new Ratelimit({ redis: makeRedis(), limiter: Ratelimit.slidingWindow(60, '60 s'), prefix: 'rl:key:pro:min',  analytics: false }) : null,
};
const keyDayLimiters = {
  free: redisAvailable ? new Ratelimit({ redis: makeRedis(), limiter: Ratelimit.slidingWindow(100, '86400 s'),  prefix: 'rl:key:free:day', analytics: false }) : null,
  pro:  redisAvailable ? new Ratelimit({ redis: makeRedis(), limiter: Ratelimit.slidingWindow(5000, '86400 s'), prefix: 'rl:key:pro:day',  analytics: false }) : null,
};

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

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

  // If an X-API-Key header is present AND validated (cached by a prior Node-route
  // lookup), use per-key rate limits. Unvalidated/unknown keys fall through to IP
  // limits below — this is what closes the "any qe_* header gets its own window" bypass.
  const apiKeyHeader = req.headers.get('x-api-key');
  if (apiKeyHeader && apiKeyHeader.startsWith('qe_')) {
    const hash = await sha256Hex(apiKeyHeader);
    const entry = await redis?.get(`apikey:v1:${hash}`).catch(() => null);
    if (entry && entry !== 'invalid' && typeof entry === 'object') {
      const { keyId, tier } = entry as { keyId: string; tier: 'free' | 'pro' };
      const minuteLimiter = keyMinuteLimiters[tier] ?? keyMinuteLimiters.free;
      const dayLimiter = keyDayLimiters[tier] ?? keyDayLimiters.free;
      if (minuteLimiter) {
        const m = await minuteLimiter.limit(keyId);
        if (!m.success) return rl429(m.limit, m.remaining, m.reset, 'API key rate limit exceeded');
      }
      if (dayLimiter) {
        const d = await dayLimiter.limit(keyId);
        if (!d.success) return rl429(d.limit, d.remaining, d.reset, 'API key daily limit exceeded');
      }
      return NextResponse.next();
    }
    // Unknown / not-yet-validated / revoked key → fall through to IP limits below.
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
