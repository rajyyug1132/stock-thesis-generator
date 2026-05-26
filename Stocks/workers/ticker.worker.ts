/**
 * ticker.worker.ts — Epic C
 *
 * Runs on a dedicated Web Worker thread. Generates a continuous
 * mock price-feed using geometric Brownian motion so the main thread
 * is never blocked by the tick loop.
 *
 * Messages OUT (to main thread):
 *   { type: 'tick'; payload: TickerTick[] }
 *
 * Messages IN (from main thread):
 *   { type: 'start'; symbols: string[]; basePrice: Record<string, number> }
 *   { type: 'stop' }
 */

export interface TickerTick {
  symbol: string;
  price: number;
  change: number;   // absolute Δ from open
  changePct: number; // fractional, e.g. 0.0043 = +0.43%
  ts: number;       // performance.now() when computed
}

interface StartMsg {
  type: 'start';
  symbols: string[];
  basePrice: Record<string, number>;
}
interface StopMsg {
  type: 'stop';
}
type WorkerIn = StartMsg | StopMsg;

// Per-symbol simulation state
const state: Record<string, { price: number; open: number; drift: number; vol: number }> = {};
let intervalId: ReturnType<typeof setInterval> | null = null;

const DT = 1 / 252 / 78; // one 5-min bar in a 252-day / 78-bar year

function step(sym: string): TickerTick {
  const s = state[sym];
  // GBM step: S_t+1 = S_t * exp((μ - σ²/2)dt + σ√dt * Z)
  const Z = gaussRandom();
  const drift = (s.drift - 0.5 * s.vol * s.vol) * DT;
  const diffusion = s.vol * Math.sqrt(DT) * Z;
  s.price = Math.max(1, s.price * Math.exp(drift + diffusion));

  const change = s.price - s.open;
  const changePct = change / s.open;
  return { symbol: sym, price: s.price, change, changePct, ts: performance.now() };
}

function gaussRandom(): number {
  // Box-Muller
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

self.addEventListener('message', (e: MessageEvent<WorkerIn>) => {
  const msg = e.data;

  if (msg.type === 'stop') {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    return;
  }

  if (msg.type === 'start') {
    // Seed per-symbol state
    for (const sym of msg.symbols) {
      const base = msg.basePrice[sym] ?? 1000;
      state[sym] = {
        price: base,
        open: base,
        // Random sector-like parameters: drift 0–25% annualised, vol 12–35%
        drift: 0.05 + Math.random() * 0.20,
        vol: 0.12 + Math.random() * 0.23,
      };
    }

    if (intervalId !== null) clearInterval(intervalId);

    // Post a batch of ticks every 600 ms
    intervalId = setInterval(() => {
      const ticks: TickerTick[] = msg.symbols.map(step);
      (self as unknown as Worker).postMessage({ type: 'tick', payload: ticks });
    }, 600);
  }
});
