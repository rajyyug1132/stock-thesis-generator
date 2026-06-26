'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/hooks/use-user';
import { recordThesisView } from '@/lib/usage';
import { UpgradeModal } from '@/components/upgrade-modal';

/**
 * Enforces the free-tier "N theses/day" limit. Drop it onto the thesis page;
 * when the daily limit is exceeded for a NEW thesis it renders a hard upgrade
 * block over the page. Re-reading a thesis opened earlier today is free.
 */
export function ThesisGate({ symbol }: { symbol: string }) {
  const { isPaid, limits } = useUser();
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (isPaid) return;
    const result = recordThesisView(symbol, limits.thesesPerDay);
    if (result.blocked) setBlocked(true);
  }, [symbol, isPaid, limits.thesesPerDay]);

  if (!blocked) return null;
  return <UpgradeModal open reason="thesis" />;
}
