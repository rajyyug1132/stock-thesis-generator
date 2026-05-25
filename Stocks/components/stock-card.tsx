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
}

interface StockCardProps {
  stock: Nifty50Stock;
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

  const sym = shortLabel(stock.symbol);

  useEffect(() => {
    fetch(`/api/stocks/${sym}`)
      .then((r) => r.json())
      .then((d: StockApiData) => {
        if (d.fundamentals) setFund(d.fundamentals);
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
  const returnColor =
    annualReturn === null ? 'var(--text-tertiary)' : up ? 'var(--up)' : 'var(--down)';

  return (
    <Link
      href={`/stock/${sym}`}
      className="hover-accent"
      style={{
        display: 'block',
        textAlign: 'left',
        background: 'var(--bg-elevated)',
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
          <Sparkline data={closes} width={240} height={32} color="var(--up)" />
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
          <span className="num" style={{ fontSize: 'var(--text-small)', color: returnColor }}>
            {up ? '+' : ''}{(annualReturn * 100).toFixed(1)}%
          </span>
        )}
      </div>
    </Link>
  );
}
