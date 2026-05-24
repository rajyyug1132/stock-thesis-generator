import { ReactNode } from 'react';

export function SectionLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`font-mono uppercase text-tertiary ${className}`}
      style={{
        fontSize: 'var(--text-micro)',
        letterSpacing: '0.15em',
      }}
    >
      {children}
    </div>
  );
}
