'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SimInput, SimResult } from '@/lib/sim/types';

const DEBOUNCE_MS = 80;

interface WorkerOk {
  ok: true;
  result: SimResult;
}
interface WorkerErr {
  ok: false;
  error: string;
}
type WorkerMsg = WorkerOk | WorkerErr;

export interface UseSimulation {
  result: SimResult | null;
  loading: boolean;
  error: string | null;
  run: (input: SimInput) => void;
}

export function useSimulation(): UseSimulation {
  const [result, setResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingInput = useRef<SimInput | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const spawnWorker = useCallback((): Worker => {
    const w = new Worker(
      new URL('../workers/simulation.worker.ts', import.meta.url),
      { type: 'module' }
    );
    w.addEventListener('message', (e: MessageEvent<WorkerMsg>) => {
      if (!mountedRef.current) return;
      if (e.data.ok) {
        setResult(e.data.result);
        setError(null);
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
    return w;
  }, []);

  const fire = useCallback(() => {
    const input = pendingInput.current;
    if (!input) return;
    pendingInput.current = null;

    // Cancel any in-flight worker by terminating + respawning
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    const w = spawnWorker();
    workerRef.current = w;
    setLoading(true);
    setError(null);
    w.postMessage(input);
  }, [spawnWorker]);

  const run = useCallback(
    (input: SimInput) => {
      pendingInput.current = input;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(fire, DEBOUNCE_MS);
    },
    [fire]
  );

  return { result, loading, error, run };
}
