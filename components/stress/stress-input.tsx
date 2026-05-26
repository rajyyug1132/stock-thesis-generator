'use client';

import { useState } from 'react';

const PRESETS = [
  'Oil prices spike 20%',
  'RBI raises rates 50bps',
  'Black swan event — markets crash',
  'Tech sell-off — IT stocks down',
];

interface StressInputProps {
  onSubmit: (query: string) => void;
  onClear: () => void;
  active: boolean;
  loading: boolean;
}

export function StressInput({ onSubmit, onClear, active, loading }: StressInputProps) {
  const [query, setQuery] = useState('');

  function submit(q: string) {
    if (q.trim()) onSubmit(q.trim());
  }

  return (
    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem', marginTop: '2rem' }}>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.2em',
          color: 'var(--mint)',
          marginBottom: '0.75rem',
        }}
      >
        STRESS TEST · LLM → GBM
      </div>

      <div style={{ display: 'flex', gap: 0, border: '1px solid var(--border-subtle)' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit(query)}
          placeholder="What if oil spikes 20% and rupee weakens?"
          style={{
            flex: 1,
            background: 'var(--bg-input)',
            border: 'none',
            padding: '0.875rem 1rem',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            outline: 'none',
          }}
        />
        <button
          onClick={() => submit(query)}
          disabled={loading || !query.trim()}
          style={{
            background: loading || !query.trim() ? 'var(--bg-input)' : 'var(--mint)',
            color: loading || !query.trim() ? 'var(--text-tertiary)' : 'var(--bg-canvas)',
            border: 'none',
            padding: '0 1.5rem',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.2em',
            cursor: loading ? 'wait' : !query.trim() ? 'not-allowed' : 'pointer',
            flexShrink: 0,
          }}
        >
          {loading ? 'PARSING…' : 'SIMULATE →'}
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.875rem', alignItems: 'center' }}>
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => { setQuery(p); submit(p); }}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.1em',
              padding: '0.375rem 0.75rem',
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
            }}
          >
            {p}
          </button>
        ))}
        {active && (
          <button
            onClick={() => { setQuery(''); onClear(); }}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.1em',
              padding: '0.375rem 0.75rem',
              background: 'transparent',
              border: '1px solid var(--rust)',
              color: 'var(--rust)',
              cursor: 'pointer',
              marginLeft: 'auto',
            }}
          >
            CLEAR STRESS
          </button>
        )}
      </div>
    </div>
  );
}
