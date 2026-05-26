'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Sparkline } from '@/components/sparkline';
import type { Nifty50Stock } from '@/lib/data/nifty50';
import type { Fundamentals } from '@/lib/data/types';

/* ── Types ────────────────────────────────────────────────────────────────── */
interface StockApiData {
  prices?: Array<{ close: number }>;
  fundamentals?: Fundamentals;
  priceDropEvent?: { dropPercent: string; eventHeadline: string } | null;
}

interface StockCardProps {
  stock: Nifty50Stock;
}

function NewsSentimentTooltip({ headline }: { headline: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center select-none" style={{ fontStyle: 'normal' }}>
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label="News sentiment warning detail"
        style={{
          color: 'var(--rust)',
          fontSize: '11px',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'help',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '12px',
          height: '12px',
          lineHeight: '12px',
        }}
      >
        <span aria-hidden="true">ⓘ</span>
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-50 p-2 text-left normal-case shadow-xl font-sans"
          style={{
            bottom: '100%',
            right: 0,
            marginBottom: '6px',
            width: '220px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-strong)',
            color: 'var(--text-primary)',
            fontSize: '10px',
            fontWeight: 'normal',
            lineHeight: 1.4,
            borderRadius: '0px',
          }}
        >
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--rust)', marginBottom: '3px', fontWeight: 600, letterSpacing: '0.05em' }}>
            WARNING: SENTIMENT DROP LINK
          </div>
          {headline}
          <span className="absolute top-full right-2 border-4 border-transparent border-t-strong" style={{ borderTopColor: 'var(--border-strong)' }} />
        </span>
      )}
    </span>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function shortLabel(sym: string): string {
  return sym.replace('.NS', '').replace('.BO', '');
}

function fmtCap(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e7)  return `${(n / 1e7).toFixed(0)}Cr`;
  return n.toFixed(0);
}

/* ══════════════════════════════════════════════════════════════════════════════
   StockCard — Editorial Quant data-dense variant.
   Top-right: P/E + Mkt cap in Geist Mono 10px.
   Sparkline: pure 1.5px mint polyline, no fill.
   Hover: border lifts to var(--accent).
══════════════════════════════════════════════════════════════════════════════ */
export function StockCard({ stock }: StockCardProps) {
  const [closes, setCloses]           = useState<number[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [annualReturn, setAnnualReturn] = useState<number | null>(null);
  const [fund, setFund]               = useState<Fundamentals | null>(null);
  const [dropEvent, setDropEvent]     = useState<{ dropPercent: string; eventHeadline: string } | null>(null);

  const sym = shortLabel(stock.symbol);

  useEffect(() => {
    fetch(`/api/stocks/${sym}`)
      .then((r) => r.json())
      .then((d: StockApiData) => {
        if (d.fundamentals) setFund(d.fundamentals);
        if (d.priceDropEvent) setDropEvent(d.priceDropEvent);
        if (d.prices && d.prices.length > 1) {
          const arr = d.prices.map((p) => p.close);
          setCloses(arr);
          setCurrentPrice(arr[arr.length - 1]);
          setAnnualReturn((arr[arr.length - 1] - arr[0]) / arr[0]);
        }
      })
      .catch(() => {});
  }, [sym]);

  const up = annualReturn !== null && annualReturn >= 0;
  const hasDropEvent = dropEvent !== null;
  
  const returnColor =
    annualReturn === null
      ? 'var(--text-tertiary)'
      : hasDropEvent
      ? 'var(--rust)' // Warning Rust
      : up
      ? 'var(--up)'
      : 'var(--down)';

  return (
    <Link
      href={`/stock/${sym}`}
      className="hover-accent hover:border-[var(--accent)] transition-colors duration-200"
      style={{
        display: 'block',
        textAlign: 'left',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        padding: 20,
        textDecoration: 'none',
        width: '100%',
      }}
    >
      {/* Symbol row + fundamentals block */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        {/* Left: symbol + full name */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            className="num"
            style={{ margin: 0, fontSize: 'var(--text-body)', color: 'var(--text-primary)', fontWeight: 600, letterSpacing: '0.03em' }}
          >
            {sym}
          </p>
          <p
            style={{ margin: '2px 0 0', fontSize: 'var(--text-micro)', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {stock.name}
          </p>
        </div>

        {/* Right: dense P/E + MKT cap data block, or sector pill fallback */}
        {fund ? (
          <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 10, lineHeight: 1.4, letterSpacing: '0.04em', flexShrink: 0 }}>
            <div>
              <span style={{ color: 'var(--text-quaternary)' }}>P/E </span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {fund.peRatio != null ? fund.peRatio.toFixed(1) : '—'}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-quaternary)' }}>MKT </span>
              <span style={{ color: 'var(--text-secondary)' }}>₹{fmtCap(fund.marketCap)}</span>
            </div>
            <div style={{ marginTop: 4, padding: '1px 6px', display: 'inline-block', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              {stock.sector}
            </div>
          </div>
        ) : (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 'var(--text-micro)',
            letterSpacing: '0.07em', padding: '2px 7px',
            border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)',
            whiteSpace: 'nowrap', textTransform: 'uppercase', flexShrink: 0,
          }}>
            {stock.sector}
          </span>
        )}
      </div>

      {/* Sparkline — pure 1.5px mint polyline, no fill */}
      <div style={{ height: 32, margin: '12px 0' }}>
        {closes.length > 1 ? (
          <Sparkline data={closes} width={240} height={32} color={hasDropEvent ? 'var(--rust)' : 'var(--up)'} />
        ) : (
          <div style={{ width: '100%', height: 32, background: 'var(--bg-input)' }} />
        )}
      </div>

      {/* Price + 1Y return */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8 }}>
        <span className="num" style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)' }}>
          {currentPrice != null ? `₹${currentPrice.toFixed(2)}` : '—'}
        </span>
        {annualReturn !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="num" style={{ fontSize: 'var(--text-small)', color: returnColor }}>
              {up ? '+' : ''}{(annualReturn * 100).toFixed(1)}%
            </span>
            {hasDropEvent && (
              <NewsSentimentTooltip headline={dropEvent.eventHeadline} />
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
