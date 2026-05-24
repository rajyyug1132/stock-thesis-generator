// PRNG utilities for Monte Carlo simulation.
// Box-Muller for standard-normal draws, Mulberry32 for seeded reproducibility.

export type Rng = () => number;

/**
 * Mulberry32 — small, fast, decent statistical properties.
 * Returns a function that yields uniforms in [0, 1).
 */
export function createSeededRng(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller cache for the second normal draw
let cached: number | null = null;

/**
 * Standard normal draw via Box-Muller.
 * Caches the second draw to avoid recomputing both each call.
 * Pass a seeded `rng` for reproducibility, omit for Math.random.
 */
export function randomNormal(rng?: Rng): number {
  if (cached !== null) {
    const v = cached;
    cached = null;
    return v;
  }
  const r = rng ?? Math.random;
  let u1 = 0;
  let u2 = 0;
  // Avoid log(0)
  while (u1 === 0) u1 = r();
  while (u2 === 0) u2 = r();
  const mag = Math.sqrt(-2 * Math.log(u1));
  const ang = 2 * Math.PI * u2;
  cached = mag * Math.sin(ang);
  return mag * Math.cos(ang);
}

/**
 * Reset the Box-Muller cache. Call before a seeded simulation run for
 * reproducibility (otherwise a leftover cached value from a previous run
 * contaminates the first draw).
 */
export function resetNormalCache(): void {
  cached = null;
}

/**
 * Fill an existing Float64Array with N(0,1) draws in-place.
 * Avoids allocations in hot loops.
 */
export function fillNormals(out: Float64Array, rng?: Rng): void {
  for (let i = 0; i < out.length; i++) {
    out[i] = randomNormal(rng);
  }
}
