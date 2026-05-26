'use client';

import { useState, useRef, useEffect } from 'react';

interface CitationProps {
  n: number;
  reason: string;
  /** color override: 'grounded' (green) | 'unverified' (amber, default) */
  tone?: 'grounded' | 'unverified';
  /** When provided, clicking opens the Evidence Drawer instead of tooltip */
  onClick?: () => void;
}

export function Citation({ n, reason, tone = 'unverified', onClick }: CitationProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const color = tone === 'grounded' ? 'var(--grounded)' : 'var(--unverified)';

  return (
    <span ref={ref} className="relative inline-block">
      <sup
        className="font-serif italic ml-0.5 select-none"
        style={{ color, fontSize: '0.75em', cursor: onClick ? 'pointer' : 'help' }}
        onMouseEnter={() => !onClick && setOpen(true)}
        onMouseLeave={() => !onClick && setOpen(false)}
        onClick={(e) => {
          e.stopPropagation();
          if (onClick) { onClick(); return; }
          setOpen((v) => !v);
        }}
      >
        <span style={{ color: 'var(--text-tertiary)' }}>·</span>
        {n}
      </sup>
      {open && (
        <span
          role="tooltip"
          className="absolute z-50 mt-1 w-64 p-3 text-left normal-case"
          style={{
            top: '100%',
            left: 0,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-strong)',
            color: 'var(--text-secondary)',
            fontSize: 'var(--text-small)',
            fontFamily: 'var(--font-sans)',
            fontStyle: 'normal',
            lineHeight: 1.5,
          }}
        >
          <span style={{ color, fontWeight: 500 }}>[{n}]&nbsp;</span>
          {reason}
        </span>
      )}
    </span>
  );
}
