'use client';

import { SectionLabel } from './section-label';

interface ErrorCardProps {
  /** Human-readable failure message. */
  message: string;
  /** Optional retry handler — renders a "TRY AGAIN" button when provided. */
  onRetry?: () => void;
  /** Section label above the message. Defaults to "ERROR". */
  label?: string;
}

export function ErrorCard({ message, onRetry, label = 'ERROR' }: ErrorCardProps) {
  return (
    <div
      className="border bg-card"
      style={{ borderColor: 'var(--down)', padding: '1.25rem 1.5rem' }}
    >
      <SectionLabel style={{ color: 'var(--down)' }}>{label}</SectionLabel>
      <p
        className="mt-2"
        style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-body)', lineHeight: 1.5 }}
      >
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: '1rem',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.15em',
            padding: '6px 16px',
            background: 'transparent',
            border: '1px solid var(--down)',
            color: 'var(--down)',
            cursor: 'pointer',
          }}
        >
          TRY AGAIN
        </button>
      )}
    </div>
  );
}
