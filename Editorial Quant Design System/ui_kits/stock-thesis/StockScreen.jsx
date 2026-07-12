/* eslint-disable */
/* StockScreen — Reliance detail page.
   Mirrors Stocks/app/stock/[symbol]/page.tsx. */

function StockScreen({ symbol, go }) {
  const sym = (symbol || 'RELIANCE').toUpperCase();
  const closes = window.PRICES[sym] || window.PRICES.RELIANCE;
  const fund   = window.FUNDAMENTALS[sym] || window.FUNDAMENTALS.RELIANCE;
  const thesis = window.THESIS;
  const high1Y = Math.max(...closes);
  const annualReturn = (closes[closes.length - 1] - closes[0]) / closes[0];

  const SEVERITY = { low: 'default', medium: 'unverified', high: 'down' };
  const IMPACT_GLYPH  = { positive: '▲', negative: '▼', mixed: '·' };
  const IMPACT_COLOR = { positive: 'var(--up)', negative: 'var(--down)', mixed: 'var(--text-tertiary)' };

  return (
    <main className="column" style={{ padding: '48px 32px 80px', display: 'flex', flexDirection: 'column', gap: 56 }}>

      {/* Header — symbol + price + return */}
      <div>
        <SectionLabel>{sym} · NIFTY 50 · CACHED · GENERATED 14 MAY 2026</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 18, marginTop: 10 }}>
          <h1 style={{
            margin: 0, fontFamily: 'var(--font-serif)', fontWeight: 400,
            fontSize: 'var(--text-h1)', color: 'var(--text-primary)', lineHeight: 1.0,
          }}>{sym}</h1>
          <span className="num" style={{ fontSize: 'var(--text-h2)', color: 'var(--text-primary)' }}>
            ₹{fund.currentPrice.toFixed(2)}
          </span>
          <DirectionalNum value={annualReturn} format="pct" decimals={1} showTriangle />
          <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-small)' }}>1Y</span>
        </div>
      </div>

      {/* Fundamentals + Chart side-by-side */}
      <section style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 40, alignItems: 'flex-start' }}>
        <div>
          <SectionLabel>FUNDAMENTALS</SectionLabel>
          <div style={{ marginTop: 12 }}>
            <DataRow label="P/E Ratio"          value={fund.peRatio.toFixed(1)} />
            <DataRow label="ROE"                value={(fund.roe * 100).toFixed(1) + '%'} />
            <DataRow label="Debt / Equity"      value={fund.debtToEquity.toFixed(2)} />
            <DataRow label="Annual Volatility"  value={(fund.annualVol * 100).toFixed(1) + '%'} />
            <DataRow label="Sharpe"             value={<DirectionalNum value={fund.sharpe} format="num" decimals={2} showSign showTriangle />} />
            <DataRow label="1Y High"            value={`₹${high1Y.toFixed(0)}`} divider={false} />
          </div>
        </div>
        <div>
          <SectionLabel>1-YEAR PRICE · WEEKLY CLOSE</SectionLabel>
          <div style={{ marginTop: 12, border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', padding: 16 }}>
            <PriceChart data={closes} height={240} width={640} />
          </div>
        </div>
      </section>

      {/* Abstract */}
      <section>
        <SectionLabel>ABSTRACT · {sym} · 14 MAY 2026 · GROUNDING {Math.round(thesis.groundingScore * 100)}%</SectionLabel>
        <blockquote style={{
          margin: '12px 0 0', padding: '0 0 0 22px',
          borderLeft: '2px solid var(--accent)',
          fontFamily: 'var(--font-serif)', fontStyle: 'italic',
          fontSize: '1.2rem', lineHeight: 1.75, color: 'var(--text-primary)',
          maxWidth: '62ch',
        }}>
          {thesis.summary}
        </blockquote>
      </section>

      {/* Bull / Bear */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <Panel label={`BULL CASE · ${thesis.bullCase.points.length} POINTS`}>
          <p style={{ margin: '0 0 18px', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 'var(--text-body)', color: 'var(--up)', lineHeight: 1.5 }}>
            {thesis.bullCase.headline}
          </p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {thesis.bullCase.points.map((p, i) => (
              <GroundedClaim key={i} citationN={i + 1} claim={p.claim} evidence={p.evidence} verified={p.verified} reason={p.reason} />
            ))}
          </ul>
        </Panel>

        <Panel label={`BEAR CASE · ${thesis.bearCase.points.length} POINTS`}>
          <p style={{ margin: '0 0 18px', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 'var(--text-body)', color: 'var(--down)', lineHeight: 1.5 }}>
            {thesis.bearCase.headline}
          </p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {thesis.bearCase.points.map((p, i) => (
              <GroundedClaim key={i} citationN={thesis.bullCase.points.length + i + 1} claim={p.claim} evidence={p.evidence} verified={p.verified} reason={p.reason} />
            ))}
          </ul>
        </Panel>
      </section>

      {/* Risks */}
      <section>
        <SectionLabel>RISKS · {thesis.risks.length}</SectionLabel>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {thesis.risks.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Pill variant={SEVERITY[r.severity]}>{r.severity}</Pill>
              <span style={{ color: 'var(--text-primary)', fontSize: 'var(--text-body)' }}>{r.risk}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Catalysts */}
      <section>
        <SectionLabel>CATALYSTS · {thesis.catalysts.length}</SectionLabel>
        <div style={{ marginTop: 12, maxWidth: 520 }}>
          {thesis.catalysts.map((c, i) => (
            <DataRow
              key={i}
              divider={i < thesis.catalysts.length - 1}
              label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: IMPACT_COLOR[c.impact] }}>{IMPACT_GLYPH[c.impact]}</span>
                {c.event}
              </span>}
              value={c.timeframe}
            />
          ))}
        </div>
      </section>

      {/* Grounding footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)', paddingTop: 18,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 'var(--text-micro)',
          color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>GROUNDING SCORE</span>
        <span className="num" style={{ fontSize: 'var(--text-body)', color: 'var(--accent)' }}>
          {Math.round(thesis.groundingScore * 100)}% verified
        </span>
      </footer>

      <div>
        <Button variant="outline" onClick={() => go('home')}>← BACK TO STOCKS</Button>
      </div>
    </main>
  );
}

Object.assign(window, { StockScreen });
