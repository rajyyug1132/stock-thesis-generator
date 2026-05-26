'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SimInput, SimResult } from '@/lib/sim/types';
import type { ShockSpec } from '@/lib/stress/types';
import { applyShockSpec } from '@/lib/stress/applyShock';

interface WorkerOk { ok: true; result: SimResult }
interface WorkerErr { ok: false; error: string }
type WorkerMsg = WorkerOk | WorkerErr;

export interface UseStressSim {
  shockResult: SimResult | null;
  shockSpec: ShockSpec | null;
  loading: boolean;
  error: string | null;
  runStress: (query: string) => Promise<void>;
  clearStress: () => void;
}

export function useStressSim(baseInput: SimInput | null): UseStressSim {
  const [shockResult, setShockResult] = useState<SimResult | null>(null);
  const [shockSpec, setShockSpec] = useState<ShockSpec | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      workerRef.current?.terminate();
    };
  }, []);

  const runStress = useCallback(
    async (query: string) => {
      if (!baseInput) return;
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/stress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, symbols: baseInput.symbols }),
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error);

        const spec: ShockSpec = json.spec;
        setShockSpec(spec);

        const shockedInput = applyShockSpec(baseInput, spec);

        workerRef.current?.terminate();
        const w = new Worker(
          new URL('../workers/simulation.worker.ts', import.meta.url),
          { type: 'module' }
        );
        workerRef.current = w;

        w.addEventListener('message', (e: MessageEvent<WorkerMsg>) => {
          if (!mountedRef.current) return;
          if (e.data.ok) {
            setShockResult(e.data.result);
          } else {
            setError(e.data.error);
          }
          setLoading(false);
        });
        w.addEventListener('error', (ev) => {
          if (!mountedRef.current) return;
          setError(ev.message || 'Worker error');
          setLoading(false);
        });

        w.postMessage(shockedInput);
      } catch (e) {
        if (mountedRef.current) {
          setError((e as Error).message);
          setLoading(false);
        }
      }
    },
    [baseInput]
  );

  const clearStress = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setShockResult(null);
    setShockSpec(null);
    setError(null);
    setLoading(false);
  }, []);

  return { shockResult, shockSpec, loading, error, runStress, clearStress };
}
