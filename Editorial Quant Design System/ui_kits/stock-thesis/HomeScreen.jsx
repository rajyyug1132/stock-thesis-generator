/* eslint-disable */
/* HomeScreen — hero + bullish vector graph + method strip + featured stocks + sim CTA + footer.
   Mirrors Stocks/app/page.tsx. */

function HomeScreen({ go }) {
  const featured = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'TATAMOTORS', 'ICICIBANK']
    .map((s) => window.NIFTY.find((x) => x.symbol === s + '.NS'))
    .filter(Boolean);

  return (
    <main>
      {/* Hero — full-bleed bullish chart behind editorial headline */}
      <section style={{ borderBottom: '1px solid var(--border-subtle)', position: 'relative', overflow: 'hidden' }}>
        {/* Full-bleed chart, 40% opacity, acts as a data field behind type */}
        <img
          src="../../assets/hero-bullish-chart.svg"
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center',
            opacity: 0.4, pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        <div className="column" style={{ position: 'relative', zIndex: 1, padding: '96px 32px 88px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          <SectionLabel>NIFTY 50 · AI-GROUNDED THESIS ENGINE</SectionLabel>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontWeight: 400,
            fontSize: 'clamp(3rem, 7vw, 5.5rem)',
            color: 'var(--text-primary)', lineHeight: 0.95,
            maxWidth: '14ch', margin: 0,
            letterSpacing: '-0.02em',
          }}>
            Every claim<br/>
            <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>verified.</span>
          </h1>
          <p style={{
            fontFamily: 'var(--font-sans)',
            color: '#d4d4d8', fontSize: 'var(--text-body)',
            lineHeight: 1.65, margin: 0, maxWidth: 450,
          }}>
            AI-generated investment theses for Nifty 50 stocks. Two-pass grounding: Pro model writes,
            Flash model verifies every numeric claim against live data. <em style={{ fontFamily: 'var(--font-serif)', color: 'var(--accent)' }}>No vibe analysis.</em>
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, paddingTop: 8 }}>
            <Button variant="primary" onClick={() => go('compare')}>COMPARE STOCKS →</Button>
            <Button variant="outline"  onClick={() => go('stock', { symbol: 'RELIANCE' })}>SAMPLE THESIS</Button>
          </div>
        </div>
      </section>

      <MethodStrip />

      {/* Featured stocks grid */}
      <section className="column" style={{ padding: '48px 32px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
          <SectionLabel>FEATURED STOCKS · 6 OF 50</SectionLabel>
          <button onClick={() => go('compare')} style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.15em',
            textTransform: 'uppercase', color: 'var(--text-tertiary)', cursor: 'pointer',
          }}>ALL 50 →</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {featured.map((stock) => <StockCard key={stock.symbol} stock={stock} go={go} />)}
        </div>
      </section>

      {/* Portfolio simulation CTA */}
      <section className="column" style={{ padding: '32px 32px 80px' }}>
        <Panel label="PORTFOLIO SIMULATION">
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--text-body)', lineHeight: 1.65, maxWidth: '60ch' }}>
            Select 2–5 stocks on the compare page to run a correlated GBM Monte Carlo simulation.
            Drag the allocation bar to redistribute weights. Instant fan chart with p5/p25/p50/p75/p95 percentile bands.
          </p>
          <div style={{ marginTop: 16 }}>
            <button
              onClick={() => go('compare', { symbols: ['RELIANCE', 'TCS', 'INFY'] })}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 11,
                letterSpacing: '0.1em', padding: '8px 20px',
                border: '1px solid var(--border-strong)', color: 'var(--text-tertiary)',
                display: 'inline-block', textTransform: 'uppercase', cursor: 'pointer',
              }}
            >TRY WITH RELIANCE · TCS · INFY →</button>
          </div>
        </Panel>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '20px 32px' }}>
        <div className="column" style={{
          fontFamily: 'var(--font-mono)', fontSize: 'var(--text-micro)',
          color: 'var(--text-quaternary)', letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          NIFTY 50 THESIS ENGINE · DATA FROM YAHOO FINANCE · AI BY GOOGLE GEMINI · NOT FINANCIAL ADVICE
        </div>
      </footer>
    </main>
  );
}

Object.assign(window, { HomeScreen });
