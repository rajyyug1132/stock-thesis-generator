import type { TickerUpdate } from './mock';

export type AnomalyEvent = {
  id: string;
  symbol: string;
  type: 'spike_up' | 'spike_down';
  magnitude: number;   // how many times above threshold
  update: TickerUpdate;
  timestamp: number;
};

export const ANOMALY_THRESHOLD = 0.007; // 0.7% per interval = anomaly

export function detectAnomaly(update: TickerUpdate): AnomalyEvent | null {
  const abs = Math.abs(update.changePct);
  if (abs < ANOMALY_THRESHOLD) return null;

  return {
    id: `${update.symbol}-${update.timestamp}`,
    symbol: update.symbol,
    type: update.changePct > 0 ? 'spike_up' : 'spike_down',
    magnitude: abs / ANOMALY_THRESHOLD,
    update,
    timestamp: update.timestamp,
  };
}
