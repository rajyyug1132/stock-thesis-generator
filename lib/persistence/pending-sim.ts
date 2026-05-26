import { RiskMetrics } from '@/lib/sim/types';

const KEY = 'nifty-thesis:pending-simulation';

export type PendingSimulation = {
  symbols: string[];
  weights: number[];
  horizonDays: number;
  numPaths: number;
  computedMetrics: RiskMetrics;
  name: string;
  savedAt: string;
};

export function savePending(sim: PendingSimulation): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(sim));
  } catch {
    // localStorage full or unavailable — silent fail
  }
}

export function readPending(): PendingSimulation | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPending(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(KEY);
}

export function autoName(symbols: string[]): string {
  const tickers = symbols.map(s => s.replace('.NS', '')).join(' · ');
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${tickers} — ${date}`;
}
