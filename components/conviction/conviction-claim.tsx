'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { ValidationClaim } from '@/lib/ai/schemas';

export function ConvictionClaim({
  point,
  validation,
  side,
  convictionOpacity,
  isExpanded,
  onClaimClick,
}: {
  point: { claim: string; evidence: string };
  validation?: ValidationClaim;
  side: 'bull' | 'bear';
  convictionOpacity: number;
  isExpanded: boolean;
  onClaimClick?: (claim: ValidationClaim) => void;
}) {
  const accentColor = side === 'bull' ? 'var(--mint)' : 'var(--rust)';

  return (
    <motion.div
      layout
      animate={{ opacity: convictionOpacity }}
      transition={{
        opacity: { duration: 0.25 },
        layout: { type: 'spring', stiffness: 250, damping: 35 },
      }}
      style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '0.875rem 0',
        cursor: validation ? 'pointer' : 'default',
      }}
      onClick={() => validation && onClaimClick?.(validation)}
    >
      {/* Claim text */}
      <motion.div
        animate={{ fontSize: isExpanded ? '0.9375rem' : '0.8125rem' }}
        style={{ lineHeight: 1.6, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}
        transition={{ duration: 0.3 }}
      >
        {point.claim}
        {validation && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            marginLeft: 8,
            fontFamily: 'var(--font-mono)',
            fontSize: 8,
            letterSpacing: '0.1em',
            color: validation.verified ? 'var(--mint)' : 'var(--rust)',
            border: `1px solid ${validation.verified ? 'rgba(168,199,186,0.3)' : 'rgba(212,165,116,0.3)'}`,
            padding: '1px 5px',
            verticalAlign: 'middle',
          }}>
            {validation.verified ? '✓ VERIFIED' : '⚠ UNVERIFIED'}
          </span>
        )}
      </motion.div>

      {/* Evidence — only visible when this side is expanded */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div
              className="font-mono"
              style={{
                fontSize: 9, letterSpacing: '0.08em',
                color: 'var(--text-tertiary)',
                marginTop: '0.5rem',
                lineHeight: 1.6,
                paddingLeft: '0.75rem',
                borderLeft: `2px solid ${accentColor}`,
                paddingTop: '0.125rem',
                paddingBottom: '0.125rem',
              }}
            >
              EV · {point.evidence}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
