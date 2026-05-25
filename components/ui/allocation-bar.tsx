'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { animate } from 'framer-motion';

interface AllocationBarProps {
  symbols: string[];
  weights: number[]; // should sum to 1
  onChange: (weights: number[]) => void;
  minWeight?: number; // default 0.02
}

// Segment colors — cycle through accent palette
const SEGMENT_COLORS = [
  'var(--accent)',
  'var(--up)',
  '#9b8eb0',
  '#7ba8c0',
  '#c0a47b',
  '#a0b88a',
];

function formatPct(v: number) {
  return (v * 100).toFixed(1) + '%';
}

/**
 * Drag-to-redistribute weight bar.
 * - Pointer capture on boundary handles (col-resize cursor)
 * - framer-motion animate() ONLY for preset-driven transitions (not during drag)
 * - minWeight enforced: dragging a segment below min redistributes from neighbours
 */
export function AllocationBar({
  symbols,
  weights,
  onChange,
  minWeight = 0.02,
}: AllocationBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Internal display weights — controlled via props but we keep local for smooth dragging
  const [display, setDisplay] = useState<number[]>(weights);
  // Track whether we're animating (framer-motion) — no pointer events during anim
  const animatingRef = useRef(false);
  // Store cancel functions for active animations
  const animCancels = useRef<Array<() => void>>([]);

  // Sync display when weights prop changes externally (preset switch)
  useEffect(() => {
    // Cancel any running animations
    animCancels.current.forEach((c) => c());
    animCancels.current = [];

    // Animate each segment from current display to new target
    animatingRef.current = true;
    let completed = 0;
    const n = weights.length;
    if (n === 0) return;

    const newDisplay = [...display];
    const cancels: Array<() => void> = [];

    weights.forEach((target, i) => {
      const from = newDisplay[i] ?? target;
      const ctrl = animate(from, target, {
        duration: 0.35,
        ease: [0.25, 0.1, 0.25, 1],
        onUpdate: (v) => {
          newDisplay[i] = v;
          setDisplay([...newDisplay]);
        },
        onComplete: () => {
          completed++;
          if (completed === n) {
            animatingRef.current = false;
          }
        },
      });
      cancels.push(() => ctrl.stop());
    });

    animCancels.current = cancels;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weights]);

  // Drag state
  const dragRef = useRef<{
    boundaryIndex: number; // dragging boundary between i and i+1
    startX: number;
    startWeights: number[];
    containerWidth: number;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, boundaryIndex: number) => {
      if (animatingRef.current) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        boundaryIndex,
        startX: e.clientX,
        startWeights: [...display],
        containerWidth: containerRef.current?.getBoundingClientRect().width ?? 1,
      };
    },
    [display]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current) return;
      const { boundaryIndex, startX, startWeights, containerWidth } = dragRef.current;
      const deltaX = e.clientX - startX;
      const deltaW = deltaX / containerWidth;

      const n = startWeights.length;
      const next = [...startWeights];
      const left = boundaryIndex;
      const right = boundaryIndex + 1;

      // Apply delta to left and right segments
      next[left] = startWeights[left] + deltaW;
      next[right] = startWeights[right] - deltaW;

      // Clamp
      if (next[left] < minWeight) {
        const excess = minWeight - next[left];
        next[left] = minWeight;
        next[right] = startWeights[right] - deltaW + excess;
      }
      if (next[right] < minWeight) {
        const excess = minWeight - next[right];
        next[right] = minWeight;
        next[left] = startWeights[left] + deltaW + excess;
      }

      // Re-clamp both within [0,1]
      next[left] = Math.max(minWeight, Math.min(1 - (n - 1) * minWeight, next[left]));
      next[right] = Math.max(minWeight, Math.min(1 - (n - 1) * minWeight, next[right]));

      // Renormalize so sum stays 1
      const sum = next.reduce((a, b) => a + b, 0);
      const normalized = next.map((w) => w / sum);

      setDisplay(normalized);
    },
    [minWeight]
  );

  const onPointerUp = useCallback(
    (_e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current) return;
      onChange(display);
      dragRef.current = null;
    },
    [display, onChange]
  );

  const n = symbols.length;
  if (n === 0) return null;

  return (
    <div className="space-y-2">
      {/* Bar */}
      <div
        ref={containerRef}
        className="relative flex h-10 overflow-hidden select-none"
        style={{ borderRadius: 0, border: '1px solid var(--border-strong)' }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {display.map((w, i) => (
          <div
            key={symbols[i]}
            className="relative flex-shrink-0 h-full flex items-center justify-center overflow-hidden"
            style={{
              width: `${w * 100}%`,
              background: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
              transition: animatingRef.current ? undefined : 'none',
            }}
          >
            {w > 0.08 && (
              <span
                className="num"
                style={{
                  fontSize: 'var(--text-micro)',
                  color: 'var(--bg-canvas)',
                  letterSpacing: '0.05em',
                  fontWeight: 600,
                  pointerEvents: 'none',
                }}
              >
                {symbols[i].replace('.NS', '')}
              </span>
            )}
            {/* Drag handle on right boundary (except last) */}
            {i < n - 1 && (
              <div
                className="absolute right-0 top-0 h-full z-10"
                style={{
                  width: '12px',
                  cursor: 'col-resize',
                  transform: 'translateX(50%)',
                  background: 'transparent',
                }}
                onPointerDown={(e) => onPointerDown(e, i)}
              />
            )}
          </div>
        ))}
      </div>

      {/* Labels */}
      <div className="flex gap-3 flex-wrap">
        {display.map((w, i) => (
          <div key={symbols[i]} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 flex-shrink-0"
              style={{ background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}
            />
            <span
              className="num"
              style={{ fontSize: 'var(--text-micro)', color: 'var(--text-tertiary)' }}
            >
              {symbols[i].replace('.NS', '')}
            </span>
            <span
              className="num"
              style={{ fontSize: 'var(--text-micro)', color: 'var(--text-secondary)' }}
            >
              {formatPct(w)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
