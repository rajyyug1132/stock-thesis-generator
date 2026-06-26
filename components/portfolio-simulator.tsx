'use client';

import { useCallback, useEffect, useState } from 'react';
import { AllocationBar } from '@/components/ui/allocation-bar';
import { PortfolioPresets, type PresetName } from '@/components/ui/portfolio-presets';
import { FanChart } from '@/components/ui/fan-chart';
import { RiskMetricsGrid } from '@/components/ui/risk-metrics-grid';
import { SectionLabel } from '@/components/ui/section-label';
import { Panel } from '@/components/ui/panel';
import { DataRow } from '@/components/ui/data-row';
import { useSimulation } from '@/hooks/use-simulation';
import { useStressSim } from '@/hooks/use-stress-sim';
import { StressInput } from '@/components/stress/stress-input';
import { DualFanChart } from '@/components/stress/dual-fan-chart';
import { DualRiskMetrics } from '@/components/stress/dual-risk-metrics';
import { ShockRationale } from '@/components/stress/shock-rationale';
import { equalWeight, minVariance } from '@/lib/sim/portfolio';
import { track } from '@/lib/analytics';
import { useUser } from '@/hooks/use-user';
import type { SimInput } from '@/lib/sim/types';

interface PortfolioSimulatorProps {
  symbols: string[];
  initialPrices: number[];
  dailyMeans: number[];
  covariance: number[][];
  horizonDays?: number;
  numPaths?: number;
}

const HORIZON_OPTIONS = [
  { label: '1M', days: 21 },
  { label: '3M', days: 63 },
  { label: '6M', days: 126 },
  { label: '1Y', days: 252 },
];

export function PortfolioSimulator({
  symbols,
  initialPrices,
  dailyMeans,
  covariance,
  horizonDays: defaultHorizon = 63,
  numPaths = 5000,
}: PortfolioSimulatorProps) {
  const { isPaid, showUpgrade } = useUser();
  const [preset, setPreset] = useState<PresetName>('equal');
  const [weights, setWeights] = useState<number[]>(() => equalWeight(symbols.length));
  const [horizon, setHorizon] = useState(defaultHorizon);
  const { result, loading, error, run } = useSimulation();
  const [currentInput, setCurrentInput] = useState<SimInput | null>(null);
  const { shockResult, shockSpec, loading: stressLoading, error: stressError, runStress, clearStress } = useStressSim(currentInput);

  function handlePreset(p: PresetName) {
    setPreset(p);
    if (p === 'equal') setWeights(equalWeight(symbols.length));
    if (p === 'minvar') {
      try {
        setWeights(minVariance(covariance));
      } catch {
        setWeights(equalWeight(symbols.length));
      }
    }
  }

  function handleDrag(w: number[]) {
    setWeights(w);
    setPreset('custom');
  }

  const runSim = useCallback(() => {
    const input: SimInput = {
      symbols,
      initialPrices,
      weights,
      dailyMeans,
      covariance,
      horizonDays: horizon,
      numPaths,
    };
    setCurrentInput(input);
    clearStress();
    run(input);
  }, [symbols, initialPrices, weights, dailyMeans, covariance, horizon, numPaths, run, clearStress]);

  // Auto-run on first mount — paid only (free users see the upgrade gate below)
  useEffect(() => { if (isPaid) runSim(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Paywall: portfolio simulation is a Pro feature ──────────────────────────
  if (!isPaid) {
    return (
      <div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-body)', lineHeight: 1.6, margin: '0 0 16px' }}>
          The portfolio simulator — correlated Monte Carlo with fan charts and risk metrics — is a{' '}
          <strong style={{ color: 'var(--accent)' }}>Pro</strong> feature.
        </p>
        <button type="button" onClick={() => showUpgrade('portfolio_sim')} className="btn btn-primary">
          UPGRADE TO PRO
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PortfolioPresets active={preset} onSelect={handlePreset} />
        <div className="flex items-center gap-2">
          {HORIZON_OPTIONS.map(({ label, days }) => (
            <button
              key={label}
              onClick={() => setHorizon(days)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-micro)',
                letterSpacing: '0.08em',
                padding: '2px 8px',
                color: horizon === days ? 'var(--accent)' : 'var(--text-tertiary)',
                borderBottom: horizon === days ? '1px solid var(--accent)' : '1px solid transparent',
                transition: 'color 0.15s',
              }}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => { track('sim_run', { preset, horizon, symbols: symbols.length }); runSim(); }}
            disabled={loading}
            style={{
              marginLeft: '0.75rem',
              background: loading ? 'var(--bg-input)' : 'var(--accent)',
              border: 'none',
              cursor: loading ? 'wait' : 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-micro)',
              letterSpacing: '0.1em',
              padding: '4px 16px',
              color: loading ? 'var(--text-tertiary)' : 'var(--bg-canvas)',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'RUNNING…' : 'RUN SIM'}
          </button>
        </div>
      </div>

      {/* Allocation bar */}
      <AllocationBar symbols={symbols} weights={weights} onChange={handleDrag} />

      {/* Params summary */}
      <Panel label="SIM PARAMS">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6">
          <DataRow label="Horizon" value={String(horizon)} unit="days" divider={false} />
          <DataRow label="Paths" value={numPaths.toLocaleString()} divider={false} />
          <DataRow label="Model" value="Corr. GBM" divider={false} />
          {result && (
            <DataRow label="Compute" value={String(result.computeMs)} unit="ms" divider={false} />
          )}
        </div>
      </Panel>

      {/* Error */}
      {error && (
        <div
          className="font-mono"
          style={{ color: 'var(--down)', fontSize: 'var(--text-small)', padding: '0.5rem 0' }}
        >
          ⚠ {error}
        </div>
      )}

      {/* Fan chart */}
      {(result || loading) && (
        <div>
          <SectionLabel>SIMULATION · {numPaths.toLocaleString()} PATHS · {horizon}D HORIZON</SectionLabel>
          <div className="mt-3" style={{ opacity: loading ? 0.4 : 1, transition: 'opacity 0.2s' }}>
            {result ? (
              <FanChart
                percentiles={result.percentiles}
                mean={result.mean}
                height={240}
              />
            ) : (
              <div
                style={{
                  height: 240,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-micro)',
                  color: 'var(--text-quaternary)',
                  letterSpacing: '0.1em',
                }}
              >
                COMPUTING…
              </div>
            )}
          </div>
        </div>
      )}

      {/* Risk metrics */}
      {result && (
        <div>
          <SectionLabel>RISK METRICS · {horizon}D HORIZON</SectionLabel>
          <div className="mt-3">
            <RiskMetricsGrid metrics={result.metrics} />
          </div>
        </div>
      )}

      {/* Stress testing */}
      {result && (
        <>
          <StressInput
            onSubmit={runStress}
            onClear={clearStress}
            active={!!shockSpec}
            loading={stressLoading}
          />

          {stressError && (
            <div
              className="font-mono"
              style={{ color: 'var(--down)', fontSize: 'var(--text-small)', padding: '0.5rem 0' }}
            >
              ⚠ {stressError}
            </div>
          )}

          {shockSpec && (
            <div className="space-y-5" style={{ marginTop: '1.5rem' }}>
              <ShockRationale spec={shockSpec} />

              <div>
                <SectionLabel>
                  DUAL SIMULATION · BASE (MINT) vs SHOCK (RUST) · {horizon}D
                </SectionLabel>
                <div className="mt-3" style={{ opacity: stressLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                  <DualFanChart base={result} shock={shockResult} height={240} />
                </div>
              </div>

              <div>
                <SectionLabel>RISK COMPARISON · BASE vs SHOCK</SectionLabel>
                <div className="mt-3">
                  <DualRiskMetrics base={result.metrics} shock={shockResult?.metrics ?? null} />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
