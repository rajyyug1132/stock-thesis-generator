import { notFound } from 'next/navigation';
import { SectionLabel } from '@/components/ui/section-label';
import { Panel } from '@/components/ui/panel';
import { Pill } from '@/components/ui/pill';
import { DataRow } from '@/components/ui/data-row';
import { Citation } from '@/components/ui/citation';
import { DirectionalNum } from '@/components/ui/directional-num';
import { RiskMetricsGrid } from '@/components/ui/risk-metrics-grid';
import { ThesisAbstract } from '@/components/ui/thesis-abstract';
import { GroundedClaim } from '@/components/ui/grounded-claim';
import { AllocationBarDemo } from './allocation-bar-demo';
import { FanChartDemo } from './fan-chart-demo';
import { PortfolioPresetsDemo } from './portfolio-presets-demo';
import type { RiskMetrics } from '@/lib/sim/types';

const MOCK_METRICS: RiskMetrics = {
  expectedReturn: 0.087,
  annualizedReturn: 0.143,
  annualizedVol: 0.21,
  sharpe: 0.49,
  var95: -0.062,
  cvar95: -0.091,
  probLoss: 0.31,
  maxDrawdown: -0.118,
};

export default function PrimitivesPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <main className="min-h-screen px-8 py-12 max-w-4xl mx-auto space-y-16">
      {/* Header */}
      <div>
        <SectionLabel>DESIGN SYSTEM · DEV</SectionLabel>
        <h1
          className="font-serif mt-2"
          style={{ fontSize: 'var(--text-h1)', color: 'var(--text-primary)', lineHeight: 1.1 }}
        >
          Primitives showcase
        </h1>
        <p className="mt-4 max-w-prose" style={{ color: 'var(--text-secondary)' }}>
          Editorial-quant building blocks. Type pairing, density, color discipline, citation tooltips.
        </p>
      </div>

      {/* Type scale */}
      <section className="space-y-4">
        <SectionLabel>TYPE</SectionLabel>
        <div className="font-serif" style={{ fontSize: 'var(--text-display)', lineHeight: 1 }}>
          RELIANCE
        </div>
        <div className="font-serif italic" style={{ fontSize: 'var(--text-h2)', color: 'var(--text-secondary)' }}>
          A sober equity analyst writing a structured thesis.
        </div>
        <div style={{ fontSize: 'var(--text-body)' }}>
          Body sans · Geist. Designed for scan-ability over personality.
        </div>
        <div className="num" style={{ fontSize: 'var(--text-h3)', color: 'var(--accent)' }}>
          24.3 · 1,354.50 · 0.0001 · ₹2.45T
        </div>
      </section>

      {/* SectionLabel */}
      <section className="space-y-3">
        <SectionLabel>SECTION LABEL</SectionLabel>
        <div className="space-y-2">
          <SectionLabel>SUMMARY</SectionLabel>
          <SectionLabel>BULL CASE · 5 POINTS</SectionLabel>
          <SectionLabel>GROUNDING SCORE · 0.73</SectionLabel>
        </div>
      </section>

      {/* Pill */}
      <section className="space-y-4">
        <SectionLabel>PILL</SectionLabel>
        <div className="flex flex-wrap gap-3">
          <Pill>NIFTY 50</Pill>
          <Pill variant="up">+12.4%</Pill>
          <Pill variant="down">-8.7%</Pill>
          <Pill variant="accent">UNVERIFIED</Pill>
          <Pill>OIL_GAS</Pill>
          <Pill variant="up">GROUNDED</Pill>
          <Pill variant="down">HIGH RISK</Pill>
        </div>
      </section>

      {/* DirectionalNum */}
      <section className="space-y-4">
        <SectionLabel>DIRECTIONAL NUM</SectionLabel>
        <div className="flex flex-wrap gap-6" style={{ fontSize: 'var(--text-h3)' }}>
          <DirectionalNum value={0.124} showTriangle />
          <DirectionalNum value={-0.087} showTriangle />
          <DirectionalNum value={0} showTriangle />
          <DirectionalNum value={1354.5} format="currency" showSign={false} />
          <DirectionalNum value={-0.643} format="num" decimals={3} />
        </div>
      </section>

      {/* Citation */}
      <section className="space-y-4">
        <SectionLabel>CITATION</SectionLabel>
        <p style={{ color: 'var(--text-primary)', fontSize: 'var(--text-body)', lineHeight: 1.6 }}>
          Reliance trades at P/E 24.3, below its 5-year average
          <Citation
            n={1}
            tone="unverified"
            reason="5Y average not available in provided JSON. This is an unverifiable historical comparison; should be removed or sourced."
          />
          and offers ROE of 8.7% with declining debt
          <Citation
            n={2}
            tone="grounded"
            reason="ROE 0.087 and D/E 0.367 both present in source fundamentals. Verified."
          />
          . Hover the superscript markers to read the validation reason.
        </p>
      </section>

      {/* DataRow */}
      <section className="space-y-3">
        <SectionLabel>DATA ROW</SectionLabel>
        <div className="max-w-md">
          <DataRow label="Current Price" value="1,354.50" unit="INR" />
          <DataRow label="P/E Ratio" value="22.68" />
          <DataRow label="ROE" value="9.14%" />
          <DataRow label="Debt / Equity" value="0.37" />
          <DataRow label="Annual Volatility" value="20.02%" />
          <DataRow label="Sharpe" value="-0.64" divider={false} />
        </div>
      </section>

      {/* Panel */}
      <section className="space-y-6">
        <SectionLabel>PANEL</SectionLabel>
        <Panel label="BULL CASE">
          <p style={{ color: 'var(--text-primary)', lineHeight: 1.6 }}>
            Trades below sum-of-parts intrinsic value with retail digitization tailwinds intact.
            Cash-flow cushion permits the New Energy capex without compromising payouts.
          </p>
          <div className="mt-4 flex gap-2">
            <Pill variant="up">VERIFIED · 5/5</Pill>
            <Pill>EVIDENCE</Pill>
          </div>
        </Panel>

        <Panel label="SIM PARAMS">
          <DataRow label="Horizon" value="63" unit="days" />
          <DataRow label="Paths" value="10,000" />
          <DataRow label="Model" value="Correlated GBM" />
          <DataRow label="Compute" value="261" unit="ms" divider={false} />
        </Panel>

        <Panel>
          <p style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-small)' }}>
            Panel without label — for less prominent content blocks.
          </p>
        </Panel>
      </section>

      {/* Color tokens */}
      <section className="space-y-4">
        <SectionLabel>COLOR PALETTE</SectionLabel>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {[
            ['canvas', 'var(--bg-canvas)'],
            ['elevated', 'var(--bg-elevated)'],
            ['card', 'var(--bg-card)'],
            ['input', 'var(--bg-input)'],
            ['border-subtle', 'var(--border-subtle)'],
            ['border-strong', 'var(--border-strong)'],
            ['primary', 'var(--text-primary)'],
            ['secondary', 'var(--text-secondary)'],
            ['tertiary', 'var(--text-tertiary)'],
            ['accent', 'var(--accent)'],
            ['up', 'var(--up)'],
            ['down', 'var(--down)'],
          ].map(([name, val]) => (
            <div key={name} className="text-center">
              <div
                className="w-full h-12 border"
                style={{ background: val, borderColor: 'var(--border-subtle)' }}
              />
              <div
                className="mt-1 font-mono"
                style={{ fontSize: 'var(--text-micro)', color: 'var(--text-tertiary)' }}
              >
                {name}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── SIGNATURE COMPONENTS (Phase D) ─── */}

      {/* AllocationBar */}
      <section className="space-y-4">
        <SectionLabel>ALLOCATION BAR · DRAG TO REDISTRIBUTE</SectionLabel>
        <AllocationBarDemo />
      </section>

      {/* FanChart */}
      <section className="space-y-4">
        <SectionLabel>FAN CHART · MONTE CARLO PERCENTILE BANDS</SectionLabel>
        <FanChartDemo />
      </section>

      {/* PortfolioPresets */}
      <section className="space-y-4">
        <SectionLabel>PORTFOLIO PRESETS</SectionLabel>
        <PortfolioPresetsDemo />
      </section>

      {/* RiskMetricsGrid */}
      <section className="space-y-4">
        <SectionLabel>RISK METRICS GRID · BLOOMBERG-STYLE · 8 CELLS</SectionLabel>
        <RiskMetricsGrid metrics={MOCK_METRICS} />
      </section>

      {/* ThesisAbstract */}
      <section className="space-y-4">
        <SectionLabel>THESIS ABSTRACT</SectionLabel>
        <ThesisAbstract
          symbol="RELIANCE.NS"
          generatedAt="2026-05-25T09:00:00Z"
          groundingScore={0.87}
          summary="Reliance Industries trades at a P/E of 22.7 with ROE of 9.1%, underpinned by cash-generative Jio and Retail segments. New Energy capex cycle introduces medium-term dilution risk, but sum-of-parts valuation suggests 12–18% upside from current levels assuming no macro shock. The bear case hinges on regulatory tightening in telecom and a slower-than-projected green hydrogen ramp."
        />
      </section>

      {/* GroundedClaim */}
      <section className="space-y-4">
        <SectionLabel>GROUNDED CLAIM · BULL / BEAR POINTS</SectionLabel>
        <Panel label="BULL CASE · SAMPLE">
          <ul className="space-y-4">
            <GroundedClaim
              citationN={1}
              verified
              claim="Jio segment delivers stable recurring cash flows, reducing portfolio-level volatility."
              evidence="annualVol 20.02%, Sharpe -0.64 — lower vol than sector median despite scale."
              verificationReason="Annual vol 0.2002 present in returns data. Sharpe -0.64 matches computed metric."
            />
            <GroundedClaim
              citationN={2}
              verified={false}
              claim="Trades at a 14% discount to its 5-year average P/E of 26.4."
              evidence="Current P/E 22.68 — historical 5Y average not available in source data."
              verificationReason="5-year average P/E not present in source JSON. Historical comparison cannot be verified."
            />
          </ul>
        </Panel>
      </section>

      {/* Footer */}
      <footer
        className="font-mono pt-8"
        style={{
          fontSize: 'var(--text-micro)',
          color: 'var(--text-quaternary)',
          letterSpacing: '0.1em',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        DEV · PHASE D · SIGNATURE COMPONENTS · NOT FOR PRODUCTION
      </footer>
    </main>
  );
}
