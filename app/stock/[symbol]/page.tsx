import { MetricPill } from '@/components/metric-pill';
import { ThesisCard } from '@/components/thesis-card';
import { PriceChart, type PricePoint } from '@/components/price-chart';
import { NewsList, type NewsItem } from '@/components/news-list';
import type { Thesis, ValidationResult } from '@/lib/ai/schemas';

interface KeyMetrics {
  currentPrice: number;
  peRatio: number | null;
  roe: number | null;
  debtToEquity: number | null;
  annualReturn: number;
  annualVol: number;
  sharpe: number;
  priceTrend: { high1Y: number; low1Y: number; pctFromHigh: number; pctFromLow: number };
}

interface ThesisResponse {
  thesis: Thesis;
  validation: ValidationResult;
  context: {
    keyMetrics: KeyMetrics;
    prices?: PricePoint[];
    news?: NewsItem[];
  };
  meta: { cached: boolean };
  error?: string;
}

function fmt(n: number | null, decimals = 2, suffix = ''): string {
  if (n === null) return '—';
  return n.toFixed(decimals) + suffix;
}

function fmtPct(n: number | null): string {
  if (n === null) return '—';
  const sign = n >= 0 ? '+' : '';
  return sign + (n * 100).toFixed(1) + '%';
}

async function fetchThesis(symbol: string): Promise<ThesisResponse> {
  try {
    const res = await fetch(`http://localhost:3000/api/thesis/${symbol}`, {
      cache: 'no-store',
    });
    const data = await res.json() as ThesisResponse;
    if (!res.ok) {
      return {
        ...data,
        thesis: undefined as unknown as Thesis,
        validation: undefined as unknown as ValidationResult,
        context: { keyMetrics: {} as KeyMetrics },
      };
    }
    return data;
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Failed to load thesis');
  }
}

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-blue-100 text-blue-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

const IMPACT_ICONS: Record<string, string> = {
  positive: '↑',
  negative: '↓',
  mixed: '↕',
};

export default async function StockPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol: rawSymbol } = await params;
  const data = await fetchThesis(rawSymbol.toUpperCase());

  if (data.error || !data.thesis) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="text-red-700 font-medium">Failed to load thesis</p>
          <p className="text-red-500 text-sm mt-1">{data.error ?? 'Unknown error'}</p>
        </div>
      </main>
    );
  }

  const { thesis, validation, context: { keyMetrics, prices = [], news = [] }, meta } = data;
  const score = validation.overallScore;
  const scorePct = Math.round(score * 100);
  const scoreColor = score >= 0.8 ? 'text-green-600' : score >= 0.5 ? 'text-yellow-600' : 'text-red-600';

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{thesis.symbol}</h1>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                Nifty 50
              </span>
            </div>
            <p className="text-gray-500 text-sm">
              ₹{keyMetrics.currentPrice.toFixed(2)} &nbsp;·&nbsp;
              <span className={keyMetrics.annualReturn >= 0 ? 'text-green-600' : 'text-red-500'}>
                {fmtPct(keyMetrics.annualReturn)} 1Y return
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">
              {meta.cached ? '⚡ Cached' : '🔄 Fresh'} · Generated {new Date(thesis.generatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricPill label="P/E" value={fmt(keyMetrics.peRatio)} />
          <MetricPill label="ROE" value={fmtPct(keyMetrics.roe)} highlight={keyMetrics.roe !== null && keyMetrics.roe > 0.12 ? 'positive' : 'neutral'} />
          <MetricPill label="D/E" value={fmt(keyMetrics.debtToEquity)} highlight={keyMetrics.debtToEquity !== null && keyMetrics.debtToEquity > 1 ? 'negative' : 'neutral'} />
          <MetricPill label="Annual Vol" value={fmtPct(keyMetrics.annualVol)} />
          <MetricPill label="Sharpe" value={fmt(keyMetrics.sharpe)} highlight={keyMetrics.sharpe > 0.5 ? 'positive' : keyMetrics.sharpe < 0 ? 'negative' : 'neutral'} />
          <MetricPill label="1Y High" value={`₹${keyMetrics.priceTrend.high1Y.toFixed(0)}`} subtitle={fmtPct(keyMetrics.priceTrend.pctFromHigh) + ' from high'} />
        </div>

        {/* Price chart */}
        {prices.length > 1 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">1-Year Price</p>
            <PriceChart data={prices} height={280} />
          </div>
        )}

        {/* Summary */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Summary</p>
          <p className="text-gray-800 leading-relaxed">{thesis.summary}</p>
        </div>

        {/* Bull / Bear */}
        <div className="grid md:grid-cols-2 gap-4">
          <ThesisCard
            variant="bull"
            headline={thesis.bullCase.headline}
            points={thesis.bullCase.points}
            claims={validation.claims}
            locationPrefix="bullCase.points"
          />
          <ThesisCard
            variant="bear"
            headline={thesis.bearCase.headline}
            points={thesis.bearCase.points}
            claims={validation.claims}
            locationPrefix="bearCase.points"
          />
        </div>

        {/* Risks */}
        {thesis.risks.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Risks</p>
            <ul className="space-y-2">
              {thesis.risks.map((r, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[r.severity] ?? 'bg-gray-100 text-gray-600'}`}>
                    {r.severity}
                  </span>
                  <span className="text-gray-700">{r.risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Catalysts */}
        {thesis.catalysts.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Catalysts</p>
            <ul className="space-y-3">
              {thesis.catalysts.map((c, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className={`mt-0.5 text-base ${c.impact === 'positive' ? 'text-green-500' : c.impact === 'negative' ? 'text-red-500' : 'text-gray-400'}`}>
                    {IMPACT_ICONS[c.impact]}
                  </span>
                  <div>
                    <p className="font-medium text-gray-800">{c.event}</p>
                    <p className="text-xs text-gray-400">{c.timeframe}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recent News */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Recent News</p>
          <NewsList items={news} />
        </div>

        {/* Grounding score */}
        <div className="flex items-center justify-between rounded-lg bg-gray-100 px-5 py-3 text-sm">
          <span className="text-gray-600">Overall grounding score</span>
          <span className={`font-semibold ${scoreColor}`}>{scorePct}% verified</span>
        </div>

      </div>
    </main>
  );
}
