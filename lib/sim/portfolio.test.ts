import { describe, it, expect } from 'vitest';
import { equalWeight, normalizeWeights, minVariance, invertMatrix } from './portfolio';

const sum = (w: number[]) => w.reduce((s, x) => s + x, 0);

describe('equalWeight', () => {
  it('returns n equal weights summing to 1', () => {
    const w = equalWeight(4);
    expect(w).toHaveLength(4);
    expect(sum(w)).toBeCloseTo(1, 10);
    expect(w.every((x) => x === 0.25)).toBe(true);
  });

  it('returns [] for n <= 0', () => {
    expect(equalWeight(0)).toEqual([]);
    expect(equalWeight(-3)).toEqual([]);
  });
});

describe('normalizeWeights', () => {
  it('scales positive weights to sum = 1', () => {
    const w = normalizeWeights([2, 3, 5]);
    expect(sum(w)).toBeCloseTo(1, 10);
    expect(w[2]).toBeCloseTo(0.5, 10);
  });

  it('clamps negative weights to 0 (long-only)', () => {
    const w = normalizeWeights([-1, 1, 1]);
    expect(w[0]).toBe(0);
    expect(sum(w)).toBeCloseTo(1, 10);
  });

  it('falls back to equal weight when all weights are non-positive', () => {
    expect(normalizeWeights([-1, -2, 0])).toEqual(equalWeight(3));
  });
});

describe('invertMatrix', () => {
  it('inverts a known 2x2 matrix', () => {
    // [[4,7],[2,6]]⁻¹ = [[0.6,-0.7],[-0.2,0.4]]
    const inv = invertMatrix([[4, 7], [2, 6]]);
    expect(inv[0][0]).toBeCloseTo(0.6, 10);
    expect(inv[0][1]).toBeCloseTo(-0.7, 10);
    expect(inv[1][0]).toBeCloseTo(-0.2, 10);
    expect(inv[1][1]).toBeCloseTo(0.4, 10);
  });

  it('A · A⁻¹ = I for a 3x3 covariance-like matrix', () => {
    const a = [
      [0.04, 0.01, 0.0],
      [0.01, 0.09, 0.02],
      [0.0, 0.02, 0.16],
    ];
    const inv = invertMatrix(a);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let s = 0;
        for (let k = 0; k < 3; k++) s += a[i][k] * inv[k][j];
        expect(s).toBeCloseTo(i === j ? 1 : 0, 8);
      }
    }
  });

  it('throws on a singular matrix', () => {
    expect(() => invertMatrix([[1, 2], [2, 4]])).toThrow(/singular/);
  });
});

describe('minVariance', () => {
  it('returns equal weights for uncorrelated assets with identical variance', () => {
    const cov = [
      [0.04, 0, 0],
      [0, 0.04, 0],
      [0, 0, 0.04],
    ];
    const w = minVariance(cov);
    expect(sum(w)).toBeCloseTo(1, 10);
    w.forEach((x) => expect(x).toBeCloseTo(1 / 3, 10));
  });

  it('overweights the lower-variance asset', () => {
    // Asset 0 var 0.01, asset 1 var 0.09, uncorrelated
    const cov = [
      [0.01, 0],
      [0, 0.09],
    ];
    const w = minVariance(cov);
    expect(w[0]).toBeGreaterThan(w[1]);
    expect(sum(w)).toBeCloseTo(1, 10);
  });

  it('produces long-only weights', () => {
    const cov = [
      [0.04, 0.03, 0.01],
      [0.03, 0.05, 0.02],
      [0.01, 0.02, 0.06],
    ];
    const w = minVariance(cov);
    w.forEach((x) => expect(x).toBeGreaterThanOrEqual(0));
    expect(sum(w)).toBeCloseTo(1, 10);
  });

  it('returns [] for empty input', () => {
    expect(minVariance([])).toEqual([]);
  });
});
