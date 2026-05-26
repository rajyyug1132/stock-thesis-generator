'use client';

import Link from 'next/link';
import { Sparkline } from '@/components/sparkline';
import type { StockCardData } from '@/lib/data/stock-card';

interface StockCardProps {
  data: StockCardData;
}

function shortLabel(sym: string): string {
  return sym.replace('.NS', '').replace('.BO', '');
}

/* ══════════════════════════════════════════════════════════════════════════════
   StockCard — Editorial Quant data-dense variant.
   Top-right: Volatility + Sector in Geist Mono 10px.
   Sparkline: pure 1.5px mint polyline, no fill.
   Hover: border lifts to var(--accent).
   Receives data from server component, zero client-side fetch.
   data-symbol attribute enables BioPulseOverlay target tracking.
   ══════════════════════════════════════════════════════════════════════════════ */
export function StockCard({ data }: StockCardProps) {
  const sym = shortLabel(data.symbol);
  const up = data.annualReturn >= 0;

  const returnColor = up ? 'var(--up)' : 'var(--down)';

  return (
    <Link
      href={`/stock/${sym}`}
      data-symbol={data.symbol}
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
            {data.name}
          </p>
        </div>

        {/* Right: dense VOL + sector block */}
        <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 10, lineHeight: 1.4, letterSpacing: '0.04em', flexShrink: 0 }}>
          <div>
            <span style={{ color: 'var(--text-quaternary)' }}>VOL </span>
            <span style={{ color: 'var(--text-secondary)' }}>
              {(data.annualVol * 100).toFixed(0)}%
            </span>
          </div>
          <div style={{ marginTop: 4, padding: '1px 6px', display: 'inline-block', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
            {data.sector}
          </div>
        </div>
      </div>

      {/* Sparkline — pure 1.5px mint polyline, no fill */}
      <div style={{ height: 32, margin: '12px 0' }}>
        {data.sparkline && data.sparkline.length > 1 ? (
          <Sparkline data={data.sparkline} width={240} height={32} color={up ? 'var(--up)' : 'var(--down)'} />
        ) : (
          <div style={{ width: '100%', height: 32, background: 'var(--bg-input)' }} />
        )}
      </div>

      {/* Price + 1Y return */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8 }}>
        <span className="num" style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)' }}>
          ₹{data.currentPrice.toFixed(2)}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="num" style={{ fontSize: 'var(--text-small)', color: returnColor }}>
            {up ? '+' : ''}{(data.annualReturn * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </Link>
  );
}
