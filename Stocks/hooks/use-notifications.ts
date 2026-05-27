'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PriceAlert, WatchlistItem } from '@/lib/db/schema';

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

export function useNotifications(token: string | null): NotificationsState {
  const [watchlist, setWatchlist]     = useState<WatchlistItem[]>([]);
  const [alerts, setAlerts]           = useState<PriceAlert[]>([]);
  const [triggered, setTriggered]     = useState<TriggeredAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading]         = useState(false);
  const pollRef                       = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch watchlist + alerts ──────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [wl, al] = await Promise.all([
        fetch('/api/notifications/watchlist', { headers: authHeaders(token) }).then((r) => r.json()),
        fetch('/api/notifications/alerts',    { headers: authHeaders(token) }).then((r) => r.json()),
      ]);
      setWatchlist(wl.watchlist ?? []);
      setAlerts(al.alerts ?? []);
    } catch {
      // Silently fail — notifications are non-critical
    } finally {
      setLoading(false);
    }
  }, [token]);

  // ── Check for triggered alerts ────────────────────────────────────────────

  const checkAlerts = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications/check', { headers: authHeaders(token) });
      if (!res.ok) return;
      const data: { triggered: TriggeredAlert[] } = await res.json();
      if (data.triggered?.length) {
        setTriggered((prev) => {
          const existingIds = new Set(prev.map((a) => a.id));
          const newOnes = data.triggered.filter((a) => !existingIds.has(a.id));
          if (!newOnes.length) return prev;
          setUnreadCount((c) => c + newOnes.length);
          // Fire browser notification for each new trigger
          newOnes.forEach((a) => fireBrowserNotification(a));
          return [...prev, ...newOnes];
        });
        // Refresh alerts list (triggered ones are now marked)
        fetch('/api/notifications/alerts', { headers: authHeaders(token) })
          .then((r) => r.json())
          .then((d) => setAlerts(d.alerts ?? []))
          .catch(() => {});
      }
    } catch {
      // Non-critical
    }
  }, [token]);

  // ── Load on mount + poll ──────────────────────────────────────────────────

  useEffect(() => {
    if (!token) return;
    fetchAll();
    checkAlerts();

    pollRef.current = setInterval(checkAlerts, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [token, fetchAll, checkAlerts]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const addToWatchlist = useCallback(async (symbol: string) => {
    if (!token) return;
    const res = await fetch('/api/notifications/watchlist', {
      method:  'POST',
      headers: authHeaders(token),
      body:    JSON.stringify({ symbol }),
    });
    const data = await res.json();
    if (res.ok) {
      setWatchlist((prev) => [...prev, data.item]);
    } else {
      throw new Error(data.error ?? 'Failed to add to watchlist');
    }
  }, [token]);

  const removeFromWatchlist = useCallback(async (symbol: string) => {
    if (!token) return;
    await fetch(`/api/notifications/watchlist?symbol=${encodeURIComponent(symbol)}`, {
      method:  'DELETE',
      headers: authHeaders(token),
    });
    setWatchlist((prev) => prev.filter((item) => item.symbol !== symbol));
  }, [token]);

  const createAlert = useCallback(async (
    symbol: string,
    targetPrice: number,
    direction: 'above' | 'below',
    label?: string,
  ) => {
    if (!token) return;
    const res = await fetch('/api/notifications/alerts', {
      method:  'POST',
      headers: authHeaders(token),
      body:    JSON.stringify({ symbol, targetPrice, direction, label }),
    });
    const data = await res.json();
    if (res.ok) {
      setAlerts((prev) => [...prev, data.alert]);
    } else {
      throw new Error(data.error ?? 'Failed to create alert');
    }
  }, [token]);

  const deleteAlert = useCallback(async (id: string) => {
    if (!token) return;
    await fetch(`/api/notifications/alerts?id=${encodeURIComponent(id)}`, {
      method:  'DELETE',
      headers: authHeaders(token),
    });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, [token]);

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
    loading,
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
