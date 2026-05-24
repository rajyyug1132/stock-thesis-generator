// WebWorker entry: runs Monte Carlo simulation off the main thread.
// Posts back the result, transferring Float64Array buffers for zero-copy.

import { runSimulation } from '@/lib/sim/monteCarlo';
import type { SimInput } from '@/lib/sim/types';

self.addEventListener('message', (e: MessageEvent<SimInput>) => {
  try {
    const result = runSimulation(e.data);
    const transferable: ArrayBufferLike[] = [
      ...result.paths.map((p) => p.buffer),
      result.finalValues.buffer,
      result.percentiles.p5.buffer,
      result.percentiles.p25.buffer,
      result.percentiles.p50.buffer,
      result.percentiles.p75.buffer,
      result.percentiles.p95.buffer,
      result.mean.buffer,
    ];
    (self as unknown as Worker).postMessage(
      { ok: true, result },
      { transfer: transferable }
    );
  } catch (err) {
    (self as unknown as Worker).postMessage({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
