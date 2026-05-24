import { ReactNode } from 'react';

type Variant = 'default' | 'up' | 'down' | 'accent';

const VARIANT_STYLES: Record<Variant, { color: string; borderColor: string; bg: string }> = {
  default: {
    color: 'var(--text-secondary)',
    borderColor: 'var(--border-subtle)',
    bg: 'transparent',
  },
  up: {
    color: 'var(--up)',
    borderColor: 'var(--up)',
    bg: 'var(--up-soft)',
  },
  down: {
    color: 'var(--down)',
    borderColor: 'var(--down)',
    bg: 'var(--down-soft)',
  },
  accent: {
    color: 'var(--accent)',
    borderColor: 'var(--accent)',
    bg: 'transparent',
  },
};

interface PillProps {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}

export function Pill({ variant = 'default', children, className = '' }: PillProps) {
  const s = VARIANT_STYLES[variant];
  return (
    <span
      className={`inline-flex items-center font-mono uppercase border px-2 py-0.5 ${className}`}
      style={{
        color: s.color,
        borderColor: s.borderColor,
        backgroundColor: s.bg,
        fontSize: 'var(--text-micro)',
        letterSpacing: '0.1em',
        lineHeight: 1.4,
      }}
    >
      {children}
    </span>
  );
}
