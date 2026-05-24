import { redirect } from 'next/navigation';
import { SymbolPicker } from '@/components/symbol-picker';
import { ComparisonTable } from '@/components/comparison-table';
import { CorrelationHeatmap } from '@/components/correlation-heatmap';
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

async function fetchCompare(symbols: string[]): Promise<CompareResponse> {
  const syms = symbols.join(',');
  const res = await fetch(`http://localhost:3000/api/compare?symbols=${syms}`, {
    cache: 'no-store',
  });
  return res.json() as Promise<CompareResponse>;
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

  // No symbols — show just picker
  if (!symbolsParam || symbolsParam.trim() === '') {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-16 space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Compare Stocks</h1>
            <p className="text-gray-500 text-sm mt-1">Select 2–5 Nifty 50 stocks to compare.</p>
          </div>
          <SymbolPicker />
        </div>
      </main>
    );
  }

  const raw = symbolsParam.split(',').map((s) => s.trim()).filter(Boolean);

  // 1 symbol → redirect to stock page
  if (raw.length === 1) {
    redirect(`/stock/${raw[0].toUpperCase()}`);
  }

  // >5 → trim to 5
  const capped = raw.slice(0, 5);

  // Normalize (add .NS suffix for API)
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
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-16 space-y-8">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <p className="text-red-700 font-medium">Invalid symbols</p>
            <p className="text-red-500 text-sm mt-1">
              Could not parse: {invalidSymbols.join(', ')}. Need at least 2 valid Nifty 50 tickers.
            </p>
          </div>
          <SymbolPicker />
        </div>
      </main>
    );
  }

  const data = await fetchCompare(normalized);

  if (data.error) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-16 space-y-8">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <p className="text-red-700 font-medium">Failed to load comparison</p>
            <p className="text-red-500 text-sm mt-1">{data.error}</p>
          </div>
          <SymbolPicker initialSymbols={normalized} />
        </div>
      </main>
    );
  }

  // Current price = last value in aligned closes
  const currentPrices: Record<string, number> = {};
  for (const sym of data.symbols) {
    const arr = data.aligned.closes[sym];
    currentPrices[sym] = arr?.length > 0 ? arr[arr.length - 1] : 0;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Comparing {data.symbols.length} stocks
            </h1>
            <div className="flex flex-wrap gap-2 mt-2">
              {data.symbols.map((sym) => (
                <span
                  key={sym}
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                >
                  {shortLabel(sym)} · {getName(sym) ?? sym}
                </span>
              ))}
            </div>
          </div>
          {/* Re-pick */}
          <a
            href="/compare"
            className="text-sm text-blue-600 hover:underline self-start"
          >
            ← Change selection
          </a>
        </div>

        {/* Comparison table */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Metrics</p>
          <ComparisonTable
            symbols={data.symbols}
            stats={data.stats}
            fundamentals={data.fundamentals}
            closes={data.aligned.closes}
            currentPrices={currentPrices}
          />
        </div>

        {/* Correlation heatmap */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Correlation</p>
          <p className="text-xs text-gray-400 mb-4">1-year daily log-returns, aligned on common trading days</p>
          <CorrelationHeatmap
            symbols={data.correlation.symbols}
            matrix={data.correlation.matrix}
          />
        </div>

        {/* Day 5 placeholder */}
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-400">
          Portfolio simulation coming Day 5.
        </div>

        {/* Symbol picker to change selection */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Adjust Selection</p>
          <SymbolPicker initialSymbols={normalized} />
        </div>

      </div>
    </main>
  );
}
