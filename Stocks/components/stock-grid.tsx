import { fetchStockForCard } from '@/lib/data/stock-card';
import { StockCard } from '@/components/stock-card';

const FEATURED = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'TATAMOTORS', 'ICICIBANK'];

export async function StockGrid() {
  // Parallel fetch — all 6 simultaneously on the server
  const results = await Promise.allSettled(
    FEATURED.map(s => fetchStockForCard(s))
  );

  const stocks = results.map((r) =>
    r.status === 'fulfilled' ? r.value : null
  );

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 0,
        borderLeft: '1px solid var(--border-subtle)',
      }}
    >
      {stocks.map((stock, i) =>
        stock ? (
          <StockCard key={stock.symbol} data={stock} />
        ) : (
          <StockCardError key={i} symbol={FEATURED[i]} />
        )
      )}
    </div>
  );
}

function StockCardError({ symbol }: { symbol: string }) {
  return (
    <div
      style={{
        padding: '1.5rem',
        borderRight: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
        color: 'var(--text-quaternary)',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: '0.1em',
      }}
    >
      {symbol} · DATA UNAVAILABLE
    </div>
  );
}
