import Link from 'next/link';
import { SectionLabel } from '@/components/ui/section-label';
import { Panel } from '@/components/ui/panel';
import { NIFTY_50 } from '@/lib/data/nifty50';
import { StockCard } from '@/components/stock-card';

const FEATURED = ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'TATAMOTORS.NS', 'ICICIBANK.NS'];

export default function Home() {
  const featured = FEATURED.map((sym) => NIFTY_50.find((s) => s.symbol === sym)).filter(Boolean) as typeof NIFTY_50;

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-canvas)' }}>

      {/* Hero */}
      <div
        className="border-b"
        style={{ borderColor: 'var(--border-subtle)', padding: '5rem 2rem 4rem' }}
      >
        <div className="max-w-4xl mx-auto space-y-6">
          <SectionLabel>NIFTY 50 · AI-GROUNDED THESIS ENGINE</SectionLabel>
          <h1
            className="font-serif"
            style={{
              fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
              color: 'var(--text-primary)',
              lineHeight: 1.0,
              maxWidth: '18ch',
            }}
          >
            Every claim
            <br />
            <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>verified.</span>
          </h1>
          <p
            className="max-w-prose"
            style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-body)', lineHeight: 1.65 }}
          >
            AI-generated investment theses for Nifty 50 stocks. Two-pass grounding:
            Pro model writes, Flash model verifies every numeric claim against live data.
            No vibe analysis.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href="/compare"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-small)',
                letterSpacing: '0.1em',
                padding: '0.625rem 1.5rem',
                background: 'var(--accent)',
                color: 'var(--bg-canvas)',
                textDecoration: 'none',
                transition: 'opacity 0.15s',
              }}
              className="hover:opacity-80"
            >
              COMPARE STOCKS →
            </Link>
            <Link
              href="/stock/RELIANCE"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-small)',
                letterSpacing: '0.1em',
                padding: '0.625rem 1.5rem',
                border: '1px solid var(--border-strong)',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                transition: 'color 0.15s, border-color 0.15s',
              }}
              className="hover:opacity-80"
            >
              SAMPLE THESIS
            </Link>
          </div>
        </div>
      </div>

      {/* Method strip */}
      <div
        className="border-b"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
      >
        <div className="max-w-4xl mx-auto px-8 py-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { n: '01', label: 'LIVE DATA', desc: 'Yahoo Finance prices, fundamentals, and news fetched at request time.' },
            { n: '02', label: 'GEMINI PRO THESIS', desc: 'Structured JSON output: summary, bull case, bear case, risks, catalysts.' },
            { n: '03', label: 'FLASH VALIDATION', desc: 'Every evidence field checked against source. Grounded vs unverified — shown inline.' },
          ].map(({ n, label, desc }) => (
            <div key={n} className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className="num"
                  style={{ fontSize: 'var(--text-micro)', color: 'var(--accent)', letterSpacing: '0.1em' }}
                >
                  {n}
                </span>
                <SectionLabel>{label}</SectionLabel>
              </div>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-small)', lineHeight: 1.55 }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Featured stocks */}
      <div className="max-w-4xl mx-auto px-8 py-12 space-y-6">
        <SectionLabel>FEATURED STOCKS</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {featured.map((stock) => (
            <StockCard key={stock.symbol} stock={stock} />
          ))}
        </div>
      </div>

      {/* Portfolio simulation CTA */}
      <div className="max-w-4xl mx-auto px-8 pb-16">
        <Panel label="PORTFOLIO SIMULATION">
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-body)', lineHeight: 1.6 }}>
            Select 2–5 stocks on the compare page to run a correlated GBM Monte Carlo simulation.
            Drag the allocation bar to redistribute weights. Instant fan chart with p5/p25/p50/p75/p95 percentile bands.
          </p>
          <div className="mt-4">
            <Link
              href="/compare?symbols=RELIANCE,TCS,INFY"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-micro)',
                letterSpacing: '0.1em',
                padding: '0.5rem 1.25rem',
                border: '1px solid var(--border-strong)',
                color: 'var(--text-tertiary)',
                textDecoration: 'none',
                display: 'inline-block',
              }}
              className="hover:opacity-80"
            >
              TRY WITH RELIANCE · TCS · INFY →
            </Link>
          </div>
        </Panel>
      </div>

      {/* Footer */}
      <footer
        className="border-t"
        style={{ borderColor: 'var(--border-subtle)', padding: '1.5rem 2rem' }}
      >
        <div
          className="max-w-4xl mx-auto font-mono"
          style={{ fontSize: 'var(--text-micro)', color: 'var(--text-quaternary)', letterSpacing: '0.1em' }}
        >
          NIFTY 50 THESIS ENGINE · DATA FROM YAHOO FINANCE · AI BY GOOGLE GEMINI · NOT FINANCIAL ADVICE
        </div>
      </footer>

    </main>
  );
}
