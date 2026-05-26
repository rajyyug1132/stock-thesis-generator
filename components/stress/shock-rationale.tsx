import type { ShockSpec } from '@/lib/stress/types';
import { Panel } from '@/components/ui/panel';
import { SectionLabel } from '@/components/ui/section-label';
import { DataRow } from '@/components/ui/data-row';

interface ShockRationaleProps {
  spec: ShockSpec;
}

const CONFIDENCE_COLORS: Record<ShockSpec['confidence'], string> = {
  high:   'var(--up)',
  medium: 'var(--text-secondary)',
  low:    'var(--rust)',
};

export function ShockRationale({ spec }: ShockRationaleProps) {
  return (
    <Panel label="SCENARIO">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '0.5rem',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.5rem',
            fontStyle: 'italic',
            color: 'var(--text-primary)',
          }}
        >
          {spec.scenarioName}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.12em',
            color: CONFIDENCE_COLORS[spec.confidence],
            border: `1px solid ${CONFIDENCE_COLORS[spec.confidence]}`,
            padding: '2px 8px',
          }}
        >
          {spec.confidence.toUpperCase()} CONFIDENCE
        </span>
      </div>

      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
        {spec.rationale}
      </p>

      {spec.shocks.length > 0 && (
        <div
          style={{
            marginTop: '1rem',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '1rem',
          }}
        >
          <SectionLabel>APPLIED SHOCKS</SectionLabel>
          {spec.shocks.map((s) => {
            const parts = [
              s.initialPriceShock !== undefined &&
                `${(s.initialPriceShock * 100).toFixed(0)}% price`,
              s.driftMultiplier !== undefined &&
                `${s.driftMultiplier.toFixed(1)}× drift`,
              s.volMultiplier !== undefined &&
                `${s.volMultiplier.toFixed(1)}× vol`,
            ].filter(Boolean);
            if (parts.length === 0) return null;
            return (
              <DataRow
                key={s.symbol}
                label={s.symbol.replace(/\.NS$/i, '')}
                value={parts.join(' · ')}
                divider
              />
            );
          })}
        </div>
      )}
    </Panel>
  );
}
