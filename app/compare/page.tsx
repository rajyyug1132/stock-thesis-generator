import { redirect } from 'next/navigation';
import { SectionLabel } from '@/components/ui/section-label';
import { Panel } from '@/components/ui/panel';
import { Pill } from '@/components/ui/pill';
import { getBaseUrl } from '@/lib/utils';
import { SymbolPicker } from '@/components/symbol-picker';
import { ComparisonTable } from '@/components/comparison-table';
import { CorrelationHeatmap } from '@/components/correlation-heatmap';
import { PortfolioSimulator } from '@/components/portfolio-simulator';
import { normalizeTicker } from '@/lib/utils/tickers';
import { getName } from '@/lib/data/nifty50';

interface CompareResponse {
  symbols: string[];
  aligned: {
    dates: string[];
    closes: Record<string, number[]>;
  };
  stats: Record<string, { annualReturn: number; annualVol: number; sharpe: number }>;
  correlation: { symbols: string[]; matrix: number[][] };
  fundamentals: Record<string, {
    peRatio: number | null;
    pbRatio: number | null;
    roe: number | null;
    debtToEquity: number | null;
    marketCap: number | null;
  }>;
  error?: string;
}

interface CovResponse {
  symbols: string[];
  initialPrices: number[];
  dailyMeans: number[];
  covariance: number[][];
  error?: string;
}

async function fetchCompare(symbols: string[]): Promise<CompareResponse> {
  const syms = symbols.join(',');
  const baseUrl = getBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/compare?symbols=${syms}`, {
      cache: 'no-store',
    });
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      return {
        symbols,
        aligned: { dates: [], closes: {} },
        stats: {},
        correlation: { symbols, matrix: [] },
        fundamentals: {},
        error: `Compare service unavailable (HTTP ${res.status})`,
      };
    }
    const data = await res.json() as CompareResponse;
    return data;
  } catch (err) {
    return {
      symbols,
      aligned: { dates: [], closes: {} },
      stats: {},
      correlation: { symbols, matrix: [] },
      fundamentals: {},
      error: err instanceof Error ? err.message : 'Failed to load compare data',
    };
  }
}

async function fetchCovariance(symbols: string[]): Promise<CovResponse | null> {
  try {
    const syms = symbols.join(',');
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/api/covariance?symbols=${syms}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json() as Promise<CovResponse>;
  } catch {
    return null;
  }
}

function shortLabel(sym: string): string {
  return sym.replace('.NS', '').replace('.BO', '');
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ symbols?: string }>;
}) {
  const { symbols: symbolsParam } = await searchParams;

  // No symbols — show picker
  if (!symbolsParam || symbolsParam.trim() === '') {
    return (
      <main className="min-h-screen" style={{ background: 'var(--bg-canvas)' }}>
        <div className="max-w-3xl mx-auto px-8 py-16 space-y-8">
          <div>
            <SectionLabel>PORTFOLIO · COMPARE</SectionLabel>
            <h1
              className="font-serif mt-2"
              style={{ fontSize: 'var(--text-h1)', color: 'var(--text-primary)', lineHeight: 1.1 }}
            >
              Compare Stocks
            </h1>
            <p className="mt-3 max-w-prose" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-body)' }}>
              Select 2–5 Nifty 50 stocks to compare fundamentals, returns, correlation, and run a Monte Carlo portfolio simulation.
            </p>
          </div>
          <SymbolPicker />
        </div>
      </main>
    );
  }

  const raw = symbolsParam.split(',').map((s) => s.trim()).filter(Boolean);

  if (raw.length === 1) {
    redirect(`/stock/${raw[0].toUpperCase()}`);
  }

  const capped = raw.slice(0, 5);

  const normalized: string[] = [];
  const invalidSymbols: string[] = [];
  for (const sym of capped) {
    try {
      normalized.push(normalizeTicker(sym));
    } catch {
      invalidSymbols.push(sym);
    }
  }

  if (normalized.length < 2) {
    return (
      <main className="min-h-screen" style={{ background: 'var(--bg-canvas)' }}>
        <div className="max-w-3xl mx-auto px-8 py-16 space-y-8">
          <Panel>
            <SectionLabel>ERROR · INVALID SYMBOLS</SectionLabel>
            <p className="mt-2" style={{ color: 'var(--down)', fontSize: 'var(--text-body)' }}>
              Could not parse: {invalidSymbols.join(', ')}. Need at least 2 valid Nifty 50 tickers.
            </p>
          </Panel>
          <SymbolPicker />
        </div>
      </main>
    );
  }

  const [data, covData] = await Promise.all([
    fetchCompare(normalized),
    normalized.length >= 2 ? fetchCovariance(normalized) : Promise.resolve(null),
  ]);

  if (data.error) {
    return (
      <main className="min-h-screen" style={{ background: 'var(--bg-canvas)' }}>
        <div className="max-w-3xl mx-auto px-8 py-16 space-y-8">
          <Panel>
            <SectionLabel>ERROR</SectionLabel>
            <p className="mt-2" style={{ color: 'var(--down)', fontSize: 'var(--text-body)' }}>
              {data.error}
            </p>
          </Panel>
          <SymbolPicker initialSymbols={normalized} />
        </div>
      </main>
    );
  }

  const currentPrices: Record<string, number> = {};
  for (const sym of data.symbols) {
    const arr = data.aligned.closes[sym];
    currentPrices[sym] = arr?.length > 0 ? arr[arr.length - 1] : 0;
  }

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-canvas)' }}>
      <div className="max-w-5xl mx-auto px-8 py-12 space-y-14">

        {/* Header */}
        <div className="space-y-3">
          <SectionLabel>PORTFOLIO · COMPARING {data.symbols.length} STOCKS</SectionLabel>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <h1
              className="font-serif"
              style={{ fontSize: 'var(--text-h1)', color: 'var(--text-primary)', lineHeight: 1.05 }}
            >
              {data.symbols.map((s) => shortLabel(s)).join(' · ')}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.symbols.map((sym) => (
              <Pill key={sym}>{getName(sym) ?? shortLabel(sym)}</Pill>
            ))}
            <a
              href="/compare"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-micro)',
                color: 'var(--text-tertiary)',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
                letterSpacing: '0.06em',
                alignSelf: 'center',
              }}
            >
              ← CHANGE
            </a>
          </div>
        </div>

        {/* Comparison table */}
        <section className="space-y-3">
          <SectionLabel>METRICS</SectionLabel>
          <ComparisonTable
            symbols={data.symbols}
            stats={data.stats}
            fundamentals={data.fundamentals}
            closes={data.aligned.closes}
            currentPrices={currentPrices}
          />
        </section>

        {/* Correlation heatmap */}
        <section className="space-y-3">
          <SectionLabel>CORRELATION · 1Y DAILY LOG-RETURNS</SectionLabel>
          <Panel>
            <CorrelationHeatmap
              symbols={data.correlation.symbols}
              matrix={data.correlation.matrix}
            />
          </Panel>
        </section>

        {/* Portfolio simulator */}
        <section className="space-y-3">
          <SectionLabel>PORTFOLIO SIMULATION · CORRELATED GBM</SectionLabel>
          {covData && !covData.error ? (
            <Panel label="SIMULATOR">
              <PortfolioSimulator
                symbols={covData.symbols}
                initialPrices={covData.initialPrices}
                dailyMeans={covData.dailyMeans}
                covariance={covData.covariance}
              />
            </Panel>
          ) : (
            <Panel>
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-small)',
                  color: 'var(--text-tertiary)',
                }}
              >
                Covariance data unavailable — simulation requires price history for all selected symbols.
              </p>
            </Panel>
          )}
        </section>

        {/* Symbol picker */}
        <section className="space-y-3">
          <SectionLabel>ADJUST SELECTION</SectionLabel>
          <Panel>
            <SymbolPicker initialSymbols={normalized} />
          </Panel>
        </section>

      </div>
    </main>
  );
}
