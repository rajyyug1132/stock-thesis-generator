'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function ThesisLoading() {
  const [elapsed, setElapsed] = useState(0);
  const ESTIMATED = 8;   // seconds

  useEffect(() => {
    const id = setInterval(() => setElapsed(e => Math.min(e + 0.1, ESTIMATED)), 100);
    return () => clearInterval(id);
  }, []);

  const progress = elapsed / ESTIMATED;
  const remaining = Math.max(0, Math.ceil(ESTIMATED - elapsed));

  return (
    <div style={{ padding: '2rem 0' }}>

      {/* Status */}
      <div className="font-mono" style={{
        fontSize: 9, letterSpacing: '0.22em',
        color: 'var(--mint)', marginBottom: '1rem',
      }}>
        NVIDIA · REASONING
      </div>

      {/* Progress bar */}
      <div style={{
        width: '100%', height: 1,
        background: 'var(--border-subtle)',
        marginBottom: '0.5rem',
        position: 'relative',
      }}>
        <motion.div
          style={{
            position: 'absolute', top: 0, left: 0, height: '100%',
            background: 'var(--mint)',
          }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ ease: 'linear', duration: 0.1 }}
        />
      </div>

      {/* Time estimate */}
      <div className="font-mono" style={{
        fontSize: 9, color: 'var(--text-quaternary)',
        letterSpacing: '0.1em', marginBottom: '2rem',
      }}>
        {remaining > 0 ? `~${remaining}s REMAINING` : 'FINALIZING...'}
      </div>

      {/* Skeleton thesis areas — same layout as real thesis */}
      <div style={{ borderLeft: '2px solid var(--mint)', paddingLeft: '1rem', marginBottom: '2rem' }}>
        <div style={{ width: '80%', height: 28, background: 'var(--bg-elevated)', marginBottom: '0.5rem' }} />
        <div style={{ width: '60%', height: 28, background: 'var(--bg-elevated)' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {['BULL CASE', 'BEAR CASE'].map(label => (
          <div key={label} style={{ border: '1px solid var(--border-subtle)', padding: '1rem' }}>
            <div className="font-mono" style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--text-quaternary)', marginBottom: '1rem' }}>
              {label}
            </div>
            {[100, 85, 70].map((w, i) => (
              <div key={i} style={{
                width: `${w}%`, height: 10,
                background: 'var(--bg-elevated)',
                marginBottom: '0.75rem',
              }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
