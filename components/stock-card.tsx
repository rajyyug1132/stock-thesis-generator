'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Sparkline } from '@/components/sparkline';
import type { Nifty50Stock } from '@/lib/data/nifty50';

const SECTOR_COLORS: Record<string, string> = {
  IT: 'bg-purple-100 text-purple-700',
  BFSI: 'bg-blue-100 text-blue-700',
  OIL_GAS: 'bg-orange-100 text-orange-700',
  AUTO: 'bg-yellow-100 text-yellow-700',
  FMCG: 'bg-green-100 text-green-700',
  PHARMA: 'bg-teal-100 text-teal-700',
  METALS: 'bg-gray-100 text-gray-700',
  CEMENT: 'bg-stone-100 text-stone-700',
  TELECOM: 'bg-indigo-100 text-indigo-700',
  POWER: 'bg-red-100 text-red-700',
  CONSUMER: 'bg-pink-100 text-pink-700',
  INFRA: 'bg-cyan-100 text-cyan-700',
  OTHER: 'bg-gray-100 text-gray-600',
};

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
          // Simple 1Y return from first to last close
          const ret = (arr[arr.length - 1] - arr[0]) / arr[0];
          setAnnualReturn(ret);
        }
      })
      .catch(() => {/* silently ignore — card renders without chart */});
  }, [stock.symbol]);

  const sym = shortLabel(stock.symbol);
  const sectorClass = SECTOR_COLORS[stock.sector] ?? 'bg-gray-100 text-gray-600';

  return (
    <Link
      href={`/stock/${sym}`}
      className="block rounded-xl border border-gray-200 bg-white p-5 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-gray-900">{sym}</p>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{stock.name}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sectorClass}`}>
          {stock.sector}
        </span>
      </div>

      {/* Sparkline */}
      <div className="my-3 flex items-center" style={{ height: 32 }}>
        {closes.length > 1 ? (
          <div style={{ width: '100%', height: 32 }}>
            <Sparkline data={closes} width={200} height={32} />
          </div>
        ) : (
          <div className="w-full h-8 rounded bg-gray-50 animate-pulse" />
        )}
      </div>

      {/* Price + return */}
      <div className="flex items-end justify-between mt-2">
        <span className="text-sm font-semibold text-gray-900">
          {currentPrice != null ? `₹${currentPrice.toFixed(2)}` : '—'}
        </span>
        {annualReturn != null && (
          <span className={`text-xs font-medium ${annualReturn >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {annualReturn >= 0 ? '+' : ''}{(annualReturn * 100).toFixed(1)}% 1Y
          </span>
        )}
      </div>
    </Link>
  );
}
