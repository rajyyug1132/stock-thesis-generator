// Correlated Geometric Brownian Motion Monte Carlo simulation.
// Hot loop uses pre-allocated Float64Arrays. No allocations inside the
// per-step inner loop.

import { cholesky } from './cholesky';
import { createSeededRng, randomNormal, resetNormalCache, type Rng } from './random';
import { computeRiskMetrics } from './riskMetrics';
import type { SimInput, SimResult } from './types';

export function runSimulation(input: SimInput): SimResult {
  const t0 = performance.now();

  const {
    symbols,
    initialPrices,
    weights,
    dailyMeans,
    covariance,
    horizonDays,
    numPaths,
    seed,
  } = input;

  const n = symbols.length;
  const steps = horizonDays;
  const pathLen = steps + 1;

  if (initialPrices.length !== n) throw new Error('runSimulation: initialPrices length mismatch');
  if (weights.length !== n) throw new Error('runSimulation: weights length mismatch');
  if (dailyMeans.length !== n) throw new Error('runSimulation: dailyMeans length mismatch');
  if (covariance.length !== n) throw new Error('runSimulation: covariance row count mismatch');

  const rng: Rng | undefined = seed != null ? createSeededRng(seed) : undefined;
  if (seed != null) resetNormalCache();

  const L = cholesky(covariance);

  // Pre-allocate reusable buffers
  const z = new Float64Array(n);
  const corr = new Float64Array(n);
  const currentPrices = new Float64Array(n);

  const paths: Float64Array[] = new Array(numPaths);
  const finalValues = new Float64Array(numPaths);

  // Precompute drift = dailyMean - 0.5 * variance (GBM drift correction)
  // (Convention: dailyMeans here is interpreted as the log-return mean; we
  // apply mean directly. If the caller passes arithmetic means, omit the
  // -0.5σ² correction. We follow the spec: prices[i] *= exp(mean + shock).)
  const drift = dailyMeans;

  for (let p = 0; p < numPaths; p++) {
    const path = new Float64Array(pathLen);
    path[0] = 1; // portfolio value normalized to 1 at t=0

    for (let i = 0; i < n; i++) currentPrices[i] = initialPrices[i];

    for (let t = 1; t <= steps; t++) {
      // Independent normals
      for (let i = 0; i < n; i++) z[i] = randomNormal(rng);

      // Correlated shocks: corr = L · z  (inline; matVecLower would allocate)
      for (let i = 0; i < n; i++) {
        let s = 0;
        const Li = L[i];
        for (let j = 0; j <= i; j++) s += Li[j] * z[j];
        corr[i] = s;
      }

      // Update prices and aggregate portfolio value
      let portfolio = 0;
      for (let i = 0; i < n; i++) {
        currentPrices[i] *= Math.exp(drift[i] + corr[i]);
        portfolio += weights[i] * (currentPrices[i] / initialPrices[i]);
      }
      path[t] = portfolio;
    }

    paths[p] = path;
    finalValues[p] = path[steps];
  }

  // Mean path
  const meanPath = new Float64Array(pathLen);
  for (let t = 0; t < pathLen; t++) {
    let s = 0;
    for (let p = 0; p < numPaths; p++) s += paths[p][t];
    meanPath[t] = s / numPaths;
  }

  // Percentiles at each time step
  const p5 = new Float64Array(pathLen);
  const p25 = new Float64Array(pathLen);
  const p50 = new Float64Array(pathLen);
  const p75 = new Float64Array(pathLen);
  const p95 = new Float64Array(pathLen);
  const col = new Float64Array(numPaths);

  for (let t = 0; t < pathLen; t++) {
    for (let p = 0; p < numPaths; p++) col[p] = paths[p][t];
    col.sort();
    p5[t] = col[Math.floor(0.05 * numPaths)];
    p25[t] = col[Math.floor(0.25 * numPaths)];
    p50[t] = col[Math.floor(0.50 * numPaths)];
    p75[t] = col[Math.floor(0.75 * numPaths)];
    p95[t] = col[Math.floor(0.95 * numPaths)];
  }

  const metrics = computeRiskMetrics(finalValues, meanPath, horizonDays);
  const computeMs = performance.now() - t0;

  return {
    paths,
    finalValues,
    percentiles: { p5, p25, p50, p75, p95 },
    mean: meanPath,
    metrics,
    computeMs,
  };
}
