'use client';

import { useState } from 'react';
import { Citation } from './citation';

interface VerificationPillProps {
  value: string;
  verified: boolean;
  evidence: string;
  reason: string;
}

function VerificationPill({ value, verified, evidence, reason }: VerificationPillProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center ml-1.5 select-none align-baseline">
      <span
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          fontSize: '9px',
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          lineHeight: '10px',
          height: '13px',
          padding: '0 4px',
          border: `1px solid ${verified ? 'var(--up)' : 'var(--unverified)'}`,
          background: verified ? 'var(--up-soft)' : 'rgba(184, 163, 130, 0.05)',
          color: verified ? 'var(--up)' : 'var(--unverified)',
          cursor: 'help',
          textTransform: 'uppercase',
        }}
      >
        {value} · {verified ? '✓' : '⚠'}
      </span>

      {open && (
        <span
          role="tooltip"
          className="absolute z-50 p-3 text-left normal-case shadow-2xl"
          style={{
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '6px',
            width: '280px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-strong)',
            color: 'var(--text-primary)',
            fontSize: 'var(--text-small)',
            fontFamily: 'var(--font-sans)',
            fontWeight: 'normal',
            lineHeight: 1.45,
          }}
        >
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: verified ? 'var(--up)' : 'var(--unverified)', marginBottom: '6px', fontWeight: 600 }}>
            {verified ? '✓ VERIFIED DATA POINT' : '⚠ UNVERIFIED DATA POINT'}
          </div>
          <div style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>
            <strong>Claimed:</strong> {value}
          </div>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-tertiary)' }}>EVIDENCE REFERENCE:</span>
            <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)', fontSize: '11px' }}>{evidence}</p>
          </div>
          <div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-tertiary)' }}>VALIDATION PROOF:</span>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{reason}</p>
          </div>
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-strong" style={{ borderTopColor: 'var(--border-strong)' }} />
        </span>
      )}
    </span>
  );
}

interface GroundedClaimProps {
  claim: string;
  evidence: string;
  citationN: number;
  verified: boolean;
  verificationReason: string;
}

function extractNumericClaim(text: string): string | null {
  const match = text.match(/(\d+(?:\.\d+)?%|₹\d+(?:\.\d+)?(?:\s*Cr)?|\b\d+\.\d+\s*(?:x|yoy|YoY|Cr)?\b|\b\d+\s*(?:x|yoy|YoY|Cr|%)\b)/i);
  return match ? match[0] : null;
}

/**
 * A single bull/bear thesis point with:
 * - Claim text (primary)
 * - "EV ·" evidence string in mono (secondary)
 * - Citation superscript (grounded/unverified based on verification)
 */
export function GroundedClaim({
  claim,
  evidence,
  citationN,
  verified,
  verificationReason,
}: GroundedClaimProps) {
  const numVal = extractNumericClaim(claim) || extractNumericClaim(evidence);

  return (
    <li className="space-y-0.5">
      <div
        className="flex items-start flex-wrap gap-x-1 gap-y-0.5"
        style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)', lineHeight: 1.55 }}
      >
        <span>{claim}</span>
        {numVal && (
          <VerificationPill
            value={numVal}
            verified={verified}
            evidence={evidence}
            reason={verificationReason}
          />
        )}
        <Citation
          n={citationN}
          tone={verified ? 'grounded' : 'unverified'}
          reason={verificationReason}
        />
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-micro)',
          color: 'var(--text-tertiary)',
          letterSpacing: '0.04em',
          lineHeight: 1.4,
        }}
      >
        <span style={{ color: 'var(--text-quaternary)' }}>EV · </span>
        {evidence}
      </div>
    </li>
  );
}
