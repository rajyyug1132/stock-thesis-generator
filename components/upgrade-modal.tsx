'use client';

import { useState } from 'react';
import { SectionLabel } from '@/components/ui/section-label';
import { TIER_FEATURES, UPGRADE_REASON_COPY } from '@/lib/entitlements';

interface UpgradeModalProps {
  open: boolean;
  reason?: string;
  /** Provide to make the modal dismissible (soft gate). Omit for a hard block. */
  onClose?: () => void;
}

export function UpgradeModal({ open, reason = 'default', onClose }: UpgradeModalProps) {
  const [requested, setRequested] = useState(false);
  if (!open) return null;

  const dismissible = !!onClose;
  const blurb = UPGRADE_REASON_COPY[reason] ?? UPGRADE_REASON_COPY.default;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={dismissible ? onClose : undefined}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 440,
          background: 'var(--bg-card)', border: '1px solid var(--border-strong)',
          padding: '2rem',
        }}
      >
        <SectionLabel>UPGRADE TO PRO</SectionLabel>
        <h2
          className="font-serif"
          style={{ fontSize: 'var(--text-h3)', color: 'var(--text-primary)', margin: '8px 0 4px', lineHeight: 1.2 }}
        >
          {blurb}
        </h2>

        {/* Tier comparison */}
        <div style={{ margin: '1.25rem 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0 1.25rem', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
            <span style={{ color: 'var(--text-tertiary)' }} />
            <span style={{ color: 'var(--text-tertiary)', textAlign: 'right', letterSpacing: '0.1em' }}>FREE</span>
            <span style={{ color: 'var(--accent)', textAlign: 'right', letterSpacing: '0.1em' }}>PRO</span>
            {TIER_FEATURES.map((row) => (
              <div key={row.label} style={{ display: 'contents' }}>
                <span style={{ color: 'var(--text-secondary)', padding: '5px 0', borderTop: '1px solid var(--border-subtle)' }}>{row.label}</span>
                <span style={{ color: 'var(--text-tertiary)', textAlign: 'right', padding: '5px 0', borderTop: '1px solid var(--border-subtle)' }}>{row.free}</span>
                <span style={{ color: 'var(--text-primary)', textAlign: 'right', padding: '5px 0', borderTop: '1px solid var(--border-subtle)' }}>{row.paid}</span>
              </div>
            ))}
          </div>
        </div>

        {requested ? (
          <p style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-small)', margin: '0 0 0.5rem', lineHeight: 1.6 }}>
            ✓ Pro is launching soon — we&apos;ll let you know the moment it&apos;s live.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setRequested(true)}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            UPGRADE TO PRO
          </button>
        )}

        {dismissible && (
          <button
            type="button"
            onClick={onClose}
            style={{
              marginTop: '0.875rem', width: '100%', textAlign: 'center',
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.15em',
              color: 'var(--text-tertiary)', padding: 0,
            }}
          >
            MAYBE LATER
          </button>
        )}
      </div>
    </div>
  );
}
