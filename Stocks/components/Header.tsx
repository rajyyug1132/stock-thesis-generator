'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SectionLabel } from '@/components/ui/section-label';
import { NIFTY_50 } from '@/lib/data/nifty50';

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
      style={{ position: 'absolute', right: 0, top: 0, opacity: 0.25, pointerEvents: 'none' }}
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
   Bionic Ticker Animation (Digit-by-digit slide-roll animation)
══════════════════════════════════════════════════════════════════════════════ */
function BionicDigit({ char }: { char: string }) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        height: '1.2em',
        width: '0.6em',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Ghost digit to ensure the container always has the correct width */}
      <span className="invisible select-none" aria-hidden="true">{char}</span>
      
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={char}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="absolute inset-0 flex items-center justify-center font-mono"
        >
          {char}
        </motion.span>
      </AnimatePresence>
    </div>
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
    function fetchLive() {
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
    }

    fetchLive();
    const id = setInterval(fetchLive, 5000); // refresh level every 5s for live feel
    return () => clearInterval(id);
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
  const router    = useRouter();
  const niftyLive = useNiftyLive();
  const positive  = niftyLive ? niftyLive.change >= 0 : true;

  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  function isActive(href: string) {
    if (href === '/') return pathname === '/' || pathname.startsWith('/stock');
    return pathname.startsWith(href);
  }

  // Keyboard Navigation: Ctrl+K / Cmd+K, G then H, S
  useEffect(() => {
    let lastKey = '';
    let lastTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      if (isInput && !showCommandPalette) return;

      const key = e.key.toLowerCase();
      const now = Date.now();

      // Ctrl+K / Cmd+K
      if ((e.ctrlKey || e.metaKey) && key === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
        return;
      }

      // Escape
      if (key === 'escape' && showCommandPalette) {
        e.preventDefault();
        setShowCommandPalette(false);
        return;
      }

      if (showCommandPalette) return;

      // S -> Open Search (Open Command Palette prefilled)
      if (key === 's') {
        e.preventDefault();
        setShowCommandPalette(true);
        return;
      }

      // G then H
      if (lastKey === 'g' && key === 'h' && now - lastTime < 1000) {
        e.preventDefault();
        router.push('/');
        lastKey = '';
        return;
      }

      lastKey = key;
      lastTime = now;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, showCommandPalette]);

  // Command palette suggestions
  const suggestions = useMemo(() => {
    const q = paletteQuery.toLowerCase().trim();
    if (!q) {
      return [
        { id: 'home', label: 'Go to Home / Stocks', shortcut: 'G H', category: 'Navigation', action: () => router.push('/') },
        { id: 'compare', label: 'Go to Compare Screen', category: 'Navigation', action: () => router.push('/compare') },
        { id: 'example-compare', label: 'Compare RELIANCE with HDFCBANK', category: 'Compare', action: () => router.push('/compare?symbols=RELIANCE,HDFCBANK') },
        { id: 'example-compare-2', label: 'Compare TCS with INFY', category: 'Compare', action: () => router.push('/compare?symbols=TCS,INFY') },
      ];
    }

    const items: Array<{ id: string; label: string; shortcut?: string; category: string; action: () => void }> = [];

    // Parse compare command
    if (q.startsWith('compare') || q.includes('with') || q.split(/\s+/).length > 1) {
      const words = paletteQuery
        .replace(/with/gi, ' ')
        .replace(/compare/gi, ' ')
        .split(/[\s,·]+/)
        .map((w) => w.trim().toUpperCase())
        .filter((w) => w && w !== 'WITH' && w !== 'COMPARE');

      if (words.length >= 2) {
        items.push({
          id: 'dynamic-compare',
          label: `Compare ${words.join(' · ')}`,
          category: 'Compare',
          action: () => router.push(`/compare?symbols=${words.slice(0, 5).join(',')}`),
        });
      }
    }

    // Filter stocks
    const matchedStocks = NIFTY_50.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q)
    ).slice(0, 5);

    for (const stock of matchedStocks) {
      const sym = stock.symbol.replace('.NS', '');
      items.push({
        id: `stock-${sym}`,
        label: `View ${sym} Thesis — ${stock.name}`,
        category: 'Stocks',
        action: () => router.push(`/stock/${sym}`),
      });
    }

    if (items.length === 0) {
      items.push({
        id: 'search-anyway',
        label: `Go to ticker "${paletteQuery.toUpperCase()}"`,
        category: 'Action',
        action: () => router.push(`/stock/${paletteQuery.toUpperCase()}`),
      });
    }

    return items;
  }, [paletteQuery, router]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [paletteQuery]);

  const handlePaletteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions[selectedIndex]) {
        suggestions[selectedIndex].action();
        setShowCommandPalette(false);
        setPaletteQuery('');
      }
    }
  };

  return (
    <>
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
              {/* Bionic digit animation on NIFTY level */}
              <div className="flex" style={{ color: 'var(--text-secondary)', position: 'relative' }}>
                {niftyLive.level.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).split('').map((char, index) => (
                  <BionicDigit key={`${index}-${char === '.' ? 'dot' : char}`} char={char} />
                ))}
              </div>
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

      {/* Command Palette Modal */}
      <AnimatePresence>
        {showCommandPalette && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'start',
              justifyContent: 'center',
              paddingTop: '15vh',
              zIndex: 9999,
            }}
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowCommandPalette(false); setPaletteQuery(''); }}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(4px)',
              }}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '600px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-strong)',
                boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
                overflow: 'hidden',
                borderRadius: '0px',
              }}
            >
              {/* Input container */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--accent)',
                    fontSize: '14px',
                    marginRight: '12px',
                    userSelect: 'none',
                  }}
                >
                  &gt;
                </span>
                <input
                  autoFocus
                  type="text"
                  value={paletteQuery}
                  onChange={(e) => setPaletteQuery(e.target.value)}
                  onKeyDown={handlePaletteKeyDown}
                  placeholder="Compare RELIANCE with HDFCBANK or search ticker..."
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '14px',
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    color: 'var(--text-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    padding: '2px 6px',
                    userSelect: 'none',
                  }}
                >
                  ESC
                </span>
              </div>

              {/* Suggestions List */}
              <div style={{ maxHeight: '320px', overflowY: 'auto', padding: '8px 0' }}>
                {suggestions.map((item, index) => {
                  const isSelected = index === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        item.action();
                        setShowCommandPalette(false);
                        setPaletteQuery('');
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      style={{
                        padding: '10px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: isSelected ? 'rgba(193, 242, 224, 0.05)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '9px',
                            color: isSelected ? 'var(--accent)' : 'var(--text-quaternary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border-subtle)'}`,
                            padding: '1px 5px',
                            minWidth: '70px',
                            textAlign: 'center',
                          }}
                        >
                          {item.category}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-sans)',
                            fontSize: '13px',
                            color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                          }}
                        >
                          {item.label}
                        </span>
                      </div>
                      {item.shortcut ? (
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '9px',
                            color: 'var(--text-tertiary)',
                            letterSpacing: '0.1em',
                          }}
                        >
                          {item.shortcut}
                        </span>
                      ) : isSelected ? (
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            color: 'var(--accent)',
                          }}
                        >
                          ↵ ENTER
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: '10px 20px',
                  background: 'var(--bg-canvas)',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                  Use <span style={{ fontFamily: 'var(--font-mono)' }}>↑↓</span> to navigate, <span style={{ fontFamily: 'var(--font-mono)' }}>↵</span> to select
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                  Try typing: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>compare TCS INFY</span>
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
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
