'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { track } from '@/lib/analytics';

/**
 * Fires a `pageview` event on every route change. Page-level feature usage
 * (thesis view, compare, portfolio, watchlist, api-keys, shared thesis) is
 * measured here; in-page actions are tracked at their own call sites.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();
  useEffect(() => {
    track('pageview', { path: pathname });
  }, [pathname]);
  return null;
}
