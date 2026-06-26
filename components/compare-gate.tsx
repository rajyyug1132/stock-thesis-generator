'use client';

import { useUser } from '@/hooks/use-user';
import { UpgradeModal } from '@/components/upgrade-modal';

/**
 * Enforces the free-tier compare limit. Free users can view a comparison of up
 * to `compareSize` stocks; beyond that (e.g. a direct URL or restored sim) this
 * renders a hard upgrade block over the page.
 */
export function CompareGate({ symbolCount }: { symbolCount: number }) {
  const { isPaid, limits } = useUser();
  if (isPaid || symbolCount <= limits.compareSize) return null;
  return <UpgradeModal open reason="compare" />;
}
