'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Sparkline } from '@/components/sparkline';
import type { Nifty50Stock } from '@/lib/data/nifty50';

interface StockCardProps {
  stock: Nifty50Stock;
}

interface StockApiData {
  prices?: Array<{ close: number }>;
  fundamentals?: { peRatio: number | null };
}

function shortLabel(sym: string): string {
  return sym.replace('.NS', '').replace('.BO', '');
}

export function StockCard({ stock }: StockCardProps) {
  const [closes, setCloses] = useState<number[]>([]);
  const [annualReturn, setAnnualReturn] = useState<number | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);

  useEffect(() => {
    const sym = shortLabel(stock.symbol);
    fetch(`/api/stocks/${sym}`)
      .then((r) => r.json())
      .then((d: StockApiData) => {
        if (d.prices && d.prices.length > 1) {
          const arr = d.prices.map((p) => p.close);
          setCloses(arr);
          setCurrentPrice(arr[arr.length - 1]);
          setAnnualReturn((arr[arr.length - 1] - arr[0]) / arr[0]);
        }
      })
      .catch(() => {});
  }, [stock.symbol]);

  const sym = shortLabel(stock.symbol);
  const up = annualReturn !== null && annualReturn >= 0;
  const returnColor = annualReturn === null ? 'var(--text-tertiary)' : up ? 'var(--up)' : 'var(--down)';

  return (
    <Link
      href={`/stock/${sym}`}
      style={{
        display: 'block',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        padding: '1.25rem',
        textDecoration: 'none',
        transition: 'border-color 0.15s',
      }}
      className="hover:border-[var(--accent)]"
    >
      {/* Symbol + sector */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p
            className="num"
            style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)', fontWeight: 600, letterSpacing: '0.03em' }}
          >
            {sym}
          </p>
          <p
            style={{ fontSize: 'var(--text-micro)', color: 'var(--text-tertiary)', marginTop: '2px' }}
            className="line-clamp-1"
          >
            {stock.name}
          </p>
        </div>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-micro)',
            letterSpacing: '0.07em',
            padding: '2px 7px',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-tertiary)',
            whiteSpace: 'nowrap',
          }}
        >
          {stock.sector}
        </span>
      </div>

      {/* Sparkline */}
      <div className="my-3" style={{ height: 32 }}>
        {closes.length > 1 ? (
          <Sparkline data={closes} width={200} height={32} />
        ) : (
          <div
            className="w-full h-8 animate-pulse"
            style={{ background: 'var(--bg-input)' }}
          />
        )}
      </div>

      {/* Price + return */}
      <div className="flex items-end justify-between mt-2">
        <span
          className="num"
          style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)' }}
        >
          {currentPrice !== null ? `₹${currentPrice.toFixed(2)}` : '—'}
        </span>
        {annualReturn !== null && (
          <span
            className="num"
            style={{ fontSize: 'var(--text-small)', color: returnColor }}
          >
            {up ? '+' : ''}{(annualReturn * 100).toFixed(1)}%
          </span>
        )}
      </div>
    </Link>
  );
}
