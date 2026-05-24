import { Sparkline } from '@/components/sparkline';

interface StockStats {
  annualReturn: number;
  annualVol: number;
  sharpe: number;
}

interface StockFundamentals {
  peRatio: number | null;
  pbRatio: number | null;
  roe: number | null;
  debtToEquity: number | null;
  marketCap: number | null;
}

interface ComparisonTableProps {
  symbols: string[];
  stats: Record<string, StockStats>;
  fundamentals: Record<string, StockFundamentals>;
  closes: Record<string, number[]>;
  currentPrices: Record<string, number>;
}

function fmt(n: number | null, decimals = 2): string {
  if (n === null || isNaN(n)) return '—';
  return n.toFixed(decimals);
}

function fmtPct(n: number | null): string {
  if (n === null || isNaN(n)) return '—';
  const sign = n >= 0 ? '+' : '';
  return sign + (n * 100).toFixed(1) + '%';
}

function fmtCap(n: number | null): string {
  if (n === null) return '—';
  if (n >= 1e12) return `₹${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `₹${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(0)}Cr`;
  return `₹${n.toFixed(0)}`;
}

function shortLabel(sym: string): string {
  return sym.replace('.NS', '').replace('.BO', '');
}

// Highlight rules:
// Higher is better: 1Y Return, Sharpe, ROE
// Lower is better: Volatility, Debt/Equity
// No highlight: P/E, P/B, Market Cap (directional "better" is ambiguous)
type Direction = 'higher' | 'lower' | 'none';

function bestWorst(
  symbols: string[],
  getValue: (sym: string) => number | null,
  direction: Direction
): { best: string | null; worst: string | null } {
  if (direction === 'none') return { best: null, worst: null };

  let best: string | null = null;
  let worst: string | null = null;
  let bestVal = direction === 'higher' ? -Infinity : Infinity;
  let worstVal = direction === 'higher' ? Infinity : -Infinity;

  for (const sym of symbols) {
    const v = getValue(sym);
    if (v === null || isNaN(v)) continue;
    if (direction === 'higher') {
      if (v > bestVal) { bestVal = v; best = sym; }
      if (v < worstVal) { worstVal = v; worst = sym; }
    } else {
      if (v < bestVal) { bestVal = v; best = sym; }
      if (v > worstVal) { worstVal = v; worst = sym; }
    }
  }
  return { best, worst };
}

function cellClass(sym: string, best: string | null, worst: string | null): string {
  if (sym === best) return 'text-green-700 font-semibold';
  if (sym === worst) return 'text-red-600';
  return 'text-gray-800';
}

export function ComparisonTable({
  symbols,
  stats,
  fundamentals,
  closes,
  currentPrices,
}: ComparisonTableProps) {
  const rows: Array<{
    label: string;
    direction: Direction;
    getValue: (sym: string) => number | null;
    format: (sym: string) => string;
    sparkline?: (sym: string) => number[];
  }> = [
    {
      label: 'Current Price',
      direction: 'none',
      getValue: (sym) => currentPrices[sym] ?? null,
      format: (sym) => {
        const v = currentPrices[sym];
        return v != null ? `₹${v.toFixed(2)}` : '—';
      },
      sparkline: (sym) => closes[sym] ?? [],
    },
    {
      label: '1Y Return',
      direction: 'higher',
      getValue: (sym) => stats[sym]?.annualReturn ?? null,
      format: (sym) => fmtPct(stats[sym]?.annualReturn ?? null),
    },
    {
      label: '1Y Volatility',
      direction: 'lower',
      getValue: (sym) => stats[sym]?.annualVol ?? null,
      format: (sym) => fmtPct(stats[sym]?.annualVol ?? null),
    },
    {
      label: 'Sharpe',
      direction: 'higher',
      getValue: (sym) => stats[sym]?.sharpe ?? null,
      format: (sym) => fmt(stats[sym]?.sharpe ?? null),
    },
    {
      label: 'P/E',
      direction: 'none',
      getValue: (sym) => fundamentals[sym]?.peRatio ?? null,
      format: (sym) => fmt(fundamentals[sym]?.peRatio ?? null, 1),
    },
    {
      label: 'P/B',
      direction: 'none',
      getValue: (sym) => fundamentals[sym]?.pbRatio ?? null,
      format: (sym) => fmt(fundamentals[sym]?.pbRatio ?? null, 1),
    },
    {
      label: 'ROE',
      direction: 'higher',
      getValue: (sym) => fundamentals[sym]?.roe ?? null,
      format: (sym) => fmtPct(fundamentals[sym]?.roe ?? null),
    },
    {
      label: 'Debt/Equity',
      direction: 'lower',
      getValue: (sym) => fundamentals[sym]?.debtToEquity ?? null,
      format: (sym) => fmt(fundamentals[sym]?.debtToEquity ?? null),
    },
    {
      label: 'Market Cap',
      direction: 'none',
      getValue: (sym) => fundamentals[sym]?.marketCap ?? null,
      format: (sym) => fmtCap(fundamentals[sym]?.marketCap ?? null),
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wide w-32">
              Metric
            </th>
            {symbols.map((sym) => (
              <th
                key={sym}
                className="text-center py-2 px-3 text-xs font-semibold text-gray-700 min-w-[100px]"
              >
                {shortLabel(sym)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const { best, worst } = bestWorst(symbols, row.getValue, row.direction);
            return (
              <tr key={row.label} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-3 pr-4 text-xs text-gray-500 font-medium whitespace-nowrap">
                  {row.label}
                </td>
                {symbols.map((sym) => (
                  <td key={sym} className={`py-3 px-3 text-center ${cellClass(sym, best, worst)}`}>
                    <span className="block tabular-nums">{row.format(sym)}</span>
                    {row.sparkline && (
                      <span className="flex justify-center mt-1">
                        <Sparkline data={row.sparkline(sym)} width={64} height={16} />
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
