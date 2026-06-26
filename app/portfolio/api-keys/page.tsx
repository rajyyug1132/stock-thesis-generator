'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Panel } from '@/components/ui/panel';
import { SectionLabel } from '@/components/ui/section-label';
import { Pill } from '@/components/ui/pill';
import { track } from '@/lib/analytics';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  tier: 'free' | 'pro';
  revoked: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

interface NewKey extends ApiKey {
  key: string; // raw — shown once only
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: '0.1em',
        padding: '2px 8px',
        background: 'transparent',
        border: '1px solid var(--border-subtle)',
        color: copied ? 'var(--mint)' : 'var(--text-tertiary)',
        cursor: 'pointer',
        marginLeft: '0.5rem',
        transition: 'color 0.15s, border-color 0.15s',
        borderColor: copied ? 'var(--mint)' : undefined,
      }}
    >
      {copied ? 'COPIED' : 'COPY'}
    </button>
  );
}

// API keys use an { ok, data, error } envelope — throw on ok:false so SWR
// surfaces it as an error, not silent empty data.
const keysFetcher = async ([url, token]: [string, string]): Promise<ApiKey[]> => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message ?? 'Failed to load keys');
  return json.data.keys as ApiKey[];
};

export default function ApiKeysPage() {
  const { user, token, loading: authLoading } = useAuth();
  const { data: keys = [], error: loadError, isLoading: loading, mutate } = useSWR<ApiKey[]>(
    token ? ['/api/v2/keys', token] : null,
    keysFetcher,
  );
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<NewKey | null>(null);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  async function createKey() {
    if (!token || !newKeyName.trim()) return;
    track('apikey_create');
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/v2/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? 'Failed to create key');
      setNewKey(json.data);
      setNewKeyName('');
      setShowForm(false);
      await mutate();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: string) {
    if (!token) return;
    track('apikey_revoke');
    setRevoking(id);
    setError(null);
    try {
      const res = await fetch(`/api/v2/keys?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? 'Failed to revoke key');
      await mutate();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRevoking(null);
    }
  }

  // ── Auth gate ──────────────────────────────────────────────────────────────
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
            Sign in to manage API keys.
          </p>
          <Link
            href="/portfolio"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.2em',
              color: 'var(--mint)',
              textDecoration: 'none',
              border: '1px solid var(--mint)',
              padding: '0.5rem 1.25rem',
            }}
          >
            SIGN IN
          </Link>
        </div>
      </main>
    );
  }

  const activeKeys = keys.filter((k) => !k.revoked);
  const revokedKeys = keys.filter((k) => k.revoked);

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-canvas)' }}>
      <div className="max-w-3xl mx-auto px-8 py-12 space-y-10">

        {/* Header */}
        <div>
          <SectionLabel>DEVELOPER · API KEYS</SectionLabel>
          <h1
            className="font-serif mt-2"
            style={{ fontSize: 'var(--text-h1)', color: 'var(--text-primary)', lineHeight: 1.1 }}
          >
            API Keys
          </h1>
          <p className="mt-3" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-body)', maxWidth: '52ch' }}>
            Use API keys to authenticate programmatic access to the Editorial Quant v2 API.
            Keys are prefixed <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--mint)', fontSize: 12 }}>qe_live_</code> and
            shown in full only once at creation.
          </p>
        </div>

        {/* One-time reveal banner */}
        {newKey && (
          <Panel>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <SectionLabel>NEW KEY · COPY NOW</SectionLabel>
              <Pill variant="up">CREATED</Pill>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: '1rem', lineHeight: 1.6 }}>
              This is the only time you&apos;ll see the full key. Store it somewhere safe.
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--bg-input)',
                border: '1px solid var(--mint)',
                padding: '0.75rem 1rem',
                gap: '0.5rem',
              }}
            >
              <code
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--mint)',
                  wordBreak: 'break-all',
                  letterSpacing: '0.04em',
                }}
              >
                {newKey.key}
              </code>
              <CopyButton text={newKey.key} />
            </div>
            <button
              onClick={() => setNewKey(null)}
              style={{
                marginTop: '0.875rem',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.1em',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              I&apos;ve saved it — dismiss
            </button>
          </Panel>
        )}

        {/* Error */}
        {error && (
          <div
            className="font-mono"
            style={{ color: 'var(--down)', fontSize: 'var(--text-small)', padding: '0.5rem 0' }}
          >
            ⚠ {error}
          </div>
        )}

        {/* Active keys */}
        <section className="space-y-4">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <SectionLabel>
              ACTIVE KEYS {activeKeys.length > 0 && `· ${activeKeys.length}/10`}
            </SectionLabel>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                disabled={activeKeys.length >= 10}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.15em',
                  padding: '4px 14px',
                  background: activeKeys.length >= 10 ? 'var(--bg-input)' : 'var(--mint)',
                  border: 'none',
                  color: activeKeys.length >= 10 ? 'var(--text-tertiary)' : 'var(--bg-canvas)',
                  cursor: activeKeys.length >= 10 ? 'not-allowed' : 'pointer',
                }}
              >
                + NEW KEY
              </button>
            )}
          </div>

          {/* Create form */}
          {showForm && (
            <Panel>
              <div style={{ display: 'flex', gap: 0, border: '1px solid var(--border-subtle)' }}>
                <input
                  autoFocus
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') createKey();
                    if (e.key === 'Escape') { setShowForm(false); setNewKeyName(''); }
                  }}
                  placeholder="Key name (e.g. Production server)"
                  maxLength={60}
                  style={{
                    flex: 1,
                    background: 'var(--bg-input)',
                    border: 'none',
                    padding: '0.75rem 1rem',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
                <button
                  onClick={createKey}
                  disabled={creating || !newKeyName.trim()}
                  style={{
                    background: 'var(--mint)',
                    border: 'none',
                    padding: '0 1.25rem',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    letterSpacing: '0.15em',
                    color: 'var(--bg-canvas)',
                    cursor: creating ? 'wait' : 'pointer',
                    opacity: creating || !newKeyName.trim() ? 0.6 : 1,
                  }}
                >
                  {creating ? 'CREATING…' : 'CREATE'}
                </button>
                <button
                  onClick={() => { setShowForm(false); setNewKeyName(''); }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderLeft: '1px solid var(--border-subtle)',
                    padding: '0 0.875rem',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            </Panel>
          )}

          {loading ? (
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--text-quaternary)',
                letterSpacing: '0.1em',
                padding: '1rem 0',
              }}
            >
              LOADING…
            </div>
          ) : loadError ? (
            <Panel>
              <p style={{ color: 'var(--down)', fontSize: 13, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                Could not load your API keys. Refresh to try again.
              </p>
            </Panel>
          ) : activeKeys.length === 0 ? (
            <Panel>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 13, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                No active keys. Create one to get started.
              </p>
            </Panel>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--border-subtle)' }}>
              {activeKeys.map((key) => (
                <div
                  key={key.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    background: 'var(--bg-card)',
                    padding: '0.875rem 1rem',
                  }}
                >
                  {/* Name + prefix */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--text-primary)', fontSize: 14, marginBottom: '3px' }}>
                      {key.name}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>
                      {key.keyPrefix}••••••••••••••••••••••••••••••••
                    </div>
                  </div>

                  {/* Meta */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end', marginBottom: '3px' }}>
                      <Pill>{key.tier.toUpperCase()}</Pill>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-quaternary)', letterSpacing: '0.04em' }}>
                      created {fmtDate(key.createdAt)}
                      {key.lastUsedAt && ` · used ${fmtDate(key.lastUsedAt)}`}
                    </div>
                  </div>

                  {/* Revoke */}
                  <button
                    onClick={() => revokeKey(key.id)}
                    disabled={revoking === key.id}
                    title="Revoke key"
                    style={{
                      flexShrink: 0,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      padding: '4px 10px',
                      background: 'transparent',
                      border: '1px solid var(--border-subtle)',
                      color: revoking === key.id ? 'var(--text-quaternary)' : 'var(--down)',
                      borderColor: revoking === key.id ? 'var(--border-subtle)' : 'var(--down)',
                      cursor: revoking === key.id ? 'wait' : 'pointer',
                      opacity: revoking === key.id ? 0.5 : 1,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    {revoking === key.id ? '…' : 'REVOKE'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Rate limits reference */}
        <Panel label="RATE LIMITS · FREE TIER">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '0 2rem',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
            }}
          >
            {[
              ['Tier', 'Per min', 'Per day'],
              ['Free key', '10', '100'],
              ['Pro key', '60', '5,000'],
              ['JWT user', '60', '1,000'],
              ['Anonymous', '5', '50'],
            ].map(([label, rpm, rpd], i) => (
              <div
                key={i}
                style={{
                  display: 'contents',
                }}
              >
                <span style={{ color: i === 0 ? 'var(--text-tertiary)' : 'var(--text-secondary)', padding: '3px 0', borderBottom: '1px solid var(--border-subtle)' }}>{label}</span>
                <span style={{ color: i === 0 ? 'var(--text-tertiary)' : 'var(--text-primary)', padding: '3px 0', borderBottom: '1px solid var(--border-subtle)', textAlign: 'right' }}>{rpm}</span>
                <span style={{ color: i === 0 ? 'var(--text-tertiary)' : 'var(--text-primary)', padding: '3px 0', borderBottom: '1px solid var(--border-subtle)', textAlign: 'right' }}>{rpd}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Usage snippet */}
        <Panel label="USAGE">
          <pre
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              overflowX: 'auto',
              margin: 0,
            }}
          >
{`curl https://stock-thesis-generator-mae5.vercel.app/api/v2/thesis/RELIANCE \\
  -H "X-API-Key: qe_live_your_key_here"`}
          </pre>
        </Panel>

        {/* Revoked keys (collapsed) */}
        {revokedKeys.length > 0 && (
          <section>
            <SectionLabel>REVOKED KEYS · {revokedKeys.length}</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--border-subtle)', marginTop: '0.75rem', opacity: 0.5 }}>
              {revokedKeys.map((key) => (
                <div
                  key={key.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    background: 'var(--bg-card)',
                    padding: '0.75rem 1rem',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: 13, marginBottom: '2px', textDecoration: 'line-through' }}>
                      {key.name}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-quaternary)', letterSpacing: '0.06em' }}>
                      {key.keyPrefix}••• · revoked
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-quaternary)' }}>
                    {fmtDate(key.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </main>
  );
}
