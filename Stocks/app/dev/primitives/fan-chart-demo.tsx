'use client';

import { useMemo } from 'react';
import { FanChart } from '@/components/ui/fan-chart';

function makePath(n: number, drift: number, vol: number, seed: number): Float64Array {
  const path = new Float64Array(n);
  path[0] = 1.0;
  let s = seed;
  function rand() {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  }
  function normal() {
    const u = Math.max(1e-10, rand());
    const v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  for (let i = 1; i < n; i++) {
    path[i] = path[i - 1] * Math.exp(drift + vol * normal());
  }
  return path;
}

function percentile(paths: Float64Array[], p: number, n: number): Float64Array {
  const out = new Float64Array(n);
  for (let t = 0; t < n; t++) {
    const vals = paths.map((path) => path[t]).sort((a, b) => a - b);
    const idx = Math.floor((p / 100) * (vals.length - 1));
    out[t] = vals[idx];
  }
  return out;
}

function mean(paths: Float64Array[], n: number): Float64Array {
  const out = new Float64Array(n);
  for (let t = 0; t < n; t++) {
    out[t] = paths.reduce((s, p) => s + p[t], 0) / paths.length;
  }
  return out;
}

export function FanChartDemo() {
  const { percentiles, meanPath, horizonDays } = useMemo(() => {
    const N = 63;
    const dailyDrift = 0.0003;
    const dailyVol = 0.013;
    // Generate 200 mock paths for demo
    const paths = Array.from({ length: 200 }, (_, i) => makePath(N + 1, dailyDrift, dailyVol, i * 7919 + 13));
    return {
      percentiles: {
        p5: percentile(paths, 5, N + 1),
        p25: percentile(paths, 25, N + 1),
        p50: percentile(paths, 50, N + 1),
        p75: percentile(paths, 75, N + 1),
        p95: percentile(paths, 95, N + 1),
      },
      meanPath: mean(paths, N + 1),
      horizonDays: N,
    };
  }, []);

  return (
    <FanChart
      percentiles={percentiles}
      mean={meanPath}
      horizonDays={horizonDays}
      height={260}
    />
  );
}
