'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import type { ChartAnnotation } from '@/lib/data/annotations';

interface AnnotationTooltipProps {
  annotation: ChartAnnotation;
  /** Screen-space position of the pin (from getBoundingClientRect) */
  anchorRect: DOMRect;
  onClose: () => void;
}

const SENTIMENT_COLORS: Record<string, { border: string; dot: string; bg: string }> = {
  positive: {
    border: 'var(--up, #4ade80)',
    dot: 'var(--up, #4ade80)',
    bg: 'rgba(74,222,128,0.07)',
  },
  negative: {
    border: 'var(--down, #fb7185)',
    dot: 'var(--down, #fb7185)',
    bg: 'rgba(251,113,133,0.07)',
  },
  neutral: {
    border: 'var(--accent, #c1f2e0)',
    dot: 'var(--accent, #c1f2e0)',
    bg: 'rgba(193,242,224,0.07)',
  },
};

export function AnnotationTooltip({ annotation, anchorRect, onClose }: AnnotationTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const colors = SENTIMENT_COLORS[annotation.sentiment ?? 'neutral'];

  /* Position the tooltip above the anchor pin */
  useEffect(() => {
    const el = tooltipRef.current;
    if (!el) return;

    const TIP_H = el.offsetHeight || 140;
    const TIP_W = el.offsetWidth || 260;
    const GAP = 10;

    let top = anchorRect.top + window.scrollY - TIP_H - GAP;
    let left = anchorRect.left + window.scrollX + anchorRect.width / 2 - TIP_W / 2;

    // Clamp within viewport
    if (top < window.scrollY + 8) top = anchorRect.bottom + window.scrollY + GAP;
    if (left < 8) left = 8;
    if (left + TIP_W > window.innerWidth - 8) left = window.innerWidth - TIP_W - 8;

    setPos({ top, left });
  }, [anchorRect]);

  /* Close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={tooltipRef}
        initial={{ opacity: 0, y: 6, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.97 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          top: pos.top,
          left: pos.left,
          zIndex: 9999,
          width: 264,
          background: 'var(--bg-elevated, #0d0e10)',
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          padding: '12px 14px',
          boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${colors.border}22`,
          backdropFilter: 'blur(12px)',
          backgroundColor: colors.bg,
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: colors.dot,
              flexShrink: 0,
              boxShadow: `0 0 6px ${colors.dot}`,
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 11,
              fontWeight: 700,
              color: colors.dot,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {annotation.label}
          </span>
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 10,
              color: 'var(--zinc-muted, #71717a)',
            }}
          >
            {annotation.timestamp}
          </span>
        </div>

        {/* Catalyst text */}
        <p
          style={{
            fontSize: 12,
            lineHeight: 1.6,
            color: 'var(--bone, #f5f4f0)',
            marginBottom: 10,
            margin: '0 0 10px',
          }}
        >
          {annotation.catalyst}
        </p>

        {/* Source link */}
        <a
          href={annotation.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 11,
            color: 'var(--accent, #c1f2e0)',
            textDecoration: 'none',
            fontFamily: 'var(--font-mono, monospace)',
            opacity: 0.85,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.85')}
        >
          <ExternalLink size={11} />
          View Source
        </a>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
