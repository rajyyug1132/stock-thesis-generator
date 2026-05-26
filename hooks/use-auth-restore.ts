'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { readPending, clearPending } from '@/lib/persistence/pending-sim';
import { useAuth } from '@/hooks/use-auth';

export function useAuthRestore() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token, loading } = useAuth();
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'restoring' | 'done' | 'none'>('idle');

  useEffect(() => {
    if (searchParams.get('restore') !== 'pending') return;
    if (loading) return;

    const pending = readPending();

    if (!pending) {
      setRestoreStatus('none');
      router.replace('/portfolio');
      return;
    }

    if (!token) {
      setRestoreStatus('none');
      router.replace('/portfolio');
      return;
    }

    setRestoreStatus('restoring');

    fetch('/api/snapshots', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: pending.name,
        symbols: pending.symbols,
        weights: pending.weights,
        horizonDays: pending.horizonDays,
        numPaths: pending.numPaths,
        computedMetrics: pending.computedMetrics,
      }),
    })
      .then(res => {
        if (res.ok) {
          clearPending();
          setRestoreStatus('done');
        } else {
          setRestoreStatus('idle');
        }
      })
      .catch(() => setRestoreStatus('idle'))
      .finally(() => {
        router.replace('/portfolio');
      });
  }, [searchParams, router, token, loading]);

  return { restoreStatus };
}
