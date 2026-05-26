'use client';

import { motion } from 'framer-motion';

export function ShadowCaseBanner({
  type,
  points,
}: {
  type: 'bear' | 'bull';
  points: { claim: string }[];
}) {
  const isBear = type === 'bear';
  const color = isBear ? 'var(--rust)' : 'var(--mint)';
  const label = isBear ? 'SHADOW BEAR CASE' : 'SHADOW BULL CASE';
  const warning = isBear
    ? 'High bull conviction. Do not ignore the downside.'
    : 'High bear conviction. Do not ignore the upside.';

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{
        border: `1px solid ${isBear ? 'rgba(212,165,116,0.4)' : 'rgba(168,199,186,0.4)'}`,
        background: isBear ? 'rgba(212,165,116,0.04)' : 'rgba(168,199,186,0.04)',
        padding: '1rem 1.25rem',
        marginTop: '1rem',
      }}
    >
      <div
        className="font-mono"
        style={{ fontSize: 9, letterSpacing: '0.2em', color, marginBottom: '0.5rem' }}
      >
        ⚠ {label}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: '0.75rem', fontStyle: 'italic' }}>
        {warning}
      </div>
      {points.slice(0, 2).map((p, i) => (
        <div
          key={i}
          style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            borderTop: '1px solid var(--border-subtle)',
            padding: '0.375rem 0',
            lineHeight: 1.6,
          }}
        >
          {p.claim}
        </div>
      ))}
    </motion.div>
  );
}
