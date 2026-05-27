import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Only initialize rate limiter when Redis is available
const redisAvailable = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

// AI-backed endpoints — expensive per call (Gemini/DeepSeek/Groq quota + $)
// 10 req/min per IP is generous for a user but prevents abuse/scraping
const aiLimiter = redisAvailable
  ? new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      }),
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      prefix: 'rl:ai',
      analytics: false,
    })
  : null;

// General API rate limit — 60 req/min per IP
const apiLimiter = redisAvailable
  ? new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      }),
      limiter: Ratelimit.slidingWindow(60, '60 s'),
      prefix: 'rl:api',
      analytics: false,
    })
  : null;

/** Routes that call AI providers — tighter rate limit */
const AI_ROUTES = ['/api/thesis/', '/api/stress'];

function getIp(req: NextRequest): string {
  // Vercel sets x-forwarded-for; fall back to 'unknown'
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only run on /api routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const ip = getIp(req);

  // If Redis is unavailable (local dev, missing env), skip rate limiting
  if (!redisAvailable) {
    return NextResponse.next();
  }

  // Apply tighter AI rate limit
  const isAiRoute = AI_ROUTES.some((r) => pathname.startsWith(r));
  if (isAiRoute && aiLimiter) {
    const { success, limit, remaining, reset } = await aiLimiter.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded — max 10 AI requests per minute per IP' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': String(remaining),
            'X-RateLimit-Reset': String(reset),
            'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
          },
        }
      );
    }
  }

  // Apply general API rate limit to all other API routes
  if (!isAiRoute && apiLimiter) {
    const { success, limit, remaining, reset } = await apiLimiter.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded — max 60 requests per minute per IP' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': String(remaining),
            'X-RateLimit-Reset': String(reset),
            'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
          },
        }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
