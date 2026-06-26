'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import useSWR from 'swr';
import type { PriceAlert, WatchlistItem } from '@/lib/db/schema';
import { track } from '@/lib/analytics';

export interface TriggeredAlert {
  id:           string;
  symbol:       string;
  targetPrice:  number;
  direction:    'above' | 'below';
  label:        string | null;
  currentPrice: number | null;
  triggeredAt:  string | null;
}

export interface NotificationsState {
  watchlist:       WatchlistItem[];
  alerts:          PriceAlert[];
  triggered:       TriggeredAlert[];
  unreadCount:     number;
  loading:         boolean;
  error:           string | null;
  refresh:         () => Promise<void>;
  addToWatchlist:  (symbol: string) => Promise<void>;
  removeFromWatchlist: (symbol: string) => Promise<void>;
  createAlert:     (symbol: string, targetPrice: number, direction: 'above' | 'below', label?: string) => Promise<void>;
  deleteAlert:     (id: string) => Promise<void>;
  markAllRead:     () => void;
  isWatched:       (symbol: string) => boolean;
}

const POLL_INTERVAL_MS = 5 * 60 * 1000; // check alerts every 5 minutes

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// SWR fetcher — loads watchlist + alerts together. Key is ['notifications', token].
async function fetchNotifications([, token]: [string, string]) {
  const [wlRes, alRes] = await Promise.all([
    fetch('/api/notifications/watchlist', { headers: authHeaders(token) }),
    fetch('/api/notifications/alerts',    { headers: authHeaders(token) }),
  ]);
  if (!wlRes.ok || !alRes.ok) throw new Error('Could not load your watchlist and alerts.');
  const [wl, al] = await Promise.all([wlRes.json(), alRes.json()]);
  return {
    watchlist: (wl.watchlist ?? []) as WatchlistItem[],
    alerts:    (al.alerts ?? []) as PriceAlert[],
  };
}

export function useNotifications(token: string | null): NotificationsState {
  // ── Watchlist + alerts: SWR is the source of truth ─────────────────────────
  const { data, error, isLoading, mutate } = useSWR(
    token ? ['notifications', token] : null,
    fetchNotifications,
  );
  const watchlist = data?.watchlist ?? [];
  const alerts = data?.alerts ?? [];

  // ── Triggered-alert state (client-only, fed by the poll below) ──────────────
  const [triggered, setTriggered]     = useState<TriggeredAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const pollRef                       = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Poll for triggered alerts (side-effect: fires browser notifications) ────
  const checkAlerts = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications/check', { headers: authHeaders(token) });
      if (!res.ok) return;
      const payload: { triggered: TriggeredAlert[] } = await res.json();
      if (payload.triggered?.length) {
        let fired = false;
        setTriggered((prev) => {
          const existingIds = new Set(prev.map((a) => a.id));
          const newOnes = payload.triggered.filter((a) => !existingIds.has(a.id));
          if (!newOnes.length) return prev;
          fired = true;
          setUnreadCount((c) => c + newOnes.length);
          newOnes.forEach((a) => fireBrowserNotification(a));
          return [...prev, ...newOnes];
        });
        // A trigger flips alert.triggered server-side — revalidate the list.
        if (fired) mutate();
      }
    } catch {
      // Non-critical
    }
  }, [token, mutate]);

  useEffect(() => {
    if (!token) return;
    checkAlerts();
    pollRef.current = setInterval(checkAlerts, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [token, checkAlerts]);

  // ── Actions — write, then revalidate via SWR ────────────────────────────────
  const addToWatchlist = useCallback(async (symbol: string) => {
    if (!token) return;
    track('watchlist_add', { symbol });
    const res = await fetch('/api/notifications/watchlist', {
      method:  'POST',
      headers: authHeaders(token),
      body:    JSON.stringify({ symbol }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error ?? 'Failed to add to watchlist');
    mutate();
  }, [token, mutate]);

  const removeFromWatchlist = useCallback(async (symbol: string) => {
    if (!token) return;
    track('watchlist_remove', { symbol });
    await fetch(`/api/notifications/watchlist?symbol=${encodeURIComponent(symbol)}`, {
      method:  'DELETE',
      headers: authHeaders(token),
    });
    mutate();
  }, [token, mutate]);

  const createAlert = useCallback(async (
    symbol: string,
    targetPrice: number,
    direction: 'above' | 'below',
    label?: string,
  ) => {
    if (!token) return;
    track('alert_create', { symbol, direction });
    const res = await fetch('/api/notifications/alerts', {
      method:  'POST',
      headers: authHeaders(token),
      body:    JSON.stringify({ symbol, targetPrice, direction, label }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error ?? 'Failed to create alert');
    mutate();
  }, [token, mutate]);

  const deleteAlert = useCallback(async (id: string) => {
    if (!token) return;
    track('alert_delete', { id });
    await fetch(`/api/notifications/alerts?id=${encodeURIComponent(id)}`, {
      method:  'DELETE',
      headers: authHeaders(token),
    });
    mutate();
  }, [token, mutate]);

  const markAllRead = useCallback(() => setUnreadCount(0), []);

  const isWatched = useCallback(
    (symbol: string) => watchlist.some((item) => item.symbol === symbol),
    [watchlist]
  );

  return {
    watchlist,
    alerts,
    triggered,
    unreadCount,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refresh: async () => { await mutate(); },
    addToWatchlist,
    removeFromWatchlist,
    createAlert,
    deleteAlert,
    markAllRead,
    isWatched,
  };
}

// ── Browser Push Notification helper ─────────────────────────────────────────

function fireBrowserNotification(alert: TriggeredAlert) {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const symbol = alert.symbol.replace('.NS', '');
  const direction = alert.direction === 'above' ? 'crossed above' : 'dropped below';
  const body = alert.label
    ? `${alert.label} — ₹${alert.currentPrice?.toFixed(2)} ${direction} ₹${alert.targetPrice}`
    : `${symbol} ₹${alert.currentPrice?.toFixed(2)} ${direction} your target ₹${alert.targetPrice}`;

  try {
    new Notification(`Price Alert: ${symbol}`, {
      body,
      icon:  '/favicon.ico',
      badge: '/favicon.ico',
      tag:   `alert-${alert.id}`,
    });
  } catch {
    // Notification API can throw in some browsers
  }
}
