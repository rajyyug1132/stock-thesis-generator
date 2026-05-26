'use client';

import { useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConvictionClaim } from './conviction-claim';
import { ShadowCaseBanner } from './shadow-case-banner';
import type { ConvictionState } from '@/hooks/use-conviction';
import type { Thesis, ValidationResult, ValidationClaim } from '@/lib/ai/schemas';

export function BullBearSplit({
  thesis,
  validation,
  conviction,
  onConvictionChange,
  onClaimClick,
}: {
  thesis: Thesis;
  validation: ValidationResult;
  conviction: ConvictionState;
  onConvictionChange: (v: number) => void;
  onClaimClick?: (claim: ValidationClaim) => void;
}) {
  const splitRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Draggable divider — setPointerCapture prevents losing drag on fast movement
  const onDividerPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDragging.current = true;
  }, []);

  const onDividerPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current || !splitRef.current) return;
      const rect = splitRef.current.getBoundingClientRect();
      const pct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
      onConvictionChange(Math.max(5, Math.min(95, pct)));
    },
    [onConvictionChange]
  );

  const onDividerPointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const { bullWeight, bearWeight, bullOpacity, bearOpacity, shadowCaseVisible, shadowCaseType } = conviction;
  const bullExpanded = conviction.value >= 60;
  const bearExpanded = conviction.value <= 40;

  const getValidation = (location: string): ValidationClaim | undefined =>
    validation.claims.find((c) => c.location === location);

  return (
    <div
      ref={splitRef}
      onPointerMove={onDividerPointerMove}
      onPointerUp={onDividerPointerUp}
      style={{ display: 'flex', gap: 0, minHeight: 400, position: 'relative', marginTop: '1.5rem' }}
    >
      {/* ── BULL COLUMN ─────────────────────────────────────────────────────── */}
      <motion.div
        layout
        animate={{ flex: bullWeight }}
        transition={{ type: 'spring', stiffness: 200, damping: 35 }}
        style={{
          overflow: 'hidden',
          paddingRight: '1.5rem',
          borderRight: '1px solid var(--border-subtle)',
          minWidth: 0,
        }}
      >
        <div
          className="font-mono"
          style={{ fontSize: 9, letterSpacing: '0.22em', color: 'var(--mint)', marginBottom: '1rem' }}
        >
          BULL CASE · {thesis.bullCase.points.length} POINTS
        </div>
        <div
          className="font-serif"
          style={{ fontSize: '1.125rem', fontStyle: 'italic', color: 'var(--text-primary)', marginBottom: '1rem', lineHeight: 1.4 }}
        >
          {thesis.bullCase.headline}
        </div>
        {thesis.bullCase.points.map((point, i) => (
          <ConvictionClaim
            key={i}
            point={point}
            validation={getValidation(`bullCase.points[${i}]`)}
            side="bull"
            convictionOpacity={bullOpacity}
            isExpanded={bullExpanded}
            onClaimClick={onClaimClick}
          />
        ))}

        {/* Shadow bear case — forces user to confront the downside when max-bull */}
        <AnimatePresence>
          {shadowCaseVisible && shadowCaseType === 'bear' && (
            <ShadowCaseBanner type="bear" points={thesis.bearCase.points} />
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── DRAGGABLE DIVIDER ─────────────────────────────────────────────── */}
      <div
        onPointerDown={onDividerPointerDown}
        style={{
          width: 24,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'col-resize',
          userSelect: 'none',
          position: 'relative',
          zIndex: 10,
        }}
        title="Drag to shift conviction"
      >
        <div style={{ width: 1, flex: 1, background: 'var(--border-subtle)' }} />

        {/* Grip indicator */}
        <div style={{
          width: 20, height: 32,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-strong)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          flexShrink: 0,
        }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 6, height: 1, background: 'var(--text-quaternary)' }} />
          ))}
        </div>

        <div style={{ width: 1, flex: 1, background: 'var(--border-subtle)' }} />
      </div>

      {/* ── BEAR COLUMN ─────────────────────────────────────────────────────── */}
      <motion.div
        layout
        animate={{ flex: bearWeight }}
        transition={{ type: 'spring', stiffness: 200, damping: 35 }}
        style={{
          overflow: 'hidden',
          paddingLeft: '1.5rem',
          minWidth: 0,
        }}
      >
        <div
          className="font-mono"
          style={{ fontSize: 9, letterSpacing: '0.22em', color: 'var(--rust)', marginBottom: '1rem' }}
        >
          BEAR CASE · {thesis.bearCase.points.length} POINTS
        </div>
        <div
          className="font-serif"
          style={{ fontSize: '1.125rem', fontStyle: 'italic', color: 'var(--text-primary)', marginBottom: '1rem', lineHeight: 1.4 }}
        >
          {thesis.bearCase.headline}
        </div>
        {thesis.bearCase.points.map((point, i) => (
          <ConvictionClaim
            key={i}
            point={point}
            validation={getValidation(`bearCase.points[${i}]`)}
            side="bear"
            convictionOpacity={bearOpacity}
            isExpanded={bearExpanded}
            onClaimClick={onClaimClick}
          />
        ))}

        <AnimatePresence>
          {shadowCaseVisible && shadowCaseType === 'bull' && (
            <ShadowCaseBanner type="bull" points={thesis.bullCase.points} />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
