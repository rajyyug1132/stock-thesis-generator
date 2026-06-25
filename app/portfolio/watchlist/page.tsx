'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useNotificationsContext } from '@/providers/notifications-provider';
import { Panel } from '@/components/ui/panel';
import { ErrorCard } from '@/components/ui/error-card';
import { NewsDigest } from '@/components/notifications/news-digest';

export default function WatchlistPage() {
  const { user, loading: authLoading } = useAuth();
  const notifications = useNotificationsContext();
  const { watchlist, alerts, error, refresh, removeFromWatchlist, deleteAlert } = notifications;

  const [activeTab, setActiveTab] = useState<'watchlist' | 'alerts' | 'digest'>('watchlist');

  if (authLoading) {
    return (
      <main style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)' }}>
          LOADING…
        </span>
      </main>
    );
  }

  if (!user) {
    return (
      <main style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: '1rem' }}>
            Sign in to use watchlists and price alerts.
          </p>
          <Link
            href="/portfolio"
            style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      10,
              letterSpacing: '0.2em',
              color:         'var(--mint)',
              textDecoration: 'none',
              border:        '1px solid var(--mint)',
              padding:       '0.5rem 1.25rem',
            }}
          >
            SIGN IN
          </Link>
        </div>
      </main>
    );
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    background:    active ? 'var(--mint-muted)' : 'transparent',
    border:        `1px solid ${active ? 'var(--mint)' : 'var(--border-subtle)'}`,
    color:         active ? 'var(--mint)' : 'var(--text-secondary)',
    padding:       '0.375rem 1rem',
    fontFamily:    'var(--font-mono)',
    fontSize:      10,
    letterSpacing: '0.15em',
    cursor:        'pointer',
  });

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Page header */}
      <div style={{ marginBottom: '2rem' }}>
        <div
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      9,
            letterSpacing: '0.25em',
            color:         'var(--text-tertiary)',
            marginBottom:  '0.5rem',
          }}
        >
          PORTFOLIO · WATCHLIST
        </div>
        <h1
          style={{
            fontFamily:  'var(--font-serif)',
            fontSize:    '2rem',
            fontStyle:   'italic',
            color:       'var(--text-primary)',
            margin:      0,
          }}
        >
          Watchlist &amp; Alerts
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: '0.5rem' }}>
          Track stocks, set price alerts, and read your personalised news digest.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button style={tabStyle(activeTab === 'watchlist')} onClick={() => setActiveTab('watchlist')}>
          WATCHLIST ({watchlist.length})
        </button>
        <button style={tabStyle(activeTab === 'alerts')} onClick={() => setActiveTab('alerts')}>
          PRICE ALERTS ({alerts.filter((a) => !a.triggered).length})
        </button>
        <button style={tabStyle(activeTab === 'digest')} onClick={() => setActiveTab('digest')}>
          NEWS DIGEST
        </button>
      </div>

      {/* Fetch error — shown instead of misleading empty lists */}
      {error && (
        <div style={{ marginBottom: '1.5rem' }}>
          <ErrorCard message={error} onRetry={refresh} />
        </div>
      )}

      {/* Watchlist tab */}
      {activeTab === 'watchlist' && (
        <Panel label="WATCHING">
          {watchlist.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
              Your watchlist is empty. Visit any{' '}
              <Link href="/" style={{ color: 'var(--mint)' }}>stock page</Link> and click{' '}
              <strong>☆ WATCH</strong>.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', padding: '0.5rem 0' }}>
              {watchlist.map((item) => {
                const sym = item.symbol.replace('.NS', '');
                const symbolAlerts = alerts.filter((a) => a.symbol === item.symbol && !a.triggered);
                return (
                  <div
                    key={item.id}
                    style={{
                      border:     '1px solid var(--border-subtle)',
                      padding:    '0.875rem',
                      display:    'flex',
                      flexDirection: 'column',
                      gap:        '0.5rem',
                    }}
                  >
                    <Link
                      href={`/stock/${sym}`}
                      style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      13,
                        fontWeight:    600,
                        color:         'var(--text-primary)',
                        textDecoration: 'none',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {sym}
                    </Link>
                    {symbolAlerts.length > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--mint)' }}>
                        {symbolAlerts.length} alert{symbolAlerts.length > 1 ? 's' : ''} active
                      </span>
                    )}
                    <button
                      onClick={() => removeFromWatchlist(item.symbol)}
                      style={{
                        background:    'transparent',
                        border:        '1px solid var(--border-subtle)',
                        color:         'var(--text-tertiary)',
                        padding:       '0.25rem',
                        fontFamily:    'var(--font-mono)',
                        fontSize:      9,
                        letterSpacing: '0.1em',
                        cursor:        'pointer',
                        marginTop:     'auto',
                      }}
                    >
                      REMOVE
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      )}

      {/* Alerts tab */}
      {activeTab === 'alerts' && (
        <Panel label="PRICE ALERTS">
          {alerts.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
              No alerts yet. Visit any stock page to set a price alert.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {alerts.map((a, i) => (
                <div
                  key={a.id}
                  style={{
                    display:        'flex',
                    alignItems:     'center',
                    gap:            '1rem',
                    padding:        '0.875rem 1rem',
                    borderBottom:   i < alerts.length - 1 ? '1px solid var(--border-grid)' : 'none',
                    opacity:        a.triggered ? 0.5 : 1,
                  }}
                >
                  <span
                    style={{
                      fontFamily:    'var(--font-mono)',
                      fontSize:      11,
                      fontWeight:    600,
                      color:         'var(--text-primary)',
                      letterSpacing: '0.05em',
                      minWidth:      60,
                    }}
                  >
                    {a.symbol.replace('.NS', '')}
                  </span>
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
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>
                      {a.label}
                    </span>
                  )}
                  {a.triggered && (
                    <span
                      style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      9,
                        color:         'var(--up)',
                        border:        '1px solid var(--up)',
                        padding:       '1px 6px',
                        letterSpacing: '0.1em',
                        marginLeft:    'auto',
                      }}
                    >
                      TRIGGERED
                    </span>
                  )}
                  <button
                    onClick={() => deleteAlert(a.id)}
                    style={{
                      background:  'transparent',
                      border:      'none',
                      color:       'var(--text-tertiary)',
                      cursor:      'pointer',
                      fontSize:    18,
                      lineHeight:  1,
                      padding:     '0 4px',
                      marginLeft:  'auto',
                    }}
                    aria-label="Delete alert"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {/* News digest tab */}
      {activeTab === 'digest' && (
        <Panel label="NEWS DIGEST — YOUR WATCHLIST">
          <NewsDigest watchlist={watchlist} />
        </Panel>
      )}
    </main>
  );
}
