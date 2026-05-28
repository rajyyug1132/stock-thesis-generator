import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';
import { MethodStrip } from '@/components/Header';
import { SectionLabel } from '@/components/ui/section-label';
import { Panel } from '@/components/ui/panel';
import { StockGrid } from '@/components/stock-grid';
import { StockGridSkeleton } from '@/components/stock-grid-skeleton';

// ISR: revalidate every hour
export const revalidate = 3600;

export default function Home() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-canvas)' }}>

      {/* Hero — full-bleed bullish chart behind editorial headline */}
      <div
        className="border-b"
        style={{ borderColor: 'var(--border-subtle)', position: 'relative', overflow: 'hidden' }}
      >
        {/* Full-bleed chart acts as a data field behind the type */}
        <Image
          src="/assets/hero-bullish-chart.svg"
          alt="Nifty 50 price trend — bullish upward trajectory"
          fill
          priority
          style={{
            objectFit: 'cover',
            objectPosition: 'center',
            opacity: 0.4,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        <div
          className="column"
          style={{ position: 'relative', zIndex: 1, padding: '96px 32px 88px', display: 'flex', flexDirection: 'column', gap: 22 }}
        >
          <SectionLabel>NIFTY 50 · AI-GROUNDED THESIS ENGINE</SectionLabel>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 400,
              fontSize: 'clamp(3rem, 7vw, 5.5rem)',
              color: 'var(--text-primary)',
              lineHeight: 0.95,
              maxWidth: '14ch',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Every claim<br />
            <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>verified.</span>
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              color: 'var(--text-secondary)',
              fontSize: 'var(--text-body)',
              lineHeight: 1.65,
              margin: 0,
              maxWidth: 450,
            }}
          >
            AI-generated investment theses for Nifty 50 stocks. Two-pass grounding: Gemini Pro writes
            the thesis, Gemini Flash verifies every numeric claim against live data.{' '}
            <em style={{ fontFamily: 'var(--font-serif)', color: 'var(--accent)' }}>No vibe analysis.</em>
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, paddingTop: 8 }}>
            <Link
              href="/compare"
              className="btn btn-primary"
            >
              COMPARE STOCKS →
            </Link>
            <Link
              href="/stock/RELIANCE"
              className="btn btn-outline"
            >
              SAMPLE THESIS
            </Link>
          </div>
        </div>
      </div>

      <MethodStrip />

      {/* Featured stocks grid */}
      <section className="column" style={{ padding: '48px 32px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
          <SectionLabel>FEATURED STOCKS · 6 OF 50</SectionLabel>
          <Link
            href="/compare"
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.15em',
              textTransform: 'uppercase', color: 'var(--text-tertiary)',
            }}
          >
            ALL 50 →
          </Link>
        </div>
        <Suspense fallback={<StockGridSkeleton />}>
          <StockGrid />
        </Suspense>
      </section>

      {/* Portfolio simulation CTA */}
      <section className="column" style={{ padding: '32px 32px 80px' }}>
        <Panel label="PORTFOLIO SIMULATION">
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--text-body)', lineHeight: 1.65, maxWidth: '60ch' }}>
            Select 2–5 stocks on the compare page to run a correlated GBM Monte Carlo simulation.
            Drag the allocation bar to redistribute weights. Instant fan chart with p5/p25/p50/p75/p95 percentile bands.
          </p>
          <div style={{ marginTop: 16 }}>
            <Link
              href="/compare?symbols=RELIANCE,TCS,INFY"
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 11,
                letterSpacing: '0.1em', padding: '8px 20px',
                border: '1px solid var(--border-strong)', color: 'var(--text-tertiary)',
                display: 'inline-block', textTransform: 'uppercase',
              }}
            >
              TRY WITH RELIANCE · TCS · INFY →
            </Link>
          </div>
        </Panel>
      </section>

      {/* Footer */}
      <footer
        className="border-t"
        style={{ borderColor: 'var(--border-subtle)', padding: '20px 32px' }}
      >
        <div
          className="column num"
          style={{ fontSize: 'var(--text-micro)', color: 'var(--text-quaternary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}
        >
          NIFTY 50 THESIS ENGINE · DATA FROM YAHOO FINANCE · AI BY GOOGLE GEMINI · NOT FINANCIAL ADVICE
        </div>
      </footer>

    </main>
  );
}
