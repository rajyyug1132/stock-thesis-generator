/* eslint-disable */
/* GroundedClaim — claim + EV evidence + citation superscript.
   Mirrors Stocks/components/ui/grounded-claim.tsx + citation.tsx. */

const { useState } = React;

function Citation({ n, reason, tone = 'unverified' }) {
  const [open, setOpen] = useState(false);
  const color = tone === 'grounded' ? 'var(--grounded)' : 'var(--unverified)';
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <sup
        style={{
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: '0.75em',
          color, marginLeft: 2, cursor: 'help', userSelect: 'none',
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
      >
        <span style={{ color: 'var(--text-tertiary)' }}>·</span>{n}
      </sup>
      {open && (
        <span style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 50, marginTop: 4,
          width: 260, padding: 12, background: 'var(--bg-card)',
          border: '1px solid var(--border-strong)', color: 'var(--text-secondary)',
          fontSize: 'var(--text-small)', fontFamily: 'var(--font-sans)', fontStyle: 'normal',
          textTransform: 'none', lineHeight: 1.5, textAlign: 'left',
        }}>
          <span style={{ color, fontWeight: 500 }}>[{n}] </span>{reason}
        </span>
      )}
    </span>
  );
}

function GroundedClaim({ claim, evidence, citationN, verified, reason }) {
  return (
    <li style={{ listStyle: 'none' }}>
      <div style={{
        fontSize: 'var(--text-body)', color: 'var(--text-primary)',
        lineHeight: 1.55, display: 'inline',
      }}>
        {claim}
        <Citation n={citationN} reason={reason} tone={verified ? 'grounded' : 'unverified'} />
      </div>
      <div style={{
        marginTop: 2,
        fontFamily: 'var(--font-mono)', fontSize: 'var(--text-micro)',
        color: 'var(--text-tertiary)', letterSpacing: '0.04em', lineHeight: 1.4,
      }}>
        <span style={{ color: 'var(--text-quaternary)' }}>EV · </span>{evidence}
      </div>
    </li>
  );
}

Object.assign(window, { Citation, GroundedClaim });
