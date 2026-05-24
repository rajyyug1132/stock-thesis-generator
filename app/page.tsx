import Link from 'next/link';
import { NIFTY_50 } from '@/lib/data/nifty50';
import { StockCard } from '@/components/stock-card';

const FEATURED = ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'TATAMOTORS.NS', 'ICICIBANK.NS'];

export default function Home() {
  const featured = FEATURED.map((sym) => NIFTY_50.find((s) => s.symbol === sym)).filter(Boolean) as typeof NIFTY_50;

  return (
    <main className="max-w-5xl mx-auto px-4 py-12 space-y-10">

      {/* Hero */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Stock Thesis Generator</h1>
        <p className="text-gray-500 max-w-xl">
          AI-grounded investment theses for Nifty 50 stocks. Every claim is verified against live data — no vibe analysis.
        </p>
        <div className="flex gap-3 pt-2">
          <Link
            href="/compare"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Compare stocks →
          </Link>
        </div>
      </div>

      {/* Featured cards */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Featured Stocks</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {featured.map((stock) => (
            <StockCard key={stock.symbol} stock={stock} />
          ))}
        </div>
      </div>

    </main>
  );
}
