'use client';

import { useState, useRef, useEffect } from 'react';
import type { NotificationsState } from '@/hooks/use-notifications';

interface NotificationBellProps {
  notifications: NotificationsState;
}

export function NotificationBell({ notifications }: NotificationBellProps) {
  const { unreadCount, triggered, markAllRead } = notifications;
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function handleOpen() {
    setOpen((v) => !v);
    if (!open && unreadCount > 0) markAllRead();
  }

  return (
    <div style={{ position: 'relative' }} ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} new)` : ''}`}
        style={{
          position:   'relative',
          background: 'transparent',
          border:     '1px solid var(--border-subtle)',
          color:      unreadCount > 0 ? 'var(--mint)' : 'var(--text-secondary)',
          padding:    '0.375rem 0.625rem',
          cursor:     'pointer',
          display:    'flex',
          alignItems: 'center',
          gap:        '0.375rem',
          fontFamily: 'var(--font-mono)',
          fontSize:   10,
          letterSpacing: '0.1em',
          transition: 'color 0.15s, border-color 0.15s',
          borderColor: unreadCount > 0 ? 'var(--mint)' : 'var(--border-subtle)',
        }}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span
            style={{
              position:   'absolute',
              top:        2,
              right:      2,
              width:      8,
              height:     8,
              borderRadius: '50%',
              background: 'var(--mint)',
            }}
          />
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position:   'absolute',
            right:      0,
            top:        'calc(100% + 8px)',
            width:      320,
            background: 'var(--bg-surface)',
            border:     '1px solid var(--border-subtle)',
            zIndex:     100,
            maxHeight:  400,
            overflowY:  'auto',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding:      '0.75rem 1rem',
              borderBottom: '1px solid var(--border-subtle)',
              display:      'flex',
              justifyContent: 'space-between',
              alignItems:   'center',
            }}
          >
            <span
              style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      10,
                letterSpacing: '0.2em',
                color:         'var(--text-secondary)',
              }}
            >
              ALERTS FIRED
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize:   10,
                color:      'var(--mint)',
              }}
            >
              {triggered.length} total
            </span>
          </div>

          {/* Alert items */}
          {triggered.length === 0 ? (
            <div
              style={{
                padding:   '1.5rem 1rem',
                textAlign: 'center',
                color:     'var(--text-tertiary)',
                fontSize:  13,
              }}
            >
              No alerts fired yet
            </div>
          ) : (
            [...triggered].reverse().map((a) => (
              <div
                key={a.id}
                style={{
                  padding:      '0.75rem 1rem',
                  borderBottom: '1px solid var(--border-grid)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span
                    style={{
                      fontFamily:    'var(--font-mono)',
                      fontSize:      11,
                      fontWeight:    600,
                      color:         'var(--text-primary)',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {a.symbol.replace('.NS', '')}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize:   10,
                      color:      a.direction === 'above' ? 'var(--up)' : 'var(--down)',
                    }}
                  >
                    {a.direction === 'above' ? '▲' : '▼'} ₹{a.targetPrice.toLocaleString('en-IN')}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {a.label ?? `Price ${a.direction} target`}
                  {a.currentPrice != null && (
                    <span style={{ color: 'var(--text-tertiary)', marginLeft: 6 }}>
                      · Current ₹{a.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
