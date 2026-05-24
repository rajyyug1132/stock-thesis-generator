import { ReactNode } from 'react';

interface DataRowProps {
  label: ReactNode;
  value: ReactNode;
  unit?: string;
  divider?: boolean;
}

export function DataRow({ label, value, unit, divider = true }: DataRowProps) {
  return (
    <div
      className={`flex items-baseline justify-between py-2 gap-4 ${divider ? 'divider-dotted' : ''}`}
    >
      <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-small)' }}>
        {label}
      </span>
      <span className="num" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-body)' }}>
        {value}
        {unit && (
          <span
            className="ml-1"
            style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-small)' }}
          >
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}
