/* eslint-disable */
/* CompareScreen — multi-symbol comparison + allocation + fan chart.
   Mirrors Stocks/app/compare/page.tsx. */

const { useState: cmpUseState, useMemo: cmpUseMemo } = React;

function ComparisonTable({ symbols }) {
  const rows = [
    { label: 'Current price', dir: 'none',   get: (s) => window.FUNDAMENTALS[s]?.currentPrice, fmt: (v) => v ? `₹${v.toFixed(2)}` : '—' },
    { label: '1Y return',     dir: 'higher', get: (s) => window.PRICES[s] ? (window.PRICES[s].at(-1) - window.PRICES[s][0]) / window.PRICES[s][0] : null, fmt: (v) => v == null ? '—' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%` },
    { label: '1Y volatility', dir: 'lower',  get: (s) => window.FUNDAMENTALS[s]?.annualVol,    fmt: (v) => v == null ? '—' : `${(v * 100).toFixed(1)}%` },
    { label: 'Sharpe',        dir: 'higher', get: (s) => window.FUNDAMENTALS[s]?.sharpe,       fmt: (v) => v == null ? '—' : (v >= 0 ? '+' : '') + v.toFixed(2) },
    { label: 'P/E',           dir: 'none',   get: (s) => window.FUNDAMENTALS[s]?.peRatio,      fmt: (v) => v == null ? '—' : v.toFixed(1) },
    { label: 'ROE',           dir: 'higher', get: (s) => window.FUNDAMENTALS[s]?.roe,          fmt: (v) => v == null ? '—' : `${(v * 100).toFixed(1)}%` },
    { label: 'Debt / Equity', dir: 'lower',  get: (s) => window.FUNDAMENTALS[s]?.debtToEquity, fmt: (v) => v == null ? '—' : v.toFixed(2) },
  ];

  function bestWorst(row) {
    if (row.dir === 'none') return { best: null, worst: null };
    const vals = symbols.map((s) => ({ s, v: row.get(s) })).filter((x) => x.v != null);
    if (!vals.length) return { best: null, worst: null };
    const sorted = [...vals].sort((a, b) => row.dir === 'higher' ? b.v - a.v : a.v - b.v);
    return { best: sorted[0].s, worst: sorted[sorted.length - 1].s };
  }

  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans)' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-rule)' }}>
            <th style={{
              textAlign: 'left', padding: '10px 18px',
              fontFamily: 'var(--font-mono)', fontSize: 'var(--text-micro)',
              letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-tertiary)',
              fontWeight: 500, width: 140,
            }}>METRIC</th>
            {symbols.map((s) => (
              <th key={s} style={{
                padding: '10px 14px', textAlign: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 'var(--text-micro)',
                letterSpacing: '0.1em', color: 'var(--text-primary)',
                fontWeight: 500,
              }}>{s}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const { best, worst } = bestWorst(row);
            return (
              <tr key={row.label} style={{ borderBottom: idx < rows.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                <td style={{ padding: '14px 18px', fontSize: 'var(--text-small)', color: 'var(--text-secondary)' }}>{row.label}</td>
                {symbols.map((s) => {
                  const v = row.get(s);
                  const color = s === best ? 'var(--up)' : s === worst ? 'var(--down)' : 'var(--text-primary)';
                  const weight = s === best ? 600 : 400;
                  return (
                    <td key={s} className="num" style={{
                      padding: '14px 14px', textAlign: 'center',
                      color, fontWeight: weight, fontSize: 'var(--text-body)',
                    }}>{row.fmt(v)}</td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AllocationBar({ symbols, weights, setWeights }) {
  const colors = ['#a8c7ba', '#7fa896', '#5d8a78', '#41695a', '#2b4a3f'];
  return (
    <div>
      <div style={{ display: 'flex', height: 28, border: '1px solid var(--border-strong)' }}>
        {symbols.map((s, i) => (
          <div key={s} style={{
            width: `${(weights[i] || 0) * 100}%`,
            background: colors[i % colors.length],
            borderRight: i < symbols.length - 1 ? '1px solid var(--bg-canvas)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--bg-canvas)', fontFamily: 'var(--font-mono)',
            fontSize: 11, letterSpacing: '0.04em', overflow: 'hidden', whiteSpace: 'nowrap',
          }}>
            {(weights[i] * 100).toFixed(0)}%
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {symbols.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ width: 10, height: 10, background: colors[i % colors.length] }}></span>
            <span className="num" style={{ width: 110, color: 'var(--text-primary)', fontSize: 'var(--text-small)' }}>{s}</span>
            <input
              type="range"
              min={0} max={100} step={1}
              value={Math.round((weights[i] || 0) * 100)}
              onChange={(e) => {
                const v = +e.target.value / 100;
                const others = symbols.map((_, j) => j === i ? 0 : (weights[j] || 0));
                const otherSum = others.reduce((a, b) => a + b, 0);
                const remaining = 1 - v;
                const newW = symbols.map((_, j) => {
                  if (j === i) return v;
                  return otherSum === 0 ? remaining / (symbols.length - 1) : (others[j] / otherSum) * remaining;
                });
                setWeights(newW);
              }}
              style={{ flex: 1, accentColor: 'var(--accent)' }}
            />
            <span className="num" style={{ width: 46, textAlign: 'right', color: 'var(--text-tertiary)', fontSize: 'var(--text-small)' }}>
              {(weights[i] * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FanChart({ symbols, weights }) {
  // Synthetic fan: monthly horizon, percentile bands derived from
  // weighted avg of annualVol of selected symbols.
  const drift = symbols.reduce((acc, s, i) => {
    const p = window.PRICES[s];
    const r = p ? (p.at(-1) - p[0]) / p[0] : 0;
    return acc + r * (weights[i] || 0);
  }, 0);
  const vol = symbols.reduce((acc, s, i) => acc + (window.FUNDAMENTALS[s]?.annualVol || 0.2) * (weights[i] || 0), 0);

  const N = 12; // months
  const W = 640, H = 240, padL = 56, padR = 20, padT = 18, padB = 28;
  const w = W - padL - padR;
  const h = H - padT - padB;

  function bandY(monthIdx, z) {
    const t = (monthIdx + 1) / 12;
    const monthDrift = drift * t;
    const monthSigma = vol * Math.sqrt(t);
    return 1 + monthDrift + z * monthSigma; // multiplier on starting capital
  }

  // y range = max p95 to min p5
  let yMax = 1.0, yMin = 1.0;
  for (let i = 0; i < N; i++) {
    yMax = Math.max(yMax, bandY(i, 1.645));
    yMin = Math.min(yMin, bandY(i, -1.645));
  }
  yMax = Math.max(yMax, 1.05);
  yMin = Math.min(yMin, 0.95);

  function yPx(v) { return padT + h - ((v - yMin) / (yMax - yMin)) * h; }
  function xPx(i) { return padL + (i / (N - 1)) * w; }

  // Build percentile bands
  function bandPath(zHi, zLo) {
    const top = [];
    const bot = [];
    for (let i = 0; i < N; i++) {
      top.push(`${i === 0 ? 'M' : 'L'} ${xPx(i).toFixed(1)} ${yPx(bandY(i, zHi)).toFixed(1)}`);
      bot.push(`L ${xPx(N - 1 - i).toFixed(1)} ${yPx(bandY(N - 1 - i, zLo)).toFixed(1)}`);
    }
    return top.join(' ') + ' ' + bot.join(' ') + ' Z';
  }

  // median line
  let medianPath = '';
  for (let i = 0; i < N; i++) {
    medianPath += (i === 0 ? 'M' : 'L') + ` ${xPx(i).toFixed(1)} ${yPx(bandY(i, 0)).toFixed(1)} `;
  }

  // y-axis ticks
  const yTicks = [yMin, (yMin + 1) / 2, 1, (1 + yMax) / 2, yMax];

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {/* y-axis */}
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={padL} y1={yPx(v)} x2={W - padR} y2={yPx(v)} stroke="#26221f" strokeWidth="1" strokeDasharray="3 3"/>
          <text x={padL - 8} y={yPx(v) + 3} textAnchor="end" fontFamily="'Geist Mono', monospace" fontSize="10" fill="#6c665e" letterSpacing="0.04em">
            {(v * 100).toFixed(0)}%
          </text>
        </g>
      ))}
      {/* bands */}
      <path d={bandPath(1.645, -1.645)} fill="#a8c7ba" fillOpacity="0.08" />
      <path d={bandPath(0.675, -0.675)} fill="#a8c7ba" fillOpacity="0.16" />
      {/* baseline */}
      <line x1={padL} y1={yPx(1)} x2={W - padR} y2={yPx(1)} stroke="#3a342d" strokeWidth="1"/>
      {/* median */}
      <path d={medianPath} fill="none" stroke="#a8c7ba" strokeWidth="1.5"/>
      {/* x labels */}
      {[0, 3, 6, 9, 11].map((i) => (
        <text key={i} x={xPx(i)} y={H - 10} textAnchor="middle" fontFamily="'Geist Mono', monospace" fontSize="10" fill="#6c665e" letterSpacing="0.04em">
          M{i + 1}
        </text>
      ))}
    </svg>
  );
}

function SymbolPicker({ selected, setSelected }) {
  const [query, setQuery] = cmpUseState('');
  const MAX = 5;
  const filtered = cmpUseMemo(() => {
    const q = query.toLowerCase().trim();
    const list = q
      ? window.NIFTY.filter((s) =>
          s.symbol.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.sector.toLowerCase().includes(q))
      : window.NIFTY;
    return list;
  }, [query]);

  function toggle(symbol) {
    setSelected((prev) => {
      if (prev.includes(symbol)) return prev.filter((s) => s !== symbol);
      if (prev.length >= MAX) return prev;
      return [...prev, symbol];
    });
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <SectionLabel>SELECTED · {selected.length} / {MAX}</SectionLabel>
        {selected.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {selected.map((s) => (
              <span key={s} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'transparent', border: '1px solid var(--accent)',
                color: 'var(--accent)', padding: '2px 10px',
                fontFamily: 'var(--font-mono)', fontSize: 11,
                letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                {s}
                <button onClick={() => toggle(s)} style={{ color: 'var(--accent)', cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search Nifty 50 stocks…"
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'var(--bg-input)', border: '1px solid var(--border-strong)',
          color: 'var(--text-primary)', padding: '12px 14px',
          fontFamily: 'var(--font-sans)', fontSize: 14, outline: 'none',
        }}
        onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
        onBlur={(e) => e.target.style.borderColor = 'var(--border-strong)'}
      />
      <div style={{ marginTop: 10, maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border-subtle)' }}>
        {filtered.map((stock) => {
          const sym = stock.symbol.replace('.NS', '');
          const isSelected = selected.includes(sym);
          const isDisabled = !isSelected && selected.length >= MAX;
          return (
            <button
              key={stock.symbol}
              onClick={() => toggle(sym)}
              disabled={isDisabled}
              style={{
                display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px', textAlign: 'left',
                background: isSelected ? 'var(--accent-muted)' : 'transparent',
                color: isDisabled ? 'var(--text-quaternary)' : isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderBottom: '1px solid var(--border-subtle)',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
              }}>
              <span>
                <span className="num" style={{ fontWeight: 500 }}>{sym}</span>
                <span style={{ marginLeft: 12, color: 'var(--text-tertiary)', fontSize: 12 }}>{stock.name}</span>
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.07em', color: 'var(--text-tertiary)' }}>{stock.sector}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CompareScreen({ symbols: initial, go }) {
  const [selected, setSelected] = cmpUseState(initial && initial.length ? initial : ['RELIANCE', 'TCS', 'INFY']);
  const [weights, setWeights] = cmpUseState(selected.map(() => 1 / selected.length));

  React.useEffect(() => {
    if (weights.length !== selected.length) {
      setWeights(selected.map(() => 1 / selected.length));
    }
  }, [selected.length]);

  return (
    <main className="column" style={{ padding: '48px 32px 80px', display: 'flex', flexDirection: 'column', gap: 56 }}>
      <div>
        <SectionLabel>COMPARE · NIFTY 50 · UP TO 5 STOCKS</SectionLabel>
        <h1 style={{
          margin: '10px 0 0', fontFamily: 'var(--font-serif)', fontWeight: 400,
          fontSize: 'var(--text-h1)', color: 'var(--text-primary)', lineHeight: 1.0,
        }}>
          Compare. <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>Allocate.</span>
        </h1>
      </div>

      <SymbolPicker selected={selected} setSelected={setSelected} />

      {selected.length >= 2 && (
        <>
          <section>
            <SectionLabel>COMPARISON TABLE · BEST IN MINT · WORST IN BRICK</SectionLabel>
            <div style={{ marginTop: 12 }}>
              <ComparisonTable symbols={selected} />
            </div>
          </section>

          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 32, alignItems: 'flex-start' }}>
            <div>
              <SectionLabel>ALLOCATION · {selected.length} POSITIONS</SectionLabel>
              <div style={{ marginTop: 14 }}>
                <AllocationBar symbols={selected} weights={weights} setWeights={setWeights} />
              </div>
            </div>
            <div>
              <SectionLabel>MONTE CARLO · 12M HORIZON · p5/p25/p50/p75/p95</SectionLabel>
              <div style={{ marginTop: 14, border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', padding: 16 }}>
                <FanChart symbols={selected} weights={weights} />
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.04em' }}>
                  <span>STARTING CAPITAL ₹10,00,000</span>
                  <span>SIMULATIONS · 10,000</span>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      <div>
        <Button variant="outline" onClick={() => go('home')}>← BACK TO STOCKS</Button>
      </div>
    </main>
  );
}

Object.assign(window, { CompareScreen });
