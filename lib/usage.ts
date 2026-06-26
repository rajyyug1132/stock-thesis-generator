/**
 * Client-side daily usage counter for the free tier.
 *
 * Counts DISTINCT theses viewed per calendar day in localStorage. Re-reading a
 * thesis you already opened today is free; only a brand-new thesis past the
 * limit is blocked. This is a soft gate — real enforcement moves server-side
 * with entitlements later.
 */

const KEY_PREFIX = 'thesis_views_';

function todayKey(): string {
  return KEY_PREFIX + new Date().toISOString().slice(0, 10);
}

function readToday(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(todayKey()) ?? '[]') as string[];
  } catch {
    return [];
  }
}

/**
 * Record a thesis view and report whether it should be blocked.
 * - already viewed today → allowed (count unchanged)
 * - new, under limit     → recorded, allowed
 * - new, at/over limit    → blocked, not recorded
 */
export function recordThesisView(symbol: string, limit: number): { blocked: boolean; count: number } {
  if (typeof window === 'undefined' || !isFinite(limit)) {
    return { blocked: false, count: 0 };
  }
  const viewed = readToday();
  if (viewed.includes(symbol)) return { blocked: false, count: viewed.length };
  if (viewed.length >= limit) return { blocked: true, count: viewed.length };
  viewed.push(symbol);
  try {
    localStorage.setItem(todayKey(), JSON.stringify(viewed));
  } catch {
    // storage full / unavailable — fail open
  }
  return { blocked: false, count: viewed.length };
}

export function thesisViewsToday(): number {
  return readToday().length;
}
