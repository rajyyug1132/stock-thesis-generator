'use client';

import { useState } from 'react';
import type { NotificationsState } from '@/hooks/use-notifications';

interface AlertSetupProps {
  symbol:        string;
  currentPrice?: number;
  notifications: NotificationsState;
}

export function AlertSetup({ symbol, currentPrice, notifications }: AlertSetupProps) {
  const { alerts, createAlert, deleteAlert, isWatched, addToWatchlist, removeFromWatchlist } = notifications;

  const [targetPrice,  setTargetPrice]  = useState(currentPrice?.toFixed(2) ?? '');
  const [direction,    setDirection]    = useState<'above' | 'below'>('above');
  const [label,        setLabel]        = useState('');
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [notifGranted, setNotifGranted] = useState(
    typeof window !== 'undefined' ? Notification.permission === 'granted' : false
  );

  const symbolAlerts = alerts.filter((a) => a.symbol === symbol && !a.triggered);
  const watched      = isWatched(symbol);

  async function requestNotificationPermission() {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotifGranted(perm === 'granted');
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) {
      setError('Enter a valid price');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await createAlert(symbol, price, direction, label.trim() || undefined);
      setTargetPrice(currentPrice?.toFixed(2) ?? '');
      setLabel('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleWatchlistToggle() {
    try {
      if (watched) {
        await removeFromWatchlist(symbol);
      } else {
        await addToWatchlist(symbol);
      }
    } catch {
      // ignore
    }
  }

  const baseInput: React.CSSProperties = {
    background:  'var(--bg-input)',
    border:      '1px solid var(--border-subtle)',
    color:       'var(--text-primary)',
    padding:     '0.5rem 0.75rem',
    fontFamily:  'var(--font-mono)',
    fontSize:    13,
    outline:     'none',
    width:       '100%',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Watchlist toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          onClick={handleWatchlistToggle}
          style={{
            background:    watched ? 'var(--mint-muted)' : 'transparent',
            border:        `1px solid ${watched ? 'var(--mint)' : 'var(--border-subtle)'}`,
            color:         watched ? 'var(--mint)' : 'var(--text-secondary)',
            padding:       '0.375rem 0.875rem',
            fontFamily:    'var(--font-mono)',
            fontSize:      10,
            letterSpacing: '0.15em',
            cursor:        'pointer',
          }}
        >
          {watched ? '★ WATCHING' : '☆ WATCH'}
        </button>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          {watched ? 'Removes from your watchlist' : 'Adds to your watchlist for news digest'}
        </span>
      </div>

      {/* Browser notification permission */}
      {!notifGranted && (
        <div
          style={{
            padding:     '0.625rem 0.875rem',
            background:  'var(--bone-faint)',
            border:      '1px solid var(--border-subtle)',
            display:     'flex',
            alignItems:  'center',
            gap:         '0.75rem',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>
            Enable browser notifications to get alerted when price targets are hit.
          </span>
          <button
            onClick={requestNotificationPermission}
            style={{
              background:    'var(--mint)',
              border:        'none',
              color:         'var(--bg-canvas)',
              padding:       '0.375rem 0.875rem',
              fontFamily:    'var(--font-mono)',
              fontSize:      10,
              letterSpacing: '0.15em',
              cursor:        'pointer',
              whiteSpace:    'nowrap',
            }}
          >
            ALLOW
          </button>
        </div>
      )}

      {/* Create alert form */}
      <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      10,
            letterSpacing: '0.2em',
            color:         'var(--text-tertiary)',
          }}
        >
          NEW PRICE ALERT
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {/* Direction toggle */}
          {(['above', 'below'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDirection(d)}
              style={{
                flex:          1,
                background:    direction === d
                  ? (d === 'above' ? 'var(--up-soft)' : 'var(--down-soft)')
                  : 'transparent',
                border:        `1px solid ${direction === d
                  ? (d === 'above' ? 'var(--up)' : 'var(--down)')
                  : 'var(--border-subtle)'}`,
                color:         direction === d
                  ? (d === 'above' ? 'var(--up)' : 'var(--down)')
                  : 'var(--text-secondary)',
                padding:       '0.5rem',
                fontFamily:    'var(--font-mono)',
                fontSize:      10,
                letterSpacing: '0.15em',
                cursor:        'pointer',
              }}
            >
              {d === 'above' ? '▲ ABOVE' : '▼ BELOW'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span
              style={{
                position:  'absolute',
                left:      '0.75rem',
                top:       '50%',
                transform: 'translateY(-50%)',
                color:     'var(--text-tertiary)',
                fontFamily: 'var(--font-mono)',
                fontSize:  13,
                pointerEvents: 'none',
              }}
            >
              ₹
            </span>
            <input
              type="number"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="Target price"
              min="0"
              step="0.05"
              required
              style={{ ...baseInput, paddingLeft: '1.75rem' }}
            />
          </div>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Note (optional)"
            maxLength={60}
            style={{ ...baseInput, flex: 1 }}
          />
        </div>

        {error && (
          <p style={{ fontSize: 12, color: 'var(--down)', margin: 0 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          style={{
            background:    saving ? 'var(--bg-input)' : 'var(--mint)',
            border:        'none',
            color:         saving ? 'var(--text-tertiary)' : 'var(--bg-canvas)',
            padding:       '0.625rem',
            fontFamily:    'var(--font-mono)',
            fontSize:      10,
            letterSpacing: '0.2em',
            cursor:        saving ? 'wait' : 'pointer',
          }}
        >
          {saving ? 'SAVING…' : 'SET ALERT'}
        </button>
      </form>

      {/* Existing active alerts for this symbol */}
      {symbolAlerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <div
            style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      10,
              letterSpacing: '0.2em',
              color:         'var(--text-tertiary)',
              marginBottom:  4,
            }}
          >
            ACTIVE ALERTS
          </div>
          {symbolAlerts.map((a) => (
            <div
              key={a.id}
              style={{
                display:        'flex',
                justifyContent: 'space-between',
                alignItems:     'center',
                padding:        '0.5rem 0.75rem',
                background:     'var(--bg-input)',
                border:         '1px solid var(--border-grid)',
              }}
            >
              <div>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize:   12,
                    color:      a.direction === 'above' ? 'var(--up)' : 'var(--down)',
                  }}
                >
                  {a.direction === 'above' ? '▲' : '▼'} ₹{a.targetPrice.toLocaleString('en-IN')}
                </span>
                {a.label && (
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 8 }}>
                    {a.label}
                  </span>
                )}
              </div>
              <button
                onClick={() => deleteAlert(a.id)}
                style={{
                  background: 'transparent',
                  border:     'none',
                  color:      'var(--text-tertiary)',
                  cursor:     'pointer',
                  fontSize:   16,
                  lineHeight: 1,
                  padding:    '0 4px',
                }}
                aria-label="Delete alert"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
