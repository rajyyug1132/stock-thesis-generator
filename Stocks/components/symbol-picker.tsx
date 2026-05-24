'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { NIFTY_50, type Sector } from '@/lib/data/nifty50';

const MAX = 5;

const SECTOR_LABELS: Record<Sector, string> = {
  IT: 'IT',
  BFSI: 'BFSI',
  OIL_GAS: 'Oil & Gas',
  AUTO: 'Auto',
  FMCG: 'FMCG',
  PHARMA: 'Pharma',
  METALS: 'Metals',
  CEMENT: 'Cement',
  TELECOM: 'Telecom',
  POWER: 'Power',
  CONSUMER: 'Consumer',
  INFRA: 'Infra',
  OTHER: 'Other',
};

interface SymbolPickerProps {
  initialSymbols?: string[];
}

export function SymbolPicker({ initialSymbols = [] }: SymbolPickerProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initialSymbols);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const list = q
      ? NIFTY_50.filter(
          (s) =>
            s.symbol.toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q) ||
            s.sector.toLowerCase().includes(q)
        )
      : NIFTY_50;

    // Group by sector
    const grouped = new Map<Sector, typeof NIFTY_50>();
    for (const stock of list) {
      if (!grouped.has(stock.sector)) grouped.set(stock.sector, []);
      grouped.get(stock.sector)!.push(stock);
    }
    return grouped;
  }, [query]);

  function toggle(symbol: string) {
    setSelected((prev) => {
      if (prev.includes(symbol)) return prev.filter((s) => s !== symbol);
      if (prev.length >= MAX) return prev;
      return [...prev, symbol];
    });
  }

  function remove(symbol: string) {
    setSelected((prev) => prev.filter((s) => s !== symbol));
  }

  function handleCompare() {
    if (selected.length === 1) {
      const sym = selected[0].replace('.NS', '');
      router.push(`/stock/${sym}`);
      return;
    }
    const syms = selected.map((s) => s.replace('.NS', '')).join(',');
    router.push(`/compare?symbols=${syms}`);
  }

  const shortLabel = (sym: string) => sym.replace('.NS', '');

  return (
    <div className="w-full max-w-xl space-y-3">
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((sym) => (
            <span
              key={sym}
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800"
            >
              {shortLabel(sym)}
              <button
                onClick={() => remove(sym)}
                className="text-blue-500 hover:text-blue-800 transition-colors leading-none"
                aria-label={`Remove ${sym}`}
              >
                ×
              </button>
            </span>
          ))}
          <span className="text-xs text-gray-400 self-center">
            {selected.length}/{MAX} selected
          </span>
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search Nifty 50 stocks..."
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {open && (
          <div className="absolute z-50 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
            {Array.from(filtered.entries()).map(([sector, stocks]) => (
              <div key={sector}>
                <div className="sticky top-0 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  {SECTOR_LABELS[sector]}
                </div>
                {stocks.map((stock) => {
                  const isSelected = selected.includes(stock.symbol);
                  const isDisabled = !isSelected && selected.length >= MAX;
                  return (
                    <button
                      key={stock.symbol}
                      onClick={() => { toggle(stock.symbol); setQuery(''); }}
                      disabled={isDisabled}
                      className={`flex w-full items-center justify-between px-4 py-2 text-sm transition-colors ${
                        isDisabled
                          ? 'opacity-40 cursor-not-allowed'
                          : isSelected
                          ? 'bg-blue-50 text-blue-700'
                          : 'hover:bg-gray-50 text-gray-800'
                      }`}
                    >
                      <span>
                        <span className="font-medium">{shortLabel(stock.symbol)}</span>
                        <span className="ml-2 text-gray-400">{stock.name}</span>
                      </span>
                      {isSelected && <span className="text-blue-500 text-xs">✓</span>}
                    </button>
                  );
                })}
              </div>
            ))}
            {filtered.size === 0 && (
              <p className="px-4 py-3 text-sm text-gray-400">No results for &quot;{query}&quot;</p>
            )}
          </div>
        )}
      </div>

      {/* Dismiss overlay */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}

      {/* Submit */}
      <button
        onClick={handleCompare}
        disabled={selected.length < 2}
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {selected.length < 2 ? 'Select 2+ stocks' : `Compare ${selected.length} stocks →`}
      </button>
    </div>
  );
}
