'use client';

import { useEffect, useState } from 'react';
import { useTheme, type ThemeChoice } from './theme-provider';
import { track } from '@/lib/analytics';

const OPTIONS: { value: ThemeChoice; label: string; hint: string }[] = [
  { value: 'light',  label: 'LIGHT', hint: 'Light theme' },
  { value: 'dark',   label: 'DARK',  hint: 'Dark theme' },
  { value: 'system', label: 'AUTO',  hint: 'Follow system' },
];

export function ThemeToggle() {
  const { choice, setChoice } = useTheme();
  // Gate the active highlight on mount so SSR (which can't know the stored
  // choice) doesn't mismatch the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div
      role="group"
      aria-label="Theme"
      style={{
        position: 'fixed',
        bottom: '1.25rem',
        left: '1.25rem',
        zIndex: 50,
        display: 'flex',
        border: '1px solid var(--border-strong)',
        background: 'var(--bg-elevated)',
      }}
    >
      {OPTIONS.map((opt, i) => {
        const active = mounted && choice === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => { track('theme_change', { choice: opt.value }); setChoice(opt.value); }}
            aria-pressed={active}
            title={opt.hint}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: '0.15em',
              padding: '6px 11px',
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? 'var(--bg-canvas)' : 'var(--text-tertiary)',
              border: 'none',
              borderLeft: i > 0 ? '1px solid var(--border-subtle)' : 'none',
              cursor: 'pointer',
              transition: 'background-color 150ms, color 150ms',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
