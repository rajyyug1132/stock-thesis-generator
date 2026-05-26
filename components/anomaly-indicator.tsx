'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { TickerUpdate } from '@/lib/stream/mock';
import { ANOMALY_THRESHOLD } from '@/lib/stream/anomalyDetector';

export function AnomalyIndicator({ update }: { update: TickerUpdate | undefined }) {
  if (!update) return null;

  const abs = Math.abs(update.changePct);
  const isAnomaly = abs >= ANOMALY_THRESHOLD;

  // Never apply rust/mint to neutral (flat) updates — neutral stays invisible
  if (!isAnomaly) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={update.timestamp}
        initial={{ opacity: 0, scale: 0.8, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className="font-mono"
        style={{
          fontSize: 9,
          letterSpacing: '0.1em',
          color: update.direction === 'up' ? 'var(--mint)' : 'var(--rust)',
          background: update.direction === 'up' ? 'rgba(168,199,186,0.08)' : 'rgba(212,165,116,0.08)',
          border: `1px solid ${update.direction === 'up' ? 'rgba(168,199,186,0.3)' : 'rgba(212,165,116,0.3)'}`,
          padding: '2px 6px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
        }}
      >
        {update.direction === 'up' ? '▲' : '▼'}
        {(abs * 100).toFixed(3)}%
        <span style={{ color: 'var(--text-quaternary)' }}>/1.8s</span>
      </motion.div>
    </AnimatePresence>
  );
}
