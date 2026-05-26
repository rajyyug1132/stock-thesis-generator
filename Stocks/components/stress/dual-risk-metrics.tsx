import React from 'react';
import type { RiskMetrics } from '@/lib/sim/types';

interface DualRiskMetricsProps {
  base: RiskMetrics;
  shock: RiskMetrics | null;
}

type MetricKey = keyof RiskMetrics;

interface CellDef {
  key: MetricKey;
  label: string;
  format: (v: number) => string;
  deltaPositiveIsBetter: boolean;
}

const CELLS: CellDef[] = [
  { key: 'expectedReturn',  label: 'Exp. Return',   format: (v) => `${(v * 100).toFixed(2)}%`,  deltaPositiveIsBetter: true },
  { key: 'annualizedReturn',label: 'Ann. Return',   format: (v) => `${(v * 100).toFixed(2)}%`,  deltaPositiveIsBetter: true },
  { key: 'annualizedVol',   label: 'Ann. Vol',      format: (v) => `${(v * 100).toFixed(2)}%`,  deltaPositiveIsBetter: false },
  { key: 'sharpe',          label: 'Sharpe',        format: (v) => v.toFixed(2),                 deltaPositiveIsBetter: true },
  { key: 'var95',           label: 'VaR 95%',       format: (v) => `${(v * 100).toFixed(2)}%`,  deltaPositiveIsBetter: true },
  { key: 'cvar95',          label: 'CVaR 95%',      format: (v) => `${(v * 100).toFixed(2)}%`,  deltaPositiveIsBetter: true },
  { key: 'probLoss',        label: 'P(Loss)',        format: (v) => `${(v * 100).toFixed(1)}%`,  deltaPositiveIsBetter: false },
  { key: 'maxDrawdown',     label: 'Max Drawdown',  format: (v) => `${(v * 100).toFixed(2)}%`,  deltaPositiveIsBetter: true },
];

export function DualRiskMetrics({ base, shock }: DualRiskMetricsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--border-subtle)' }}>
      {/* Headers */}
      <div
        style={{
          background: 'var(--bg-card)',
          padding: '8px 16px',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.14em',
          color: 'var(--mint)',
        }}
      >
        BASE CASE
      </div>
      <div
        style={{
          background: 'var(--bg-card)',
          padding: '8px 16px',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.14em',
          color: shock ? 'var(--rust)' : 'var(--text-quaternary)',
        }}
      >
        {shock ? 'SHOCK CASE' : 'SHOCK CASE (PENDING)'}
      </div>

      {CELLS.map((cell) => {
        const bv = base[cell.key];
        const sv = shock ? shock[cell.key] : null;
        const delta = sv !== null ? sv - bv : null;
        const deltaGood =
          delta === null
            ? null
            : cell.deltaPositiveIsBetter
            ? delta > 0
            : delta < 0;

        return (
          <React.Fragment key={cell.key}>
            {/* Base cell */}
            <div
              style={{
                background: 'var(--bg-card)',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  color: 'var(--text-tertiary)',
                }}
              >
                {cell.label.toUpperCase()}
              </span>
              <span
                className="num"
                style={{ fontSize: 'var(--text-h3)', lineHeight: 1.1, color: 'var(--text-primary)' }}
              >
                {cell.format(bv)}
              </span>
            </div>

            {/* Shock cell */}
            <div
              style={{
                background: 'var(--bg-card)',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  color: 'var(--text-tertiary)',
                }}
              >
                {cell.label.toUpperCase()}
              </span>
              {sv !== null ? (
                <>
                  <span
                    className="num"
                    style={{ fontSize: 'var(--text-h3)', lineHeight: 1.1, color: 'var(--rust)' }}
                  >
                    {cell.format(sv)}
                  </span>
                  {delta !== null && (
                    <span
                      className="num"
                      style={{
                        fontSize: 10,
                        color: deltaGood ? 'var(--up)' : 'var(--down)',
                        opacity: 0.8,
                      }}
                    >
                      {delta >= 0 ? '+' : ''}{cell.format(delta)}
                    </span>
                  )}
                </>
              ) : (
                <span style={{ color: 'var(--text-quaternary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  —
                </span>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
