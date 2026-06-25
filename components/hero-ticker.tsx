'use client';

import { useEffect, useRef } from 'react';

/**
 * HeroTicker — a synthetic "live" stock line that scrolls right-to-left,
 * mimicking the rise and fall of a price feed. Pure decoration: it generates
 * a random walk with a gentle bullish drift, animates via requestAnimationFrame,
 * and writes SVG attributes directly (no per-frame React re-render).
 *
 * Theme-aware: the stroke/fill follow `currentColor`, which we point at
 * --up (green) while trending up and --down (rose) while trending down.
 * Honours prefers-reduced-motion by rendering a single static line.
 */

const W = 800;
const H = 260;
const N = 60;            // stored points (≈ visible + 2 buffer)
const STEP_MS = 130;     // time between new data points
const DX = W / (N - 2);

function mapY(v: number): number {
  // v in [0,1] → padded vertical band
  return H - (v * H * 0.78) - H * 0.11;
}

function buildPath(values: number[], offset: number): { line: string; area: string } {
  let line = '';
  for (let i = 0; i < values.length; i++) {
    const x = (i - 1) * DX + offset;
    const y = mapY(values[i]);
    line += i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  const firstX = (-1 * DX + offset).toFixed(1);
  const lastX = ((values.length - 2) * DX + offset).toFixed(1);
  const area = `${line} L ${lastX} ${H} L ${firstX} ${H} Z`;
  return { line, area };
}

function step(prev: number): number {
  // Random walk: volatility + small upward drift, occasional sharper move.
  const shock = Math.random() < 0.08 ? (Math.random() - 0.45) * 0.22 : 0;
  const next = prev + (Math.random() - 0.5) * 0.07 + 0.004 + shock;
  return Math.min(0.97, Math.max(0.03, next));
}

export function HeroTicker() {
  const lineRef = useRef<SVGPathElement>(null);
  const areaRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // Seed a pleasant upward-drifting walk.
    const values: number[] = [];
    let v = 0.35;
    for (let i = 0; i < N; i++) {
      v = step(v);
      values.push(v);
    }

    const draw = (offset: number) => {
      const { line, area } = buildPath(values, offset);
      lineRef.current?.setAttribute('d', line);
      areaRef.current?.setAttribute('d', area);
      if (dotRef.current) {
        dotRef.current.setAttribute('cx', String((N - 2) * DX + offset));
        dotRef.current.setAttribute('cy', mapY(values[N - 1]).toFixed(1));
      }
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      draw(0);
      return;
    }

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let lastSign = 1;

    const frame = (now: number) => {
      acc += now - last;
      last = now;
      while (acc >= STEP_MS) {
        values.shift();
        values.push(step(values[values.length - 1]));
        acc -= STEP_MS;
      }
      draw(-(acc / STEP_MS) * DX);

      // Tint the line by overall trend (compare ends), flipping only on change.
      const sign = values[N - 1] >= values[0] ? 1 : -1;
      if (sign !== lastSign && svgRef.current) {
        svgRef.current.style.color = sign === 1 ? 'var(--up)' : 'var(--down)';
        lastSign = sign;
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      width="100%"
      height="100%"
      style={{ color: 'var(--up)', display: 'block' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="hero-ticker-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path ref={areaRef} fill="url(#hero-ticker-fill)" stroke="none" />
      <path
        ref={lineRef}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle ref={dotRef} r={3.5} fill="currentColor" />
    </svg>
  );
}
