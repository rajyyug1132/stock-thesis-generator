import { RiskMetrics } from '@/lib/sim/types';
import { Citation } from './citation';
import { DirectionalNum } from './directional-num';

interface RiskMetricsGridProps {
  metrics: RiskMetrics;
}

interface CellDef {
  key: keyof RiskMetrics;
  label: string;
  citationN: number;
  citationTone: 'grounded' | 'unverified';
  citationReason: string;
  render: (v: number) => React.ReactNode;
}

const CELLS: CellDef[] = [
  {
    key: 'expectedReturn',
    label: 'Exp. Return',
    citationN: 1,
    citationTone: 'grounded',
    citationReason: 'Expected return: probability-weighted average of simulated final portfolio values minus 1, annualized over horizon.',
    render: (v) => <DirectionalNum value={v} format="pct" decimals={2} showTriangle />,
  },
  {
    key: 'annualizedReturn',
    label: 'Ann. Return',
    citationN: 2,
    citationTone: 'grounded',
    citationReason: 'Annualized return: expectedReturn scaled to 252 trading days. Geometric compounding from median final value.',
    render: (v) => <DirectionalNum value={v} format="pct" decimals={2} showTriangle />,
  },
  {
    key: 'annualizedVol',
    label: 'Ann. Vol',
    citationN: 3,
    citationTone: 'grounded',
    citationReason: 'Annualized volatility: standard deviation of log-returns across simulation paths, scaled by √252. Input covariance drives this directly.',
    render: (v) => (
      <span className="num" style={{ color: 'var(--text-primary)' }}>
        {(v * 100).toFixed(2)}%
      </span>
    ),
  },
  {
    key: 'sharpe',
    label: 'Sharpe',
    citationN: 4,
    citationTone: 'grounded',
    citationReason: 'Sharpe ratio: (annualizedReturn − 7%) / annualizedVol. Risk-free rate = RBI 10Y G-Sec proxy (7.0%).',
    render: (v) => (
      <span
        className="num"
        style={{ color: v >= 1 ? 'var(--up)' : v < 0 ? 'var(--down)' : 'var(--text-primary)' }}
      >
        {v.toFixed(2)}
      </span>
    ),
  },
  {
    key: 'var95',
    label: 'VaR 95%',
    citationN: 5,
    citationTone: 'grounded',
    citationReason: 'Value at Risk at 95% confidence: the 5th percentile of final portfolio values minus 1. Historical simulation method via Monte Carlo paths.',
    render: (v) => <DirectionalNum value={v} format="pct" decimals={2} showSign showTriangle />,
  },
  {
    key: 'cvar95',
    label: 'CVaR 95%',
    citationN: 6,
    citationTone: 'grounded',
    citationReason: 'Conditional VaR (Expected Shortfall) at 95%: mean of all losses worse than VaR95. Better tail-risk measure than VaR alone.',
    render: (v) => <DirectionalNum value={v} format="pct" decimals={2} showSign showTriangle />,
  },
  {
    key: 'probLoss',
    label: 'P(Loss)',
    citationN: 7,
    citationTone: 'grounded',
    citationReason: 'Probability of loss: fraction of simulation paths ending below initial portfolio value (final value < 1.0).',
    render: (v) => (
      <span
        className="num"
        style={{ color: v > 0.4 ? 'var(--down)' : v < 0.2 ? 'var(--up)' : 'var(--text-primary)' }}
      >
        {(v * 100).toFixed(1)}%
      </span>
    ),
  },
  {
    key: 'maxDrawdown',
    label: 'Max Drawdown',
    citationN: 8,
    citationTone: 'grounded',
    citationReason: 'Maximum drawdown: largest peak-to-trough decline on the median (p50) path. Indicates worst expected intra-period loss.',
    render: (v) => <DirectionalNum value={v} format="pct" decimals={2} showSign showTriangle />,
  },
];

/**
 * Bloomberg-style 8-cell risk metrics grid.
 * Each cell shows label + citation tooltip + formatted value.
 */
export function RiskMetricsGrid({ metrics }: RiskMetricsGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-px" style={{ background: 'var(--border-subtle)' }}>
      {CELLS.map((cell) => {
        const value = metrics[cell.key];
        return (
          <div
            key={cell.key}
            className="flex flex-col gap-1 px-4 py-3"
            style={{ background: 'var(--bg-card)' }}
          >
            <div
              className="flex items-center gap-0.5"
              style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-micro)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}
            >
              {cell.label.toUpperCase()}
              <Citation n={cell.citationN} tone={cell.citationTone} reason={cell.citationReason} />
            </div>
            <div style={{ fontSize: 'var(--text-h3)', lineHeight: 1.1 }}>
              {cell.render(value)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
