// Pure functions: returns, volatility, correlation. No I/O.

const TRADING_DAYS_PER_YEAR = 252;

export function logReturns(prices: number[]): number[] {
  if (prices.length < 2) return [];
  const out: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    out.push(Math.log(prices[i] / prices[i - 1]));
  }
  return out;
}

export function meanReturn(returns: number[]): number {
  if (returns.length === 0) return 0;
  return returns.reduce((s, r) => s + r, 0) / returns.length;
}

// Sample stddev with N-1 denominator (Bessel correction)
export function volatility(returns: number[]): number {
  if (returns.length < 2) return 0;
  const mean = meanReturn(returns);
  const sumSq = returns.reduce((s, r) => s + (r - mean) ** 2, 0);
  return Math.sqrt(sumSq / (returns.length - 1));
}

export function annualize({
  mean,
  vol,
}: {
  mean: number;
  vol: number;
}): { mean: number; vol: number } {
  return {
    mean: mean * TRADING_DAYS_PER_YEAR,
    vol: vol * Math.sqrt(TRADING_DAYS_PER_YEAR),
  };
}

export function pearsonCorrelation(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `Correlation length mismatch: a=${a.length}, b=${b.length}`
    );
  }
  if (a.length < 2) return 0;

  const meanA = meanReturn(a);
  const meanB = meanReturn(b);

  let num = 0;
  let sumSqA = 0;
  let sumSqB = 0;

  for (let i = 0; i < a.length; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    sumSqA += da * da;
    sumSqB += db * db;
  }

  const denom = Math.sqrt(sumSqA * sumSqB);
  return denom === 0 ? 0 : num / denom;
}

export interface CorrelationResult {
  symbols: string[];
  matrix: number[][];
}

export function correlationMatrix(
  returnsBySymbol: Record<string, number[]>
): CorrelationResult {
  const symbols = Object.keys(returnsBySymbol);
  const n = symbols.length;
  const matrix: number[][] = Array.from({ length: n }, () =>
    new Array(n).fill(0)
  );

  // Diagonal = 1
  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1;
  }

  // Compute upper triangle, mirror to lower
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const corr = pearsonCorrelation(
        returnsBySymbol[symbols[i]],
        returnsBySymbol[symbols[j]]
      );
      matrix[i][j] = corr;
      matrix[j][i] = corr; // Explicit mirror
    }
  }

  return { symbols, matrix };
}

export interface CovarianceResult {
  symbols: string[];
  matrix: number[][];
}

/**
 * Covariance matrix from aligned return series.
 * Σ_ij = E[(r_i - μ_i)(r_j - μ_j)] with N-1 (Bessel) denominator.
 * All input series MUST be the same length (use alignManySeries upstream).
 */
export function covarianceMatrix(
  returnsBySymbol: Record<string, number[]>
): CovarianceResult {
  const symbols = Object.keys(returnsBySymbol);
  const n = symbols.length;
  const matrix: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));

  // Precompute means
  const means: number[] = symbols.map((s) => meanReturn(returnsBySymbol[s]));

  // Verify equal lengths
  const len = returnsBySymbol[symbols[0]]?.length ?? 0;
  for (const s of symbols) {
    if (returnsBySymbol[s].length !== len) {
      throw new Error('covarianceMatrix: series must all be the same length');
    }
  }
  if (len < 2) {
    // Cannot compute covariance with fewer than 2 observations
    return { symbols, matrix };
  }

  const denom = len - 1;

  for (let i = 0; i < n; i++) {
    const ri = returnsBySymbol[symbols[i]];
    const mi = means[i];
    for (let j = i; j < n; j++) {
      const rj = returnsBySymbol[symbols[j]];
      const mj = means[j];
      let sum = 0;
      for (let k = 0; k < len; k++) {
        sum += (ri[k] - mi) * (rj[k] - mj);
      }
      const cov = sum / denom;
      matrix[i][j] = cov;
      matrix[j][i] = cov; // mirror
    }
  }

  return { symbols, matrix };
}
