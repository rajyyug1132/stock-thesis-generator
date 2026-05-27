/**
 * v2 API response helpers — consistent envelope + rate limit headers.
 */

import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

export interface V2Meta {
  fetchedAt: string;
  cached:    boolean;
  stale?:    boolean;
  requestId: string;
}

export function v2ok<T>(
  data: T,
  meta: Omit<V2Meta, 'fetchedAt' | 'requestId'>,
  rateLimitHeaders?: Record<string, string>
): NextResponse {
  const body = {
    ok:   true,
    data,
    meta: {
      fetchedAt: new Date().toISOString(),
      requestId: `req_${randomBytes(6).toString('hex')}`,
      ...meta,
    },
  };

  const res = NextResponse.json(body);
  res.headers.set('Cache-Control', 's-maxage=3600, stale-while-revalidate=1800');

  if (rateLimitHeaders) {
    for (const [k, v] of Object.entries(rateLimitHeaders)) {
      res.headers.set(k, v);
    }
  }

  return res;
}

export type V2ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'RATE_LIMITED'
  | 'QUOTA_EXHAUSTED'
  | 'INTERNAL_ERROR';

export function v2err(
  code: V2ErrorCode,
  message: string,
  status: number,
  extra?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: { code, message, ...extra },
    },
    { status }
  );
}
