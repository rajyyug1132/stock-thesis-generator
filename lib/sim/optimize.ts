/**
 * Markowitz portfolio optimization — three targets:
 * 1. maxSharpe   — maximize (μ - rf) / σ (tangency portfolio)
 * 2. minVol      — minimize portfolio variance (global minimum variance)
 * 3. equalRisk   — Equal Risk Contribution (ERC / Risk Parity)
 *
 * All solutions are long-only (no short selling).
 * Uses projected gradient descent — no external solver library needed.
 */

import { normalizeWeights, minVariance } from './portfolio';

const RISK_FREE_RATE_DAILY = 0.07 / 252; // 7% annualized → daily

/** Compute portfolio variance: w' Σ w */
function portfolioVariance(w: number[], cov: number[][]): number {
  const n = w.length;
  let v = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      v += w[i] * cov[i][j] * w[j];
    }
  }
  return v;
}

/** Compute portfolio expected daily return: w' μ */
function portfolioReturn(w: number[], means: number[]): number {
  let r = 0;
  for (let i = 0; i < means.length; i++) r += w[i] * means[i];
  return r;
}

/** Project onto the probability simplex: Σw_i = 1, w_i >= 0 */
function projectSimplex(v: number[]): number[] {
  const n = v.length;
  const sorted = [...v].sort((a, b) => b - a);
  let tau = 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += sorted[i];
    const t = (sum - 1) / (i + 1);
    if (t >= sorted[i + 1] || i === n - 1) {
      tau = t;
      break;
    }
  }
  return v.map((x) => Math.max(x - tau, 0));
}

/**
 * Maximize Sharpe ratio via projected gradient ascent on (μ - rf) / σ.
 * Uses Frank-Wolfe style projected gradient with line search.
 */
export function maxSharpe(means: number[], cov: number[][]): number[] {
  const n = means.length;
  if (n === 0) return [];
  if (n === 1) return [1];

  // Start from equal weight
  let w = Array(n).fill(1 / n);

  const LR = 0.01;
  const ITERATIONS = 2000;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    const mu = portfolioReturn(w, means);
    const sigma2 = portfolioVariance(w, cov);
    const sigma = Math.sqrt(Math.max(sigma2, 1e-12));

    // Sharpe gradient: ∂Sharpe/∂w_i = (μ_i - rf) / σ - (μ - rf) * (Σ w)_i / σ³
    const covW = Array.from({ length: n }, (_, i) => {
      let s = 0;
      for (let j = 0; j < n; j++) s += cov[i][j] * w[j];
      return s;
    });

    const excess = mu - RISK_FREE_RATE_DAILY;
    const grad = Array.from({ length: n }, (_, i) =>
      (means[i] - RISK_FREE_RATE_DAILY) / sigma - (excess * covW[i]) / (sigma2 * sigma)
    );

    // Gradient ascent step
    const wNew = w.map((wi, i) => wi + LR * grad[i]);

    // Project onto simplex
    w = projectSimplex(wNew);

    // Convergence check
    const delta = Math.max(...w.map((wi, i) => Math.abs(wi - wNew[i])));
    if (delta < 1e-8 && iter > 100) break;
  }

  return normalizeWeights(w);
}

/**
 * Equal Risk Contribution (Risk Parity).
 * Each asset contributes equally to total portfolio risk.
 * Uses iterative Newton-like updates.
 */
export function equalRiskContribution(cov: number[][]): number[] {
  const n = cov.length;
  if (n === 0) return [];
  if (n === 1) return [1];

  let w = Array(n).fill(1 / n);
  const TARGET_CONTRIBUTION = 1 / n;

  const ITERATIONS = 2000;
  const LR = 0.3;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    const sigma2 = portfolioVariance(w, cov);
    const sigma = Math.sqrt(Math.max(sigma2, 1e-12));

    // Marginal risk contribution: (Σ w)_i / σ
    const mrc = Array.from({ length: n }, (_, i) => {
      let s = 0;
      for (let j = 0; j < n; j++) s += cov[i][j] * w[j];
      return s / sigma;
    });

    // Risk contribution: w_i * mrc_i / σ
    const rc = mrc.map((m, i) => w[i] * m);
    const totalRisk = rc.reduce((s, x) => s + x, 0);

    // Update: increase weight of under-contributors, decrease over-contributors
    let converged = true;
    const wNew = w.map((wi, i) => {
      const actual = rc[i] / (totalRisk + 1e-12);
      const update = LR * (TARGET_CONTRIBUTION - actual) * wi;
      if (Math.abs(update) > 1e-8) converged = false;
      return Math.max(wi + update, 1e-6);
    });

    w = normalizeWeights(wNew);
    if (converged && iter > 50) break;
  }

  return normalizeWeights(w);
}

/**
 * Public API — optimize weights for a given target strategy.
 */
export function optimizeWeights(
  means: number[],
  cov: number[][],
  target: 'maxSharpe' | 'minVol' | 'equalRisk'
): number[] {
  try {
    if (target === 'maxSharpe') return maxSharpe(means, cov);
    if (target === 'equalRisk') return equalRiskContribution(cov);
    return minVariance(cov);
  } catch {
    // Fallback to equal weight if optimization fails (singular matrix etc.)
    return Array(means.length).fill(1 / means.length);
  }
}
