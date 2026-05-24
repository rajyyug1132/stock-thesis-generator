// Monte Carlo simulation types

export interface SimInput {
  symbols: string[];
  initialPrices: number[];
  weights: number[];
  dailyMeans: number[];
  covariance: number[][];
  horizonDays: number;
  numPaths: number;
  seed?: number;
}

export interface RiskMetrics {
  expectedReturn: number;       // mean(final) - 1
  annualizedReturn: number;
  annualizedVol: number;
  sharpe: number;
  var95: number;                // POSITIVE = loss fraction at 5th percentile
  cvar95: number;               // POSITIVE = mean loss in tail 5%
  probLoss: number;             // fraction of paths ending below 1
  maxDrawdown: number;          // max peak-to-trough on mean path
}

export interface SimResult {
  paths: Float64Array[];        // [numPaths] × Float64Array(horizonDays+1)
  finalValues: Float64Array;
  percentiles: {
    p5: Float64Array;
    p25: Float64Array;
    p50: Float64Array;
    p75: Float64Array;
    p95: Float64Array;
  };
  mean: Float64Array;
  metrics: RiskMetrics;
  computeMs: number;
}
