'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { useSimulation } from '@/hooks/use-simulation';

export default function WorkerSmokePage() {
  if (process.env.NODE_ENV === 'production') notFound();
  const { result, loading, error, run } = useSimulation();
  const [covData, setCovData] = useState<{
    symbols: string[];
    initialPrices: number[];
    dailyMeans: number[];
    covariance: number[][];
  } | null>(null);
  const [covError, setCovError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/covariance?symbols=RELIANCE,TCS,INFY')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setCovError(d.error);
          return;
        }
        setCovData({
          symbols: d.symbols,
          initialPrices: d.initialPrices,
          dailyMeans: d.dailyMeans,
          covariance: d.covariance,
        });
        run({
          symbols: d.symbols,
          initialPrices: d.initialPrices,
          weights: [1 / 3, 1 / 3, 1 / 3],
          dailyMeans: d.dailyMeans,
          covariance: d.covariance,
          horizonDays: 63,
          numPaths: 10000,
          seed: 42,
        });
      })
      .catch((e) => setCovError(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ padding: '2rem', fontFamily: 'monospace', fontSize: '14px', background: '#0b0a09', color: '#f5f0e8', minHeight: '100vh' }}>
      <h1>Worker Smoke Test — Phase B</h1>
      <pre>covData: {covData ? '✓ loaded ' + covData.symbols.join(',') : covError ?? '...'}</pre>
      <pre>loading: {String(loading)}</pre>
      <pre>error: {error ?? 'none'}</pre>
      {result && (
        <>
          <h2>SimResult</h2>
          <pre>computeMs: {result.computeMs.toFixed(1)}</pre>
          <pre>paths: {result.paths.length} × {result.paths[0]?.length}</pre>
          <pre>finalValues mean: {(Array.from(result.finalValues).reduce((s, v) => s + v, 0) / result.finalValues.length).toFixed(4)}</pre>
          <h3>Metrics</h3>
          <pre>{JSON.stringify(
            Object.fromEntries(
              Object.entries(result.metrics).map(([k, v]) => [k, typeof v === 'number' ? v.toFixed(4) : v])
            ),
            null,
            2
          )}</pre>
        </>
      )}
    </main>
  );
}
