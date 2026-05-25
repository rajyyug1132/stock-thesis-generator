import { SectionLabel } from '@/components/ui/section-label';
import { Panel } from '@/components/ui/panel';
import { Pill } from '@/components/ui/pill';
import { DataRow } from '@/components/ui/data-row';
import { DirectionalNum } from '@/components/ui/directional-num';
import { ThesisAbstract } from '@/components/ui/thesis-abstract';
import { GroundedClaim } from '@/components/ui/grounded-claim';
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

async function fetchThesis(symbol: string): Promise<ThesisResponse> {
  try {
    const res = await fetch(`http://localhost:3000/api/thesis/${symbol}`, {
      cache: 'no-store',
    });
    const data = (await res.json()) as ThesisResponse;
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

export default async function StockPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol: rawSymbol } = await params;
  const data = await fetchThesis(rawSymbol.toUpperCase());

  if (data.error || !data.thesis) {
    return (
      <main className="min-h-screen" style={{ background: 'var(--bg-canvas)' }}>
        <div className="max-w-4xl mx-auto px-8 py-16">
          <Panel>
            <SectionLabel>ERROR</SectionLabel>
            <p className="mt-2" style={{ color: 'var(--down)', fontSize: 'var(--text-body)' }}>
              {data.error ?? 'Failed to load thesis'}
            </p>
            <p className="mt-1" style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-small)' }}>
              Gemini quota may be exhausted — resets every 24h on the free tier.
            </p>
          </Panel>
        </div>
      </main>
    );
  }

  const { thesis, validation, context: { keyMetrics, prices = [], news = [] }, meta } = data;
  const score = validation.overallScore;

  // Map validation claims by location prefix for lookup
  const claimsByLocation = new Map(
    validation.claims.map((c) => [c.location, c])
  );

  function getValidation(prefix: string, idx: number) {
    const key = `${prefix}[${idx}]`;
    return claimsByLocation.get(key) ?? null;
  }

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-canvas)' }}>
      <div className="max-w-4xl mx-auto px-8 py-12 space-y-12">

        {/* Header */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <SectionLabel>
              {thesis.symbol.replace('.NS', '')} · NIFTY 50 · {meta.cached ? 'CACHED' : 'FRESH'}
            </SectionLabel>
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
              <PriceChart data={prices} height={220} />
            </div>
          </section>
        )}

        {/* Abstract */}
        <section>
          <ThesisAbstract
            symbol={thesis.symbol}
            generatedAt={thesis.generatedAt}
            groundingScore={score}
            summary={thesis.summary}
          />
        </section>

        {/* Bull / Bear */}
        <section className="grid md:grid-cols-2 gap-6">
          {/* Bull case */}
          <Panel label={`BULL CASE · ${thesis.bullCase.points.length} POINTS`}>
            <p
              className="font-serif italic mb-4"
              style={{ fontSize: 'var(--text-body)', color: 'var(--up)', lineHeight: 1.5 }}
            >
              {thesis.bullCase.headline}
            </p>
            <ul className="space-y-4">
              {thesis.bullCase.points.map((pt, i) => {
                const v = getValidation('bullCase.points', i);
                return (
                  <GroundedClaim
                    key={i}
                    citationN={i + 1}
                    claim={pt.claim}
                    evidence={pt.evidence}
                    verified={v?.verified ?? false}
                    verificationReason={v?.reason ?? 'Not validated'}
                  />
                );
              })}
            </ul>
          </Panel>

          {/* Bear case */}
          <Panel label={`BEAR CASE · ${thesis.bearCase.points.length} POINTS`}>
            <p
              className="font-serif italic mb-4"
              style={{ fontSize: 'var(--text-body)', color: 'var(--down)', lineHeight: 1.5 }}
            >
              {thesis.bearCase.headline}
            </p>
            <ul className="space-y-4">
              {thesis.bearCase.points.map((pt, i) => {
                const v = getValidation('bearCase.points', i);
                return (
                  <GroundedClaim
                    key={i}
                    citationN={thesis.bullCase.points.length + i + 1}
                    claim={pt.claim}
                    evidence={pt.evidence}
                    verified={v?.verified ?? false}
                    verificationReason={v?.reason ?? 'Not validated'}
                  />
                );
              })}
            </ul>
          </Panel>
        </section>

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

      </div>
    </main>
  );
}
