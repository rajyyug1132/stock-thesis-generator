'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { createMockStream, type TickerUpdate } from '@/lib/stream/mock';
import { detectAnomaly, type AnomalyEvent } from '@/lib/stream/anomalyDetector';

type StreamContextValue = {
  prices: Record<string, TickerUpdate>;
  latestAnomaly: AnomalyEvent | null;
  anomalyHistory: AnomalyEvent[];   // last 10
  jitterAmplitude: number;          // 1.0 baseline, spikes to 3.0+ on anomaly
};

const StreamContext = createContext<StreamContextValue>({
  prices: {},
  latestAnomaly: null,
  anomalyHistory: [],
  jitterAmplitude: 1.0,
});

export function StockStreamProvider({ children }: { children: React.ReactNode }) {
  const [prices, setPrices] = useState<Record<string, TickerUpdate>>({});
  const [latestAnomaly, setLatestAnomaly] = useState<AnomalyEvent | null>(null);
  const [anomalyHistory, setAnomalyHistory] = useState<AnomalyEvent[]>([]);
  const [jitterAmplitude, setJitterAmplitude] = useState(1.0);
  const amplitudeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleUpdate = useCallback((update: TickerUpdate) => {
    setPrices((prev) => ({ ...prev, [update.symbol]: update }));

    const anomaly = detectAnomaly(update);
    if (anomaly) {
      setLatestAnomaly(anomaly);
      setAnomalyHistory((prev) => [anomaly, ...prev].slice(0, 10));

      // Spike jitter amplitude then decay back to baseline after 2.5s
      setJitterAmplitude(2.5 + anomaly.magnitude * 0.5);
      clearTimeout(amplitudeTimer.current);
      amplitudeTimer.current = setTimeout(() => {
        setJitterAmplitude(1.0);
      }, 2500);
    }
  }, []);

  useEffect(() => {
    const stop = createMockStream(handleUpdate, 1800);
    return () => {
      stop();
      clearTimeout(amplitudeTimer.current);
    };
  }, [handleUpdate]);

  return (
    <StreamContext.Provider value={{ prices, latestAnomaly, anomalyHistory, jitterAmplitude }}>
      {children}
    </StreamContext.Provider>
  );
}

export const useStockStream = () => useContext(StreamContext);
