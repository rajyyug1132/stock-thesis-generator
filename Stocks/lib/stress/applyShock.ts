import type { SimInput } from '@/lib/sim/types';
import type { ShockSpec } from './types';

function findIdx(symbols: string[], symbol: string): number {
  let i = symbols.indexOf(symbol);
  if (i === -1) {
    const base = symbol.replace(/\.NS$/i, '');
    i = symbols.findIndex((s) => s.replace(/\.NS$/i, '') === base);
  }
  return i;
}

export function applyShockSpec(base: SimInput, spec: ShockSpec): SimInput {
  const shocked: SimInput = {
    symbols: [...base.symbols],
    initialPrices: [...base.initialPrices],
    dailyMeans: [...base.dailyMeans],
    weights: [...base.weights],
    covariance: base.covariance.map((row) => [...row]),
    horizonDays: base.horizonDays,
    numPaths: base.numPaths,
    seed: base.seed,
  };

  for (const s of spec.shocks) {
    const i = findIdx(base.symbols, s.symbol);
    if (i === -1) continue;

    if (s.initialPriceShock !== undefined) {
      const c = Math.max(-0.5, Math.min(0.5, s.initialPriceShock));
      shocked.initialPrices[i] *= 1 + c;
    }

    if (s.driftMultiplier !== undefined) {
      const c = Math.max(-2, Math.min(3, s.driftMultiplier));
      shocked.dailyMeans[i] *= c;
    }

    if (s.volMultiplier !== undefined) {
      const c = Math.max(0.5, Math.min(4, s.volMultiplier));
      shocked.covariance[i][i] *= c ** 2;
      for (let j = 0; j < shocked.symbols.length; j++) {
        if (j === i) continue;
        shocked.covariance[i][j] *= c;
        shocked.covariance[j][i] *= c;
      }
    }
  }

  for (const a of spec.correlationAdjustments ?? []) {
    const i = findIdx(base.symbols, a.pair[0]);
    const j = findIdx(base.symbols, a.pair[1]);
    if (i === -1 || j === -1 || i === j) continue;

    // Cap at 0.95 — values above this reliably produce non-PD matrices
    const rho = Math.max(-1, Math.min(0.95, a.newCorrelation));
    const si = Math.sqrt(shocked.covariance[i][i]);
    const sj = Math.sqrt(shocked.covariance[j][j]);
    const cov = rho * si * sj;
    shocked.covariance[i][j] = cov;
    shocked.covariance[j][i] = cov;
  }

  return shocked;
}
