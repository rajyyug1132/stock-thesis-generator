'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { authedFetcher } from '@/lib/swr';
import { SectionLabel } from '@/components/ui/section-label';
import { Panel } from '@/components/ui/panel';
import { ErrorCard } from '@/components/ui/error-card';
import { track } from '@/lib/analytics';
import type { SimulationSnapshot } from '@/lib/db/schema';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthRestore } from '@/hooks/use-auth-restore';

/* ── Login Gate ────────────────────────────────────────────────────────────── */
function LoginGate() {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [sending, setSending] = useState(false);
  const { signIn }            = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    const ok = await signIn(email);
    if (ok) setSent(true);
    setSending(false);
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <Panel label="SIGN IN TO PORTFOLIO">
        {sent ? (
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-small)', lineHeight: 1.6 }}>
            ✓ Magic link sent to <strong style={{ color: 'var(--accent)' }}>{email}</strong>.
            Check ur inbox and click the link to sign in.
          </p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--text-small)', lineHeight: 1.6 }}>
              Save and restore portfolio simulations across sessions. No password — magic link only.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  flex: 1,
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-small)',
                  padding: '8px 12px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={sending}
                className="btn btn-primary"
                style={{ flexShrink: 0 }}
              >
                {sending ? '…' : 'SEND LINK'}
              </button>
            </div>
          </form>
        )}
      </Panel>
    </div>
  );
}

/* ── Snapshot Card ─────────────────────────────────────────────────────────── */
function SnapshotCard({ snapshot, onDelete }: { snapshot: SimulationSnapshot; onDelete: () => void }) {
  const href = `/compare?symbols=${snapshot.symbols.join(',')}&weights=${snapshot.weights.join(',')}&horizon=${snapshot.horizonDays}`;
  const metrics = snapshot.computedMetrics as Record<string, number> | null;
  const date    = new Date(snapshot.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--text-body)' }}>
            {snapshot.name}
          </p>
          <p style={{ margin: '2px 0 0', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-micro)', color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}>
            {date} · {snapshot.symbols.length} STOCKS · {snapshot.horizonDays}D
          </p>
        </div>
        <button
          onClick={onDelete}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-quaternary)', fontSize: 'var(--text-micro)',
            fontFamily: 'var(--font-mono)', padding: 0,
          }}
          aria-label="delete"
        >
          ✕
        </button>
      </div>

      {/* Symbols */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {snapshot.symbols.map((sym, i) => (
          <span
            key={sym}
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 'var(--text-micro)',
              letterSpacing: '0.07em', padding: '2px 7px',
              border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
            }}
          >
            {sym} {(snapshot.weights[i] * 100).toFixed(0)}%
          </span>
        ))}
      </div>

      {/* Metrics row */}
      {metrics && (
        <div style={{ display: 'flex', gap: 24, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.04em' }}>
          {metrics.sharpe != null && (
            <div>
              <span style={{ color: 'var(--text-quaternary)' }}>SHARPE </span>
              <span style={{ color: metrics.sharpe >= 0 ? 'var(--up)' : 'var(--down)' }}>{metrics.sharpe.toFixed(2)}</span>
            </div>
          )}
          {metrics.var95 != null && (
            <div>
              <span style={{ color: 'var(--text-quaternary)' }}>VaR95 </span>
              <span style={{ color: 'var(--down)' }}>{(metrics.var95 * 100).toFixed(1)}%</span>
            </div>
          )}
          {metrics.probLoss != null && (
            <div>
              <span style={{ color: 'var(--text-quaternary)' }}>P(LOSS) </span>
              <span style={{ color: 'var(--text-secondary)' }}>{(metrics.probLoss * 100).toFixed(0)}%</span>
            </div>
          )}
        </div>
      )}

      {/* Restore link */}
      <Link
        href={href}
        onClick={() => track('snapshot_restore', { symbols: snapshot.symbols.length })}
        style={{
          fontFamily: 'var(--font-mono)', fontSize: 'var(--text-micro)',
          letterSpacing: '0.1em', color: 'var(--accent)',
          textTransform: 'uppercase', textDecoration: 'none',
          alignSelf: 'flex-start',
        }}
      >
        RESTORE SIMULATION →
      </Link>
    </div>
  );
}

interface RestoreBannerProps {
  onRestoreComplete: () => void;
}

function RestoreBanner({ onRestoreComplete }: RestoreBannerProps) {
  const { restoreStatus } = useAuthRestore();

  useEffect(() => {
    if (restoreStatus === 'done') {
      onRestoreComplete();
    }
  }, [restoreStatus, onRestoreComplete]);

  return (
    <AnimatePresence>
      {restoreStatus === 'restoring' && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'var(--mint-soft)',
            borderBottom: '1px solid rgba(168,199,186,0.2)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.15em',
            color: 'var(--mint)',
          }}
        >
          RESTORING SIMULATION FROM PREVIOUS SESSION...
        </motion.div>
      )}
      {restoreStatus === 'done' && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'var(--mint-soft)',
            borderBottom: '1px solid rgba(168,199,186,0.2)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.15em',
            color: 'var(--mint)',
          }}
        >
          ✓ SIMULATION RESTORED AND SAVED TO PORTFOLIO
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Portfolio Page ────────────────────────────────────────────────────────── */
export default function PortfolioPage() {
  const { user, token, loading } = useAuth();
  const { data, error, isLoading, mutate } = useSWR<{ snapshots: SimulationSnapshot[] }>(
    user && token ? ['/api/snapshots', token] : null,
    authedFetcher,
  );
  const snapshots = data?.snapshots ?? [];

  const refreshSnapshots = useCallback(() => { mutate(); }, [mutate]);

  async function handleDelete(id: string) {
    if (!token) return;
    track('snapshot_delete', { id });
    await fetch(`/api/snapshots/${id}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token}` },
    });
    mutate();
  }

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-canvas)' }}>
      {/* Restore banner wrapped in Suspense */}
      <Suspense fallback={null}>
        <RestoreBanner onRestoreComplete={refreshSnapshots} />
      </Suspense>

      <div className="column" style={{ padding: '48px 32px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <SectionLabel>PORTFOLIO · SAVED SIMULATIONS</SectionLabel>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 'clamp(2rem, 4vw, 3.5rem)', color: 'var(--text-primary)', lineHeight: 1.05, margin: '8px 0 0', letterSpacing: '-0.015em' }}>
            Your saved<br />
            <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>simulations.</span>
          </h1>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-small)' }}>
            LOADING…
          </p>
        ) : !user ? (
          <LoginGate />
        ) : (
          <>
            {/* Nav links */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: 32 }}>
              <Link href="/compare" className="btn btn-outline">
                + NEW SIMULATION
              </Link>
              <Link
                href="/portfolio/watchlist"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.15em',
                  padding: '6px 16px',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                WATCHLIST &amp; ALERTS
              </Link>
              <Link
                href="/portfolio/api-keys"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.15em',
                  padding: '6px 16px',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                API KEYS
              </Link>
            </div>

            {/* Snapshots grid */}
            {isLoading ? (
              <p style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-small)' }}>
                FETCHING SNAPSHOTS…
              </p>
            ) : error ? (
              <ErrorCard message="Could not load your saved simulations." onRetry={refreshSnapshots} />
            ) : snapshots.length === 0 ? (
              <Panel label="NO SAVED SIMULATIONS">
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--text-small)', lineHeight: 1.6 }}>
                  Run a simulation on the compare page and type{' '}
                  <kbd style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg-input)', padding: '1px 6px', border: '1px solid var(--border-strong)' }}>
                    save
                  </kbd>{' '}
                  in the Command Palette (CTRL+K) to save it here.
                </p>
              </Panel>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {snapshots.map((snap) => (
                  <SnapshotCard
                    key={snap.id}
                    snapshot={snap}
                    onDelete={() => handleDelete(snap.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
