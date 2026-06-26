/**
 * Minimal client-side event log.
 *
 * One line per feature interaction. The point is measurement, not telemetry:
 * after ~2 weeks, any feature with zero events is a candidate to delete.
 *
 * Currently logs to the console. Swap the body for PostHog / Plausible / an
 * internal endpoint later — call sites don't change.
 */
export function track(event: string, props?: Record<string, unknown>) {
  if (typeof window === 'undefined') return; // client-only; no-op on the server
  // eslint-disable-next-line no-console
  console.log('[track]', event, props ?? {});
}
