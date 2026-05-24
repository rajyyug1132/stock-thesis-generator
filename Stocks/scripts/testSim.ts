// Phase A acceptance: pure math correctness + performance budget.
// Run with: npx tsx scripts/testSim.ts

import { runSimulation } from '@/lib/sim/monteCarlo';
import { cholesky } from '@/lib/sim/cholesky';
import { minVariance, equalWeight, normalizeWeights, invertMatrix } from '@/lib/sim/portfolio';
import { covarianceMatrix } from '@/lib/data/returns';

let pass = 0;
let fail = 0;

function assert(cond: boolean, msg: string): void {
  if (cond) {
    pass++;
    console.log('  ✓', msg);
  } else {
    fail++;
    console.log('  ✗ FAIL:', msg);
  }
}

console.log('\n=== Phase A: math layer acceptance ===\n');

// ─── 1. Cholesky inverse property: L · Lᵀ ≈ Σ ─────────────────────────
console.log('[1] Cholesky inverse property');
const Σ = [[0.04, 0.02], [0.02, 0.03]];
const L = cholesky(Σ);
const reconstruct = [
  [L[0][0] ** 2, L[0][0] * L[1][0]],
  [L[0][0] * L[1][0], L[1][0] ** 2 + L[1][1] ** 2],
];
assert(Math.abs(reconstruct[0][0] - 0.04) < 1e-10, `Σ[0][0]=${reconstruct[0][0].toFixed(6)} ≈ 0.04`);
assert(Math.abs(reconstruct[1][0] - 0.02) < 1e-10, `Σ[1][0]=${reconstruct[1][0].toFixed(6)} ≈ 0.02`);
assert(Math.abs(reconstruct[1][1] - 0.03) < 1e-10, `Σ[1][1]=${reconstruct[1][1].toFixed(6)} ≈ 0.03`);

// ─── 2. Cholesky with near-singular matrix (jitter must kick in) ──────
console.log('\n[2] Cholesky jitter on near-singular matrix');
const Σsingular = [[0.04, 0.04], [0.04, 0.04]];
try {
  const Lj = cholesky(Σsingular);
  assert(Lj.length === 2, 'Decomposes with jitter');
} catch (err) {
  assert(false, `Should succeed with jitter but threw: ${(err as Error).message}`);
}

// ─── 3. Sim: zero drift, low vol, uncorrelated → meanFinal ≈ 1 ────────
console.log('\n[3] Zero-drift Monte Carlo (10k paths)');
const r = runSimulation({
  symbols: ['A', 'B'],
  initialPrices: [100, 100],
  weights: [0.5, 0.5],
  dailyMeans: [0, 0],
  covariance: [[0.0004, 0], [0, 0.0004]],
  horizonDays: 63,
  numPaths: 10000,
  seed: 42,
});
const meanFinal = Array.from(r.finalValues).reduce((s, v) => s + v, 0) / r.finalValues.length;
assert(Math.abs(meanFinal - 1) < 0.02, `meanFinal=${meanFinal.toFixed(4)} within 2% of 1`);
assert(r.paths.length === 10000, `paths.length=${r.paths.length}`);
assert(r.paths[0].length === 64, `paths[0].length=${r.paths[0].length} (horizon+1)`);
assert(r.percentiles.p5.length === 64, 'p5 length matches');
assert(r.percentiles.p5[0] === 1 && r.percentiles.p95[0] === 1, 'percentiles at t=0 equal 1');
assert(r.percentiles.p5[63] < r.percentiles.p95[63], 'p5 < p95 at end');
assert(r.metrics.var95 > 0 && r.metrics.var95 < 0.5, `var95=${(r.metrics.var95 * 100).toFixed(2)}% in plausible range`);
assert(r.metrics.probLoss > 0 && r.metrics.probLoss < 1, `probLoss=${(r.metrics.probLoss * 100).toFixed(1)}%`);

console.log(`  → meanFinal=${meanFinal.toFixed(4)}, VaR95=${(r.metrics.var95 * 100).toFixed(2)}%, CVaR95=${(r.metrics.cvar95 * 100).toFixed(2)}%, time=${r.computeMs.toFixed(0)}ms`);

// ─── 4. minVariance favors lower-vol stock ────────────────────────────
console.log('\n[4] minVariance weighting');
const w = minVariance([[0.04, 0.025], [0.025, 0.02]]);
assert(w[1] > w[0], `lower-vol stock weighted higher: ${(w[0] * 100).toFixed(1)}%, ${(w[1] * 100).toFixed(1)}%`);
assert(Math.abs(w[0] + w[1] - 1) < 1e-9, `weights sum to 1 (got ${w[0] + w[1]})`);

// ─── 5. minVariance with 3 stocks ─────────────────────────────────────
console.log('\n[5] minVariance with 3 assets');
const cov3 = [
  [0.04, 0.01, 0.008],
  [0.01, 0.03, 0.006],
  [0.008, 0.006, 0.02],
];
const w3 = minVariance(cov3);
assert(w3.length === 3, '3 weights returned');
assert(Math.abs(w3[0] + w3[1] + w3[2] - 1) < 1e-9, `sum to 1: ${(w3[0] + w3[1] + w3[2]).toFixed(9)}`);
assert(w3.every((x) => x >= 0), 'all weights non-negative');
assert(w3[2] > w3[0], `lowest-vol asset weighted highest: ${w3.map((x) => (x * 100).toFixed(1) + '%').join(', ')}`);

// ─── 6. normalizeWeights & equalWeight ────────────────────────────────
console.log('\n[6] Weight utilities');
const ew = equalWeight(4);
assert(ew.length === 4 && Math.abs(ew[0] - 0.25) < 1e-12, 'equalWeight(4) = [0.25, 0.25, 0.25, 0.25]');

const norm = normalizeWeights([0.5, -0.1, 0.3, 0.2]);
assert(Math.abs(norm[0] + norm[1] + norm[2] + norm[3] - 1) < 1e-9, 'normalize clamps neg & sums to 1');
assert(norm[1] === 0, 'negative weight clamped to 0');

// ─── 7. invertMatrix sanity ───────────────────────────────────────────
console.log('\n[7] Matrix inversion');
const M = [[4, 7], [2, 6]];
const Minv = invertMatrix(M);
const product = [
  [M[0][0] * Minv[0][0] + M[0][1] * Minv[1][0], M[0][0] * Minv[0][1] + M[0][1] * Minv[1][1]],
  [M[1][0] * Minv[0][0] + M[1][1] * Minv[1][0], M[1][0] * Minv[0][1] + M[1][1] * Minv[1][1]],
];
assert(Math.abs(product[0][0] - 1) < 1e-9, `M·M⁻¹[0][0]=${product[0][0].toFixed(6)} ≈ 1`);
assert(Math.abs(product[0][1]) < 1e-9, `M·M⁻¹[0][1]≈0`);
assert(Math.abs(product[1][1] - 1) < 1e-9, `M·M⁻¹[1][1]≈1`);

// ─── 8. covarianceMatrix ──────────────────────────────────────────────
console.log('\n[8] Covariance from returns');
const series = {
  A: [0.01, 0.02, -0.01, 0.015, -0.005, 0.02, -0.01, 0.005],
  B: [0.01, 0.015, -0.005, 0.012, -0.003, 0.018, -0.008, 0.004],
};
const cov = covarianceMatrix(series);
assert(cov.symbols.length === 2, 'symbols extracted');
assert(cov.matrix.length === 2 && cov.matrix[0].length === 2, '2x2 matrix');
assert(Math.abs(cov.matrix[0][1] - cov.matrix[1][0]) < 1e-12, 'matrix is symmetric');
assert(cov.matrix[0][0] > 0 && cov.matrix[1][1] > 0, 'diagonals positive');
console.log(`  → cov(A,B)=${cov.matrix[0][1].toExponential(3)}, var(A)=${cov.matrix[0][0].toExponential(3)}`);

// ─── 9. Performance budget ────────────────────────────────────────────
console.log('\n[9] Performance budget');
assert(r.computeMs < 600, `sim 10k paths × 63d × 2 assets in ${r.computeMs.toFixed(0)}ms (target <600ms)`);

// Larger run — 5 assets
const r5 = runSimulation({
  symbols: ['A', 'B', 'C', 'D', 'E'],
  initialPrices: [100, 100, 100, 100, 100],
  weights: [0.2, 0.2, 0.2, 0.2, 0.2],
  dailyMeans: [0, 0, 0, 0, 0],
  covariance: [
    [0.0004, 0.0001, 0.0001, 0.0001, 0.0001],
    [0.0001, 0.0004, 0.0001, 0.0001, 0.0001],
    [0.0001, 0.0001, 0.0004, 0.0001, 0.0001],
    [0.0001, 0.0001, 0.0001, 0.0004, 0.0001],
    [0.0001, 0.0001, 0.0001, 0.0001, 0.0004],
  ],
  horizonDays: 63,
  numPaths: 10000,
  seed: 7,
});
console.log(`  → 5-asset sim: ${r5.computeMs.toFixed(0)}ms`);
assert(r5.computeMs < 1500, `5-asset sim under 1.5s (got ${r5.computeMs.toFixed(0)}ms)`);

// ─── Summary ──────────────────────────────────────────────────────────
console.log(`\n=== ${pass} pass, ${fail} fail ===\n`);
process.exit(fail === 0 ? 0 : 1);
