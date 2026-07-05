import { describe, it, expect } from 'vitest';
import { maxSharpe, equalRiskContribution, optimizeWeights } from './optimize';

const sum = (w: number[]) => w.reduce((s, x) => s + x, 0);

describe('maxSharpe', () => {
  it('returns [1] for a single asset and [] for none', () => {
    expect(maxSharpe([0.001], [[0.01]])).toEqual([1]);
    expect(maxSharpe([], [])).toEqual([]);
  });

  it('allocates more to the higher-return asset when risk is identical', () => {
    const means = [0.002, 0.0005]; // asset 0 clearly better
    const cov = [
      [0.0004, 0],
      [0, 0.0004],
    ];
    const w = maxSharpe(means, cov);
    expect(w[0]).toBeGreaterThan(w[1]);
    expect(sum(w)).toBeCloseTo(1, 6);
  });

  it('produces long-only weights that sum to 1', () => {
    const means = [0.001, 0.0008, 0.0012];
    const cov = [
      [0.0004, 0.0001, 0.00005],
      [0.0001, 0.0003, 0.0001],
      [0.00005, 0.0001, 0.0005],
    ];
    const w = maxSharpe(means, cov);
    expect(w).toHaveLength(3);
    w.forEach((x) => expect(x).toBeGreaterThanOrEqual(0));
    expect(sum(w)).toBeCloseTo(1, 6);
  });
});

describe('equalRiskContribution', () => {
  it('returns equal weights for identical uncorrelated assets', () => {
    const cov = [
      [0.0004, 0, 0],
      [0, 0.0004, 0],
      [0, 0, 0.0004],
    ];
    const w = equalRiskContribution(cov);
    w.forEach((x) => expect(x).toBeCloseTo(1 / 3, 3));
  });

  it('gives the low-vol asset a larger weight (risk parity)', () => {
    // Asset 0 daily vol 1%, asset 1 daily vol 3%, uncorrelated
    const cov = [
      [0.0001, 0],
      [0, 0.0009],
    ];
    const w = equalRiskContribution(cov);
    expect(w[0]).toBeGreaterThan(w[1]);
    // Risk parity for uncorrelated assets: w_i ∝ 1/σ_i → 0.75 / 0.25
    expect(w[0]).toBeCloseTo(0.75, 1);
    expect(sum(w)).toBeCloseTo(1, 6);
  });
});

describe('optimizeWeights', () => {
  const means = [0.001, 0.001];
  const cov = [
    [0.0004, 0.0001],
    [0.0001, 0.0004],
  ];

  it('dispatches to each strategy and always returns a valid allocation', () => {
    for (const target of ['maxSharpe', 'minVol', 'equalRisk'] as const) {
      const w = optimizeWeights(means, cov, target);
      expect(w).toHaveLength(2);
      expect(sum(w)).toBeCloseTo(1, 6);
      w.forEach((x) => expect(x).toBeGreaterThanOrEqual(0));
    }
  });

  it('falls back to equal weight when the covariance matrix is singular', () => {
    const singular = [
      [0.0004, 0.0004],
      [0.0004, 0.0004],
    ];
    // minVol path inverts the matrix → throws → equal-weight fallback
    const w = optimizeWeights(means, singular, 'minVol');
    expect(w).toEqual([0.5, 0.5]);
  });
});
