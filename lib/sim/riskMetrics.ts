// Risk metrics computed from a Monte Carlo simulation's final values + mean path.
// All "loss" metrics returned as POSITIVE numbers (var95 = 0.124 means 12.4% loss).

import type { RiskMetrics } from './types';

// 7% = RBI 10Y G-Sec proxy (annual)
const RISK_FREE_RATE = 0.07;

function mean(arr: Float64Array): number {
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i];
  return s / arr.length;
}

function stddev(arr: Float64Array): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  let sq = 0;
  for (let i = 0; i < arr.length; i++) {
    const d = arr[i] - m;
    sq += d * d;
  }
  return Math.sqrt(sq / (arr.length - 1));
}

export function computeRiskMetrics(
  finalValues: Float64Array,
  meanPath: Float64Array,
  horizonDays: number
): RiskMetrics {
  const n = finalValues.length;

  // Expected return = mean(final) - 1
  const meanFinal = mean(finalValues);
  const expectedReturn = meanFinal - 1;

  // Annualized return — geometric, scales horizon → year
  const annualizedReturn =
    meanFinal > 0 ? Math.pow(meanFinal, 252 / horizonDays) - 1 : -1;

  // Annualized vol from log-returns of final values
  const logFinals = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    logFinals[i] = finalValues[i] > 0 ? Math.log(finalValues[i]) : -10;
  }
  const sdLog = stddev(logFinals);
  const annualizedVol = sdLog * Math.sqrt(252 / horizonDays);

  // Sharpe with 7% risk-free
  const sharpe = annualizedVol === 0 ? 0 : (annualizedReturn - RISK_FREE_RATE) / annualizedVol;

  // VaR 95 — sort ascending, value at 5th percentile
  const sorted = new Float64Array(finalValues);
  sorted.sort();
  const idx5 = Math.floor(0.05 * n);
  const p5Value = sorted[idx5];
  const var95 = Math.max(0, 1 - p5Value);

  // CVaR 95 — mean of bottom 5%
  let tailSum = 0;
  const tailCount = Math.max(1, idx5);
  for (let i = 0; i < tailCount; i++) tailSum += sorted[i];
  const cvarMean = tailSum / tailCount;
  const cvar95 = Math.max(0, 1 - cvarMean);

  // Prob of loss
  let lossCount = 0;
  for (let i = 0; i < n; i++) if (finalValues[i] < 1) lossCount++;
  const probLoss = lossCount / n;

  // Max drawdown on mean path
  let runMax = meanPath[0];
  let maxDd = 0;
  for (let i = 1; i < meanPath.length; i++) {
    if (meanPath[i] > runMax) runMax = meanPath[i];
    const dd = runMax > 0 ? (runMax - meanPath[i]) / runMax : 0;
    if (dd > maxDd) maxDd = dd;
  }

  return {
    expectedReturn,
    annualizedReturn,
    annualizedVol,
    sharpe,
    var95,
    cvar95,
    probLoss,
    maxDrawdown: maxDd,
  };
}
