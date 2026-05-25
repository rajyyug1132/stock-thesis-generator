'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SectionLabel } from '@/components/ui/section-label';

/* ══════════════════════════════════════════════════════════════════════════════
   LogoMark — matches Editorial Quant Design System / assets/logo-mark.svg
   Italic serif "Q" inside a thin mint square with arrow accent.
══════════════════════════════════════════════════════════════════════════════ */
function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="0.5" y="0.5" width="63" height="63" fill="none" stroke="var(--accent)" strokeWidth="1" />
      <text
        x="32" y="44"
        fontFamily="'Instrument Serif', Georgia, serif"
        fontSize="44"
        fill="var(--text-primary)"
        textAnchor="middle"
        fontStyle="italic"
      >Q</text>
      <line x1="44" y1="46" x2="58" y2="32" stroke="var(--accent)" strokeWidth="2" />
      <line x1="58" y1="32" x2="58" y2="38" stroke="var(--accent)" strokeWidth="2" />
      <line x1="58" y1="32" x2="52" y2="32" stroke="var(--accent)" strokeWidth="2" />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   JitterGraph — animated mini bullish chart that lives behind the header ticker.
   Uses framer-motion to animate a polyline path that "breathes" like a live feed.
   "Big Graph" jitter logic: random small perturbations on a rising trend.
══════════════════════════════════════════════════════════════════════════════ */
function useJitterPoints(count = 32, width = 200, height = 40) {
  const [points, setPoints] = useState<string>('');
  const baseRef = useRef<number[]>([]);

  useEffect(() => {
    // Build a rising base trend
    const base = Array.from({ length: count }, (_, i) => {
      const trend = (i / (count - 1)) * (height * 0.55); // rise 55% of height
      return height - 8 - trend;
    });
    baseRef.current = base;

    function tick() {
      const step = width / (count - 1);
      const jittered = baseRef.current.map((y, i) => {
        const jitter = (Math.random() - 0.48) * 4; // slight upward bias
        const ny = Math.max(4, Math.min(height - 4, y + jitter));
        baseRef.current[i] = ny;
        return `${(i * step).toFixed(1)},${ny.toFixed(1)}`;
      });
      setPoints(jittered.join(' '));
    }

    tick(); // initial render
    const id = setInterval(tick, 800);
    return () => clearInterval(id);
  }, [count, width, height]);

  return points;
}

function JitterGraph() {
  const W = 200, H = 40;
  const points = useJitterPoints(32, W, H);

  return (
    <svg
      width={W} height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ position: 'absolute', right: 0, top: 0, opacity: 0.18, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <motion.polyline
        points={points}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.5"
        animate={{ points }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   Live NIFTY ticker hook
══════════════════════════════════════════════════════════════════════════════ */
interface NiftyLive {
  level: number;
  change: number; // fractional e.g. 0.0043
}

function useNiftyLive(): NiftyLive | null {
  const [live, setLive] = useState<NiftyLive | null>(null);

  useEffect(() => {
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

/* ── Nav config ───────────────────────────────────────────────────────────── */
const NAV = [
  { href: '/',        label: 'STOCKS'  },
  { href: '/compare', label: 'COMPARE' },
] as const;

/* ══════════════════════════════════════════════════════════════════════════════
   Header — sticky 56px. Framer-motion active underline. Jitter graph accent.
══════════════════════════════════════════════════════════════════════════════ */
export function Header() {
  const pathname  = usePathname();
  const niftyLive = useNiftyLive();
  const positive  = niftyLive ? niftyLive.change >= 0 : true;

  function isActive(href: string) {
    if (href === '/') return pathname === '/' || pathname.startsWith('/stock');
    return pathname.startsWith(href);
  }

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
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
        <LogoMark size={24} />
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-primary)',
        }}>
          THESIS · ENGINE
        </span>
      </Link>

      {/* Nav — framer-motion underline slides between active items */}
      <nav style={{ marginLeft: 'auto', display: 'flex', gap: 28 }}>
        {NAV.map(({ href, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                position: 'relative',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                paddingBottom: 4,
                textDecoration: 'none',
                transition: 'color var(--duration-fast) var(--ease-out)',
              }}
            >
              {label}
              <AnimatePresence>
                {active && (
                  <motion.span
                    layoutId="nav-underline"
                    initial={{ opacity: 0, scaleX: 0.5 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    exit={{ opacity: 0, scaleX: 0.5 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 1,
                      background: 'var(--accent)',   /* mint */
                      transformOrigin: 'left',
                    }}
                  />
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* Live NIFTY ticker — with jitter graph behind it */}
      <div
        style={{
          position: 'relative',
          borderLeft: '1px solid var(--border-subtle)',
          paddingLeft: 20,
          marginLeft: 8,
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 500,
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: 8,
          overflow: 'hidden',
        }}
      >
        <JitterGraph />
        <span style={{ letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', position: 'relative' }}>
          NIFTY
        </span>

        {niftyLive ? (
          <>
            <span className="num" style={{ color: 'var(--text-secondary)', position: 'relative' }}>
              {niftyLive.level.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
            </span>
            <motion.span
              key={positive ? 'up' : 'down'}
              initial={{ opacity: 0, y: positive ? 3 : -3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="num"
              style={{ color: positive ? 'var(--up)' : 'var(--down)', position: 'relative' }}
            >
              {positive ? '▲' : '▼'}{Math.abs(niftyLive.change * 100).toFixed(2)}%
            </motion.span>
          </>
        ) : (
          <span style={{ color: 'var(--text-quaternary)', letterSpacing: '0.04em', position: 'relative' }}>···</span>
        )}
      </div>
    </header>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MethodStrip — three-column process explainer with vertical dividers.
══════════════════════════════════════════════════════════════════════════════ */
const METHOD_ITEMS = [
  { n: '01', label: 'LIVE DATA',         desc: 'Yahoo Finance prices, fundamentals, and news fetched at request time.' },
  { n: '02', label: 'GEMINI PRO THESIS', desc: 'Structured JSON output: summary, bull case, bear case, risks, catalysts.' },
  { n: '03', label: 'FLASH VALIDATION',  desc: 'Every evidence field checked against source. Grounded vs unverified — shown inline.' },
] as const;

export function MethodStrip() {
  return (
    <div style={{
      borderBottom: '1px solid var(--border-subtle)',
      borderTop: '1px solid var(--border-subtle)',
      background: 'var(--bg-elevated)',
    }}>
      <div
        className="column"
        style={{ padding: '24px 32px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}
      >
        {METHOD_ITEMS.map(({ n, label, desc }, i) => (
          <div
            key={n}
            style={{
              paddingLeft:  i > 0 ? 24 : 0,
              paddingRight: i < METHOD_ITEMS.length - 1 ? 24 : 0,
              borderRight:  i < METHOD_ITEMS.length - 1 ? '1px solid var(--border-subtle)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="num" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.1em' }}>
                {n}
              </span>
              <SectionLabel>{label}</SectionLabel>
            </div>
            <p style={{ margin: 0, color: 'var(--text-tertiary)', fontSize: 'var(--text-small)', lineHeight: 1.55 }}>
              {desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
