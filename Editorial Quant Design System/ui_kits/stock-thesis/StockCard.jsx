/* eslint-disable */
/* StockCard — featured grid card. Editorial Quant data-dense variant:
   - Top-right shows P/E + Mkt cap in Geist Mono 10px
   - Sparkline is pure 1px mint line (no fill) */

function StockCard({ stock, go }) {
  const sym = stock.symbol.replace('.NS', '');
  const closes = window.PRICES[sym] || [];
  const fund   = window.FUNDAMENTALS[sym];
  const current = closes[closes.length - 1];
  const first = closes[0];
  const ret = first ? (current - first) / first : null;
  const up = ret !== null && ret >= 0;
  const color = ret === null ? 'var(--text-tertiary)' : up ? 'var(--up)' : 'var(--down)';

  function fmtCap(n) {
    if (!n && n !== 0) return '—';
    if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
    if (n >= 1e7)  return `${(n / 1e7).toFixed(0)}Cr`;
    return n.toFixed(0);
  }

  return (
    <button
      onClick={() => go('stock', { symbol: sym })}
      className="hover-accent"
      style={{
        display: 'block', textAlign: 'left',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        padding: 20, cursor: 'pointer', width: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p className="num" style={{ margin: 0, fontSize: 'var(--text-body)', color: 'var(--text-primary)', fontWeight: 600, letterSpacing: '0.03em' }}>{sym}</p>
          <p style={{ margin: '2px 0 0', fontSize: 'var(--text-micro)', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stock.name}</p>
        </div>
        {/* dense data block top-right */}
        {fund ? (
          <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 10, lineHeight: 1.4, letterSpacing: '0.04em' }}>
            <div><span style={{ color: 'var(--text-quaternary)' }}>P/E </span><span style={{ color: '#a1a1aa' }}>{fund.peRatio.toFixed(1)}</span></div>
            <div><span style={{ color: 'var(--text-quaternary)' }}>MKT </span><span style={{ color: '#a1a1aa' }}>₹{fmtCap(fund.marketCap)}</span></div>
            <div style={{ marginTop: 4, padding: '1px 6px', display: 'inline-block', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{stock.sector}</div>
          </div>
        ) : (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 'var(--text-micro)',
            letterSpacing: '0.07em', padding: '2px 7px',
            border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)',
            whiteSpace: 'nowrap', textTransform: 'uppercase',
          }}>{stock.sector}</span>
        )}
      </div>
      {/* Sparkline — pure 1px mint, no fill */}
      <div style={{ height: 32, margin: '12px 0' }}>
        {closes.length > 1 ? (
          <Sparkline data={closes} width={240} height={32} color="#a8c7ba" />
        ) : (
          <div style={{ width: '100%', height: 32, background: 'var(--bg-input)' }} />
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8 }}>
        <span className="num" style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)' }}>
          {current ? `₹${current.toFixed(2)}` : '—'}
        </span>
        {ret !== null && (
          <span className="num" style={{ fontSize: 'var(--text-small)', color }}>
            {up ? '+' : ''}{(ret * 100).toFixed(1)}%
          </span>
        )}
      </div>
    </button>
  );
}

Object.assign(window, { StockCard });
