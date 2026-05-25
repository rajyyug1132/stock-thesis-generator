import { Citation } from './citation';

interface GroundedClaimProps {
  claim: string;
  evidence: string;
  citationN: number;
  verified: boolean;
  verificationReason: string;
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
  return (
    <li className="space-y-0.5">
      <div
        className="flex items-start gap-1"
        style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)', lineHeight: 1.55 }}
      >
        <span>{claim}</span>
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
