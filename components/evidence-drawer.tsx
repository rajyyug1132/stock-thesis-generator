'use client';

/**
 * EvidenceDrawer — Epic D
 *
 * A slide-in side panel that shows the full verification record for a
 * single thesis claim. Opened when the user clicks a VerificationPill
 * or Citation badge inside a GroundedClaim.
 *
 * The drawer renders as a portal so it escapes overflow:hidden ancestors.
 */

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { ValidationClaim } from '@/lib/ai/schemas';

export interface DrawerSource {
  /** The ValidationClaim being inspected */
  claim: ValidationClaim;
  /** Human-readable section (e.g. "Bull Case · Point 2") */
  section: string;
  /** Optional news article URL associated with this claim */
  sourceUrl?: string;
  /** The raw evidence JSON snippet, if available */
  rawJson?: string;
}

interface EvidenceDrawerProps {
  source: DrawerSource | null;
  onClose: () => void;
}

const EASING = [0.16, 1, 0.3, 1] as const;

export function EvidenceDrawer({ source, onClose }: EvidenceDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!source) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [source, onClose]);

  // Trap focus inside drawer
  useEffect(() => {
    if (!source) return;
    const el = drawerRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, [tabindex]:not([tabindex="-1"])'
    );
    focusable[0]?.focus();
  }, [source]);

  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {source && (
        <>
          {/* Backdrop */}
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(3px)',
              zIndex: 10000,
            }}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <motion.div
            ref={drawerRef}
            key="drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-label={`Evidence for: ${source.claim.claim}`}
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.3, ease: EASING }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(480px, 95vw)',
              background: 'var(--bg-card)',
              borderLeft: '1px solid var(--border-strong)',
              zIndex: 10001,
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                position: 'sticky',
                top: 0,
                background: 'var(--bg-card)',
                zIndex: 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {source.claim.verified ? (
                  <CheckCircle2
                    size={15}
                    style={{ color: 'var(--up)', flexShrink: 0 }}
                    aria-hidden="true"
                  />
                ) : (
                  <AlertTriangle
                    size={15}
                    style={{ color: 'var(--unverified)', flexShrink: 0 }}
                    aria-hidden="true"
                  />
                )}
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: source.claim.verified ? 'var(--up)' : 'var(--unverified)',
                  }}
                >
                  {source.claim.verified ? 'Verified Claim' : 'Unverified Claim'}
                </span>
              </div>
              <button
                onClick={onClose}
                aria-label="Close evidence drawer"
                style={{
                  background: 'none',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.color = 'var(--accent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.color = 'var(--text-tertiary)';
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24, flex: 1 }}>

              {/* Section badge */}
              <div>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--text-quaternary)',
                    border: '1px solid var(--border-subtle)',
                    padding: '2px 6px',
                  }}
                >
                  {source.section}
                </span>
              </div>

              {/* Claim */}
              <DrawerSection label="CLAIM">
                <p
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.05rem',
                    lineHeight: 1.6,
                    color: 'var(--text-primary)',
                    margin: 0,
                    fontStyle: 'italic',
                    fontVariationSettings: "'opsz' 18, 'SOFT' 80, 'WONK' 0",
                  }}
                >
                  {source.claim.claim}
                </p>
              </DrawerSection>

              {/* Evidence reference */}
              <DrawerSection label="EVIDENCE REFERENCE">
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                  {source.claim.evidence}
                </p>
              </DrawerSection>

              {/* Validation proof */}
              <DrawerSection label="VALIDATION PROOF">
                <div
                  style={{
                    background: source.claim.verified
                      ? 'rgba(74,222,128,0.05)'
                      : 'rgba(184,163,130,0.05)',
                    border: `1px solid ${source.claim.verified ? 'rgba(74,222,128,0.2)' : 'rgba(184,163,130,0.2)'}`,
                    padding: '12px 14px',
                  }}
                >
                  <p style={{ margin: 0, fontSize: 12, lineHeight: 1.65, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    "{source.claim.reason}"
                  </p>
                </div>
              </DrawerSection>

              {/* Raw JSON snippet */}
              {source.rawJson && (
                <DrawerSection label="RAW DATA SNAPSHOT">
                  <pre
                    style={{
                      margin: 0,
                      padding: '12px 14px',
                      background: 'var(--bg-canvas)',
                      border: '1px solid var(--border-subtle)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      lineHeight: 1.7,
                      color: 'var(--text-tertiary)',
                      overflowX: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {source.rawJson}
                  </pre>
                </DrawerSection>
              )}

              {/* Source link */}
              {source.sourceUrl && (
                <DrawerSection label="PRIMARY SOURCE">
                  <a
                    href={source.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--accent)',
                      textDecoration: 'none',
                      letterSpacing: '0.04em',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                  >
                    <ExternalLink size={11} />
                    {source.sourceUrl}
                  </a>
                </DrawerSection>
              )}

            </div>

            {/* Footer */}
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: 'var(--text-quaternary)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Validated by NVIDIA
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: 'var(--text-quaternary)',
                  letterSpacing: '0.08em',
                }}
              >
                ESC to close
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ── Sub-component: labeled section ── */
function DrawerSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
