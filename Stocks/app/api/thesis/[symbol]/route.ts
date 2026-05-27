import { NextRequest, NextResponse } from 'next/server';
import { normalizeTicker, InvalidTickerError } from '@/lib/utils/tickers';
import { isNifty50 } from '@/lib/data/nifty50';
import { buildContext } from '@/lib/ai/context';
import { generateThesis } from '@/lib/ai/thesis';
import { validateThesis } from '@/lib/ai/validate';
import { cached } from '@/lib/cache/redis';
import logger from '@/lib/utils/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const startTime = Date.now();
  const { symbol: rawSymbol } = await params;

  let symbol: string;
  try {
    symbol = normalizeTicker(rawSymbol);
  } catch (err) {
    if (err instanceof InvalidTickerError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  // Nifty 50 gate — keep scope tight
  if (!isNifty50(symbol)) {
    return NextResponse.json(
      { error: `${symbol} is not in Nifty 50. Only Nifty 50 stocks supported.` },
      { status: 400 }
    );
  }

  try {
    const result = await cached(
      `thesis:${symbol}:v2`,
      3600, // 1hr TTL
      async () => {
        const context = await buildContext(symbol);
        const { tokenUsage, ...thesis } = await generateThesis(context);
        const validation = await validateThesis(thesis, context);

        logger.info(
          { symbol, tokenUsage, validationScore: validation.overallScore },
          'Thesis generated'
        );

        return {
          thesis,
          validation,
          context: {
            keyMetrics: {
              currentPrice: context.currentPrice,
              peRatio: context.fundamentals.peRatio,
              roe: context.fundamentals.roe,
              debtToEquity: context.fundamentals.debtToEquity,
              annualReturn: context.stats.annualReturn,
              annualVol: context.stats.annualVol,
              sharpe: context.stats.sharpe,
              priceTrend: context.priceTrend,
            },
            prices: context.prices,
            news: context.news,
            tokenUsage,
          },
        };
      }
    );

    const latency = Date.now() - startTime;
    logger.info({ symbol, cached: result.cached, latency }, 'Thesis served');

    const response = NextResponse.json({
      ...result.data,
      meta: {
        fetchedAt: new Date().toISOString(),
        cached: result.cached,
        stale: result.stale,
      },
    });

    response.headers.set(
      'Cache-Control',
      's-maxage=3600, stale-while-revalidate=1800'
    );
    response.headers.set('Vary', 'Accept-Encoding');

    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ symbol, error: msg }, 'Thesis error');

    const isQuota = msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota') || msg.includes('429');
    const isBalance = msg.includes('Insufficient Balance');
    const userMessage = isQuota
      ? 'AI quota exhausted — all Gemini models at daily limit. Resets at midnight PT.'
      : isBalance
      ? 'AI provider balance depleted — top up DeepSeek at platform.deepseek.com.'
      : 'Failed to generate thesis';

    return NextResponse.json({ error: userMessage }, { status: 502 });
  }
}

export const revalidate = 3600;
