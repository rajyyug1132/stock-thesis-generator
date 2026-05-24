// Portfolio allocation utilities — weight normalization, equal-weight,
// minimum-variance (analytic, long-only via clamp+renormalize).

/**
 * Clamp negative weights to 0, scale to sum = 1.
 * If all weights are non-positive, falls back to equal weights.
 */
export function normalizeWeights(w: number[]): number[] {
  const clamped = w.map((x) => (x > 0 ? x : 0));
  let total = 0;
  for (const v of clamped) total += v;
  if (total === 0) return equalWeight(w.length);
  return clamped.map((x) => x / total);
}

export function equalWeight(n: number): number[] {
  if (n <= 0) return [];
  const w = 1 / n;
  return new Array(n).fill(w);
}

/**
 * Minimum-variance portfolio (long-only).
 * Analytic: w = (Σ⁻¹ · 1) / (1ᵀ · Σ⁻¹ · 1)
 * Then clamp negatives to 0 and renormalize for a long-only solution.
 * (True constrained MVO requires QP; clamp-and-renormalize is the standard
 *  pragmatic approximation for small N.)
 */
export function minVariance(cov: number[][]): number[] {
  const n = cov.length;
  if (n === 0) return [];
  const inv = invertMatrix(cov);
  // raw = Σ⁻¹ · 1
  const raw = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) s += inv[i][j];
    raw[i] = s;
  }
  return normalizeWeights(raw);
}

/**
 * Gaussian elimination matrix inverse for small N (≤ 10).
 * Throws on singular matrices.
 */
export function invertMatrix(m: number[][]): number[][] {
  const n = m.length;
  // Build [A | I]
  const a: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: 2 * n }, (_, j) => {
      if (j < n) return m[i][j];
      return j - n === i ? 1 : 0;
    })
  );

  for (let col = 0; col < n; col++) {
    // Partial pivot
    let pivotRow = col;
    let pivotAbs = Math.abs(a[col][col]);
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(a[r][col]) > pivotAbs) {
        pivotAbs = Math.abs(a[r][col]);
        pivotRow = r;
      }
    }
    if (pivotAbs < 1e-12) {
      throw new Error('invertMatrix: singular matrix');
    }
    if (pivotRow !== col) {
      const tmp = a[col];
      a[col] = a[pivotRow];
      a[pivotRow] = tmp;
    }

    // Normalize pivot row
    const pivot = a[col][col];
    for (let j = 0; j < 2 * n; j++) a[col][j] /= pivot;

    // Eliminate other rows
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = a[r][col];
      if (factor === 0) continue;
      for (let j = 0; j < 2 * n; j++) {
        a[r][j] -= factor * a[col][j];
      }
    }
  }

  // Extract right half
  const inv: number[][] = Array.from({ length: n }, (_, i) =>
    a[i].slice(n)
  );
  return inv;
}
