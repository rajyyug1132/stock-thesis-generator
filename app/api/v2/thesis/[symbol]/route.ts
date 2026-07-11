/**
 * GET /api/v2/thesis/:symbol
 *
 * v2 wrapper around the thesis generator with:
 * - Consistent v2 response envelope
 * - API key + JWT auth (anonymous gets 429 from middleware if they exceed IP limit)
 * - Per-tier rate limit headers
 * - Deprecation header pointing new users to v2
 */

import { NextRequest } from 'next/server';
import { normalizeTicker, InvalidTickerError } from '@/lib/utils/tickers';
import { isNifty50 } from '@/lib/data/nifty50';
import { buildContext } from '@/lib/ai/context';
import { generateThesis } from '@/lib/ai/thesis';
import { validateThesis } from '@/lib/ai/validate';
import { cached } from '@/lib/cache/redis';
import { resolveAuth, isAuthError } from '@/lib/api/auth';
import { v2ok, v2err } from '@/lib/api/response';
import logger from '@/lib/utils/logger';

const TIER_LIMITS: Record<string, { rpm: number; rpd: number }> = {
  free:  { rpm: 10, rpd: 100 },
  pro:   { rpm: 60, rpd: 5000 },
  user:  { rpm: 60, rpd: 1000 },
  anon:  { rpm: 5,  rpd: 50   },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: rawSymbol } = await params;

  let symbol: string;
  try {
    symbol = normalizeTicker(rawSymbol);
  } catch (err) {
    if (err instanceof InvalidTickerError) {
      return v2err('BAD_REQUEST', err.message, 400);
    }
    throw err;
  }

  if (!isNifty50(symbol)) {
    return v2err(
      'BAD_REQUEST',
      `${symbol} is not in Nifty 50. Only Nifty 50 stocks are supported in this API.`,
      400
    );
  }

  // Resolve caller identity
  const auth = await resolveAuth(request);
  if (isAuthError(auth)) {
    return v2err('UNAUTHORIZED', auth.error, auth.status);
  }

  const tier = auth.mode === 'apikey' ? auth.tier : auth.mode === 'jwt' ? 'user' : 'anon';
  const limits = TIER_LIMITS[tier] ?? TIER_LIMITS.anon;

  try {
    const result = await cached(
      `thesis:${symbol}:v3`,
      3600,
      async () => {
        const context = await buildContext(symbol);
        const { tokenUsage, ...thesis } = await generateThesis(context);
        const validation = await validateThesis(thesis, context);

        logger.info(
          { symbol, tokenUsage, validationScore: validation.overallScore, tier },
          'v2 Thesis generated'
        );

        return { thesis, validation };
      }
    );

    const headers = {
      'X-RateLimit-Tier': tier,
      'X-RateLimit-Limit-Minute': String(limits.rpm),
      'X-RateLimit-Limit-Day': String(limits.rpd),
      'Deprecation': 'false',  // v2 is current, not deprecated
    };

    return v2ok(
      { thesis: result.data.thesis, validation: result.data.validation },
      { cached: result.cached, stale: result.stale },
      headers
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ symbol, tier, error: msg }, 'v2 Thesis error');

    const isQuota = msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota');
    const isRate  = msg.includes('429') || msg.includes('rate limit');

    if (isQuota || isRate) {
      return v2err(
        'QUOTA_EXHAUSTED',
        'AI quota exhausted. Try again shortly.',
        503
      );
    }

    return v2err('INTERNAL_ERROR', 'Failed to generate thesis', 502);
  }
}

export const revalidate = 3600;
