'use client';

import { motion } from 'framer-motion';
import type { ConvictionState } from '@/hooks/use-conviction';

export function ConvictionSlider({
  conviction,
  onChange,
}: {
  conviction: ConvictionState;
  onChange: (v: number) => void;
}) {
  const { value, label } = conviction;

  // Interpolate mint → bone → rust as value goes 100 → 50 → 0
  const trackColor = value > 50
    ? `rgba(168, 199, 186, ${0.15 + (value - 50) / 50 * 0.45})`
    : `rgba(212, 165, 116, ${0.15 + (50 - value) / 50 * 0.45})`;

  const labelColor = value > 50
    ? 'var(--mint)'
    : value < 50
    ? 'var(--rust)'
    : 'var(--text-tertiary)';

  return (
    <div style={{ padding: '2rem 0 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>

      {/* Label row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
        <span
          className="font-mono"
          style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(212,165,116,0.7)' }}
        >
          BEAR
        </span>

        <div style={{ textAlign: 'center' }}>
          <motion.span
            key={label}
            className="font-mono"
            style={{ fontSize: 10, letterSpacing: '0.25em', color: labelColor, display: 'block' }}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {label}
          </motion.span>
          <div
            className="font-mono"
            style={{ fontSize: 8, color: 'var(--text-quaternary)', marginTop: 2, letterSpacing: '0.15em' }}
          >
            CONVICTION
          </div>
        </div>

        <span
          className="font-mono"
          style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(168,199,186,0.7)' }}
        >
          BULL
        </span>
      </div>

      {/* Track + thumb */}
      <div style={{ position: 'relative', height: 32, display: 'flex', alignItems: 'center' }}>

        {/* Track background */}
        <div style={{
          position: 'absolute', inset: '14px 0',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-subtle)',
        }} />

        {/* Active fill — emanates from center */}
        <motion.div
          style={{
            position: 'absolute',
            height: 4,
            background: trackColor,
            left: value <= 50 ? `${value}%` : '50%',
            right: value >= 50 ? `${100 - value}%` : '50%',
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 40 }}
        />

        {/* Center tick */}
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          width: 1, height: 12,
          background: 'var(--border-strong)',
        }} />

        {/* Native input — invisible, handles a11y + keyboard */}
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            position: 'absolute', inset: 0, width: '100%',
            opacity: 0, cursor: 'ew-resize', zIndex: 10,
          }}
          aria-label={`Investment conviction slider. Current: ${label}. ${value}% bullish.`}
          aria-valuetext={label}
        />

        {/* Custom thumb */}
        <motion.div
          style={{
            position: 'absolute',
            left: `${value}%`,
            transform: 'translate(-50%, 0)',
            width: 18, height: 18,
            background: 'var(--bg-elevated)',
            border: `2px solid ${value > 50 ? 'var(--mint)' : value < 50 ? 'var(--rust)' : 'var(--border-strong)'}`,
            pointerEvents: 'none',
            zIndex: 5,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        />
      </div>

      {/* Value readout */}
      <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
        <span
          className="font-mono"
          style={{ fontSize: 8, color: 'var(--text-quaternary)', letterSpacing: '0.1em' }}
        >
          {value < 50
            ? `${50 - value}% TOWARD BEAR`
            : value > 50
            ? `${value - 50}% TOWARD BULL`
            : 'PERFECTLY NEUTRAL'}
        </span>
      </div>
    </div>
  );
}
