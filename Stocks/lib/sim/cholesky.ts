// Cholesky decomposition with diagonal jitter for near-singular matrices.
// Returns lower-triangular L such that L · Lᵀ ≈ Σ.

export class NonPositiveDefiniteError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'NonPositiveDefiniteError';
  }
}

const JITTER = 1e-8;
const MAX_ATTEMPTS = 6;

/**
 * Cholesky decomposition with adaptive diagonal jitter.
 * Indian large-caps frequently have ρ > 0.9 (TCS-INFY etc) which stresses
 * the decomposition. We add ε·I to the diagonal and retry up to 6 times,
 * scaling ε by 10× each attempt.
 */
export function cholesky(sigma: number[][]): number[][] {
  const n = sigma.length;
  if (n === 0) return [];
  if (sigma[0].length !== n) throw new Error('cholesky: matrix not square');

  let jitter = 0;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const L: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
    let ok = true;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = sigma[i][j];
        if (i === j) sum += jitter; // diagonal jitter only

        for (let k = 0; k < j; k++) {
          sum -= L[i][k] * L[j][k];
        }

        if (i === j) {
          if (sum <= 0) {
            ok = false;
            break;
          }
          L[i][j] = Math.sqrt(sum);
        } else {
          if (L[j][j] === 0) {
            ok = false;
            break;
          }
          L[i][j] = sum / L[j][j];
        }
      }
      if (!ok) break;
    }

    if (ok) {
      if (jitter > 0 && typeof console !== 'undefined') {
        // eslint-disable-next-line no-console
        console.warn(`[cholesky] applied jitter=${jitter.toExponential(2)} after ${attempt} attempt(s)`);
      }
      return L;
    }
    jitter = jitter === 0 ? JITTER : jitter * 10;
  }

  throw new NonPositiveDefiniteError(
    `Cholesky failed after ${MAX_ATTEMPTS} attempts; matrix is not positive-definite even with jitter ${jitter.toExponential(2)}`
  );
}

/**
 * Multiply lower-triangular L by vector z. Result has length n.
 * Used to produce correlated normals: y = L · z where z ~ N(0, I).
 */
export function matVecLower(L: number[][], z: Float64Array | number[]): Float64Array {
  const n = L.length;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j <= i; j++) {
      s += L[i][j] * z[j];
    }
    out[i] = s;
  }
  return out;
}
