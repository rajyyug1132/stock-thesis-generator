import Link from 'next/link';
import { SectionLabel } from '@/components/ui/section-label';
import { Panel } from '@/components/ui/panel';
import { Pill } from '@/components/ui/pill';
import { DataRow } from '@/components/ui/data-row';
import { DirectionalNum } from '@/components/ui/directional-num';
import { ThesisAbstract } from '@/components/ui/thesis-abstract';
import { StockPageClient } from './stock-page-client';
import { AnnotatedPriceChart } from '@/components/annotated-price-chart';
import type { PricePoint } from '@/components/price-chart';
import { NewsList, type NewsItem } from '@/components/news-list';
import { EvidenceSection } from '@/components/evidence-section';
import type { Evidence } from '@/lib/data/filings';
import type { Thesis, ValidationResult } from '@/lib/ai/schemas';
import { getBaseUrl } from '@/lib/utils';
import { Suspense } from 'react';
import { ThesisLoading } from '@/components/thesis-loading';

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
    evidence?: Evidence | null;
  };
  meta: { cached: boolean };
  error?: string;
}

async function fetchThesis(symbol: string): Promise<ThesisResponse> {
  try {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/api/thesis/${symbol}`);

    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return {
        thesis: undefined as unknown as Thesis,
        validation: undefined as unknown as ValidationResult,
        context: { keyMetrics: {} as KeyMetrics },
        meta: { cached: false },
        error: `Thesis engine error (HTTP ${res.status}). Try refreshing.`,
      };
    }

    const data = (await res.json()) as ThesisResponse;
    if (!res.ok) {
      return {
        ...data,
        thesis: undefined as unknown as Thesis,
        validation: undefined as unknown as ValidationResult,
        context: { keyMetrics: {} as KeyMetrics },
        meta: { cached: false },
      };
    }
    return data;
  } catch (err) {
    return {
      thesis: undefined as unknown as Thesis,
      validation: undefined as unknown as ValidationResult,
      context: { keyMetrics: {} as KeyMetrics },
      meta: { cached: false },
      error: err instanceof Error ? err.message : 'Failed to load thesis',
    };
  }
}

// ISR: page cached at edge, revalidated hourly
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();
  return {
    title: `${sym} — AI Thesis`,
    description: `AI-grounded investment thesis for ${sym}: bull case, bear case, risks and catalysts — every numeric claim verified against live market data.`,
  };
}

// Pre-render top 6 at build time — no cold start for featured stocks
export async function generateStaticParams() {
  return ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'TATAMOTORS', 'ICICIBANK'].map(
    (symbol) => ({ symbol })
  );
}

const SEVERITY_VARIANT: Record<string, 'up' | 'down' | 'accent' | undefined> = {
  low: undefined,
  medium: 'accent',
  high: 'down',
};

const IMPACT_ICONS: Record<string, string> = {
  positive: '▲',
  negative: '▼',
  mixed: '·',
};

const IMPACT_COLORS: Record<string, string> = {
  positive: 'var(--up)',
  negative: 'var(--down)',
  mixed: 'var(--text-tertiary)',
};

async function ThesisSection({ symbol }: { symbol: string }) {
  const data = await fetchThesis(symbol.toUpperCase());

  if (data.error || !data.thesis) {
    return (
      <Panel>
        <SectionLabel>ERROR</SectionLabel>
        <p className="mt-2" style={{ color: 'var(--down)', fontSize: 'var(--text-body)' }}>
          {data.error ?? 'Failed to load thesis'}
        </p>
      </Panel>
    );
  }

  const { thesis, validation, context: { keyMetrics, prices = [], news = [], evidence }, meta } = data;
  const score = validation.overallScore;

  return (
    <div className="space-y-12">

      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <SectionLabel>
            {thesis.symbol.replace('.NS', '')} · NIFTY 50 · {meta.cached ? 'CACHED' : 'FRESH'}
          </SectionLabel>
          <Pill variant={score >= 0.8 ? 'up' : score >= 0.5 ? 'accent' : 'down'}>
            {Math.round(score * 100)}% VERIFIED
          </Pill>
        </div>
        <div className="flex flex-wrap items-baseline gap-4">
          <h1
            className="font-serif"
            style={{ fontSize: 'var(--text-h1)', color: 'var(--text-primary)', lineHeight: 1.05 }}
          >
            {thesis.symbol.replace('.NS', '')}
          </h1>
          <div className="flex items-baseline gap-3">
            <span className="num" style={{ fontSize: 'var(--text-h2)', color: 'var(--text-primary)' }}>
              ₹{keyMetrics.currentPrice.toFixed(2)}
            </span>
            <DirectionalNum
              value={keyMetrics.annualReturn}
              format="pct"
              decimals={1}
              showTriangle
              showSign
              className=""
            />
            <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-small)' }}>1Y</span>
          </div>
        </div>
      </div>

      {/* Abstract — the product leads; everything else supports it */}
      <section>
        <ThesisAbstract
          symbol={thesis.symbol}
          generatedAt={thesis.generatedAt}
          groundingScore={score}
          summary={thesis.summary}
        />
      </section>

      {/* Fundamentals */}
      <section>
        <SectionLabel>FUNDAMENTALS</SectionLabel>
        <div className="mt-3 max-w-sm">
          <DataRow
            label="P/E Ratio"
            value={keyMetrics.peRatio !== null ? keyMetrics.peRatio.toFixed(1) : '—'}
          />
          <DataRow
            label="ROE"
            value={keyMetrics.roe !== null ? (keyMetrics.roe * 100).toFixed(1) + '%' : '—'}
          />
          <DataRow
            label="Debt / Equity"
            value={keyMetrics.debtToEquity !== null ? keyMetrics.debtToEquity.toFixed(2) : '—'}
          />
          <DataRow label="Annual Volatility" value={(keyMetrics.annualVol * 100).toFixed(1) + '%'} />
          <DataRow
            label="Sharpe"
            value={
              <DirectionalNum
                value={keyMetrics.sharpe}
                format="num"
                decimals={2}
                showSign
                showTriangle
              />
            }
          />
          <DataRow
            label="1Y High"
            value={`₹${keyMetrics.priceTrend.high1Y.toFixed(0)}`}
            divider={false}
          />
        </div>
      </section>

      {/* Price chart */}
      {prices.length > 1 && (
        <section>
          <SectionLabel>1-YEAR PRICE</SectionLabel>
          <div
            className="mt-3"
            style={{
              border: '1px solid var(--border-subtle)',
              padding: '1rem',
              background: 'var(--bg-card)',
            }}
          >
            <AnnotatedPriceChart data={prices} symbol={thesis.symbol.replace('.NS', '')} height={260} />
          </div>
        </section>
      )}

      {/* Bull / Bear — client island with Evidence Drawer */}
      <StockPageClient
        thesis={thesis}
        validation={validation}
        bullCount={thesis.bullCase.points.length}
      />

      {/* Risks */}
      {thesis.risks.length > 0 && (
        <section>
          <SectionLabel>RISKS · {thesis.risks.length}</SectionLabel>
          <div className="mt-3 space-y-2">
            {thesis.risks.map((r, i) => (
              <div key={i} className="flex items-center gap-3">
                <Pill variant={SEVERITY_VARIANT[r.severity]}>
                  {r.severity.toUpperCase()}
                </Pill>
                <span style={{ color: 'var(--text-primary)', fontSize: 'var(--text-body)' }}>
                  {r.risk}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Catalysts */}
      {thesis.catalysts.length > 0 && (
        <section>
          <SectionLabel>CATALYSTS · {thesis.catalysts.length}</SectionLabel>
          <div className="mt-3 max-w-lg">
            {thesis.catalysts.map((c, i) => (
              <DataRow
                key={i}
                label={
                  <span className="flex items-center gap-2">
                    <span style={{ color: IMPACT_COLORS[c.impact] }}>
                      {IMPACT_ICONS[c.impact]}
                    </span>
                    {c.event}
                  </span>
                }
                value={c.timeframe}
                divider={i < thesis.catalysts.length - 1}
              />
            ))}
          </div>
        </section>
      )}

      {/* Filing evidence (StockRAG) */}
      {evidence && <EvidenceSection evidence={evidence} />}

      {/* News */}
      {news.length > 0 && (
        <section>
          <SectionLabel>RECENT NEWS · {news.length}</SectionLabel>
          <Panel className="mt-3">
            <NewsList items={news} />
          </Panel>
        </section>
      )}

      {/* Grounding score footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-micro)',
            color: 'var(--text-tertiary)',
            letterSpacing: '0.08em',
          }}
        >
          GROUNDING SCORE
        </span>
        <span
          className="num"
          style={{
            fontSize: 'var(--text-body)',
            color: score >= 0.8 ? 'var(--up)' : score >= 0.5 ? 'var(--unverified)' : 'var(--down)',
          }}
        >
          {Math.round(score * 100)}% verified
        </span>
      </footer>

      {/* Compare CTA */}
      <div style={{ paddingTop: '2rem' }}>
        <Link
          href={`/compare?symbols=${thesis.symbol.replace('.NS', '')}`}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.08em',
            color: 'var(--accent)',
            textDecoration: 'none',
          }}
        >
          COMPARE WITH ANOTHER STOCK →
        </Link>
      </div>

    </div>
  );
}

export default async function StockPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-canvas)' }}>
      <div className="max-w-4xl mx-auto px-8 py-12">
        <Suspense fallback={<ThesisLoading />}>
          <ThesisSection symbol={symbol} />
        </Suspense>
      </div>
    </main>
  );
}
