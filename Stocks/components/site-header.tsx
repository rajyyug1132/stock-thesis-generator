'use client';

import Link from 'next/link';
import { LogoMark } from '@/components/ui/logo-mark';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/* ── Live NIFTY ticker ────────────────────────────────────────────────────── */
interface NiftyLive {
  level: number;
  change: number; // fractional, e.g. 0.0043
}

function useNiftyLive(): NiftyLive | null {
  const [live, setLive] = useState<NiftyLive | null>(null);

  useEffect(() => {
    // Fetch NIFTY 50 index price via the stocks API (^NSEI on Yahoo)
    fetch('/api/stocks/NSEI')
      .then((r) => r.json())
      .then((d) => {
        const prices: Array<{ close: number }> = d.prices ?? [];
        if (prices.length < 2) return;
        const current = prices[prices.length - 1].close;
        const prev    = prices[prices.length - 2].close;
        setLive({ level: current, change: (current - prev) / prev });
      })
      .catch(() => {});
  }, []);

  return live;
}

/* ── Nav tabs ─────────────────────────────────────────────────────────────── */
const NAV = [
  { href: '/',        label: 'STOCKS'  },
  { href: '/compare', label: 'COMPARE' },
] as const;

/* ── Component ────────────────────────────────────────────────────────────── */
export function SiteHeader() {
  const pathname  = usePathname();
  const niftyLive = useNiftyLive();

  function isActive(href: string) {
    if (href === '/') return pathname === '/' || pathname.startsWith('/stock');
    return pathname.startsWith(href);
  }

  const positive = niftyLive ? niftyLive.change >= 0 : true;

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 28,
        height: 56,
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0 32px',
        background: 'var(--bg-canvas)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}
      >
        <LogoMark size={24} />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-primary)',
          }}
        >
          THESIS · ENGINE
        </span>
      </Link>

      {/* Nav */}
      <nav style={{ marginLeft: 'auto', display: 'flex', gap: 28 }}>
        {NAV.map(({ href, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderBottom: active
                  ? '1px solid var(--accent)'
                  : '1px solid transparent',
                paddingBottom: 4,
                textDecoration: 'none',
                transition: 'color var(--duration-fast) var(--ease-out)',
              }}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Live NIFTY ticker */}
      <div
        style={{
          borderLeft: '1px solid var(--border-subtle)',
          paddingLeft: 20,
          marginLeft: 8,
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 500,
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: 8,
        }}
      >
        <span
          style={{
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}
        >
          NIFTY
        </span>

        {niftyLive ? (
          <>
            <span className="num" style={{ color: 'var(--text-secondary)' }}>
              {niftyLive.level.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
            </span>
            <span
              className="num"
              style={{ color: positive ? 'var(--up)' : 'var(--down)' }}
            >
              {positive ? '▲' : '▼'}{Math.abs(niftyLive.change * 100).toFixed(2)}%
            </span>
          </>
        ) : (
          <span style={{ color: 'var(--text-quaternary)', letterSpacing: '0.04em' }}>
            ···
          </span>
        )}
      </div>
    </header>
  );
}
