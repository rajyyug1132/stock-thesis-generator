'use client';

import { useAuth } from '@/hooks/use-auth';
import { useUpgrade } from '@/providers/upgrade-provider';
import { FREE_LIMITS, PAID_LIMITS, type TierLimits } from '@/lib/entitlements';

/**
 * The single entitlement hook. Wraps auth and exposes the active tier limits
 * plus `showUpgrade()` to open the paywall.
 *
 * `isPaid` is hard-stubbed to false — there's no billing yet. Flip it to a real
 * entitlement check (Stripe / DB) and every gate updates automatically.
 */
export function useUser() {
  const { user, token, loading } = useAuth();
  // STUB — no billing wired yet. Typed as boolean (not the `false` literal) so
  // paid-tier branches aren't flagged as unreachable until entitlements land.
  const isPaid: boolean = false;
  const { showUpgrade } = useUpgrade();
  const limits: TierLimits = isPaid ? PAID_LIMITS : FREE_LIMITS;

  return { user, token, loading, isPaid, limits, showUpgrade };
}
