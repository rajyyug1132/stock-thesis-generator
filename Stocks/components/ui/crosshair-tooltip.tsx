'use client';

import { ReactNode } from 'react';

interface CrosshairTooltipProps {
  x: number;
  y: number;
  visible: boolean;
  /** Offset from cursor; default offsets right of cursor */
  offset?: { x: number; y: number };
  children: ReactNode;
}

/**
 * Floating tooltip used by chart crosshairs. Positions follow the mouse,
 * styled to match editorial-quant aesthetic (mono numbers, dark card,
 * subtle border).
 */
export function CrosshairTooltip({
  x,
  y,
  visible,
  offset = { x: 12, y: 0 },
  children,
}: CrosshairTooltipProps) {
  if (!visible) return null;
  return (
    <div
      className="pointer-events-none absolute z-30"
      style={{
        left: x + offset.x,
        top: y + offset.y,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-strong)',
        padding: '0.75rem 1rem',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-small)',
        color: 'var(--text-primary)',
        minWidth: '160px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      }}
    >
      {children}
    </div>
  );
}
