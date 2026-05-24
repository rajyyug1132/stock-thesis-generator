import { ReactNode } from 'react';
import { SectionLabel } from './section-label';

interface PanelProps {
  label?: string;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}

export function Panel({ label, children, className = '', padded = true }: PanelProps) {
  return (
    <div
      className={`relative border bg-elevated ${className}`}
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      {label && (
        <div
          className="absolute -top-[10px] left-4 px-2"
          style={{ background: 'var(--bg-canvas)' }}
        >
          <SectionLabel>{label}</SectionLabel>
        </div>
      )}
      <div className={padded ? 'p-6' : ''}>{children}</div>
    </div>
  );
}
