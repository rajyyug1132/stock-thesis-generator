/**
 * mock.ts — client-side GBM mock stream
 *
 * Runs on the main thread (not a worker) so the provider can dispatch
 * anomaly events synchronously alongside price updates. The ticker
 * worker handles canvas rendering separately.
 */

export interface TickerUpdate {
  symbol: string;
  price: number;
  changePct: number;   // fractional, e.g. 0.0043 = +0.43%
  direction: 'up' | 'down' | 'flat';
  timestamp: number;
}

// NIFTY 50 subset with rough INR base prices
const DEFAULT_SYMBOLS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
  'HINDUNILVR', 'SBIN', 'BHARTIARTL', 'ITC', 'KOTAKBANK',
  'LT', 'AXISBANK', 'ASIANPAINT', 'MARUTI', 'BAJFINANCE',
  'NESTLEIND', 'TITAN', 'ULTRACEMCO', 'WIPRO', 'HCLTECH',
] as const;

const DEFAULT_PRICES: Record<string, number> = {
  RELIANCE: 2950, TCS: 4100, HDFCBANK: 1650, INFY: 1750, ICICIBANK: 1220,
  HINDUNILVR: 2700, SBIN: 820, BHARTIARTL: 1680, ITC: 490, KOTAKBANK: 1780,
  LT: 3600, AXISBANK: 1210, ASIANPAINT: 2700, MARUTI: 12800, BAJFINANCE: 7100,
  NESTLEIND: 2450, TITAN: 3400, ULTRACEMCO: 10800, WIPRO: 560, HCLTECH: 1800,
};

function gaussRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

interface SimState {
  price: number;
  open: number;
  drift: number;
  vol: number;
}

/**
 * createMockStream — starts a GBM interval and calls onUpdate for every tick.
 * Returns a stop function.
 */
export function createMockStream(
  onUpdate: (update: TickerUpdate) => void,
  intervalMs = 1800,
  symbols: string[] = [...DEFAULT_SYMBOLS],
  basePrices: Record<string, number> = DEFAULT_PRICES
): () => void {
  const DT = 1 / 252 / 78; // one 5-min bar in a 252-day / 78-bar year

  // Seed state
  const state: Record<string, SimState> = {};
  for (const sym of symbols) {
    const base = basePrices[sym] ?? 1000;
    state[sym] = {
      price: base,
      open: base,
      drift: 0.05 + Math.random() * 0.20,
      vol: 0.12 + Math.random() * 0.23,
    };
  }

  const id = setInterval(() => {
    for (const sym of symbols) {
      const s = state[sym];
      const Z = gaussRandom();
      const drift = (s.drift - 0.5 * s.vol * s.vol) * DT;
      const diffusion = s.vol * Math.sqrt(DT) * Z;
      s.price = Math.max(1, s.price * Math.exp(drift + diffusion));

      const changePct = (s.price - s.open) / s.open;
      const direction: 'up' | 'down' | 'flat' =
        changePct > 0.0001 ? 'up' : changePct < -0.0001 ? 'down' : 'flat';

      onUpdate({
        symbol: sym,
        price: s.price,
        changePct,
        direction,
        timestamp: Date.now(),
      });
    }
  }, intervalMs);

  return () => clearInterval(id);
}
