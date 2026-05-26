'use client';

/**
 * TickerCanvas — Epic C
 *
 * A canvas-rendered horizontal scrolling ticker strip that consumes
 * live price ticks from ticker.worker.ts via a Web Worker.
 *
 * Features:
 * - Spawns ticker.worker.ts on mount, terminates on unmount (no leak)
 * - Renders to <canvas> for GPU-composited performance (no DOM thrashing)
 * - Smooth requestAnimationFrame scroll loop
 * - Sentiment colouring: up = var(--up), down = var(--down)
 * - Falls back gracefully when Web Workers unavailable (SSR safe)
 */

import { useEffect, useRef, useCallback } from 'react';
import type { TickerTick } from '@/workers/ticker.worker';

// Default NIFTY 50 symbols with rough INR base prices for GBM seeding
const DEFAULT_SYMBOLS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
  'HINDUNILVR', 'SBIN', 'BHARTIARTL', 'ITC', 'KOTAKBANK',
  'LT', 'AXISBANK', 'ASIANPAINT', 'MARUTI', 'BAJFINANCE',
  'NESTLEIND', 'TITAN', 'ULTRACEMCO', 'WIPRO', 'HCLTECH',
];

const DEFAULT_PRICES: Record<string, number> = {
  RELIANCE: 2950, TCS: 4100, HDFCBANK: 1650, INFY: 1750, ICICIBANK: 1220,
  HINDUNILVR: 2700, SBIN: 820, BHARTIARTL: 1680, ITC: 490, KOTAKBANK: 1780,
  LT: 3600, AXISBANK: 1210, ASIANPAINT: 2700, MARUTI: 12800, BAJFINANCE: 7100,
  NESTLEIND: 2450, TITAN: 3400, ULTRACEMCO: 10800, WIPRO: 560, HCLTECH: 1800,
};

interface TickerCanvasProps {
  symbols?: string[];
  basePrice?: Record<string, number>;
  /** Height of the ticker strip in px */
  height?: number;
  /** Scroll speed in px/frame (60 fps assumed) */
  speed?: number;
}

interface TickerEntry {
  symbol: string;
  price: number;
  changePct: number;
}

export function TickerCanvas({
  symbols = DEFAULT_SYMBOLS,
  basePrice = DEFAULT_PRICES,
  height = 32,
  speed = 0.6,
}: TickerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ticksRef = useRef<Map<string, TickerEntry>>(new Map());
  const offsetRef = useRef(0);
  const rafRef = useRef<number>(0);
  const workerRef = useRef<Worker | null>(null);
  const stripWidthRef = useRef(0);

  // Seed initial values so the canvas renders before first tick
  useEffect(() => {
    for (const sym of symbols) {
      ticksRef.current.set(sym, {
        symbol: sym,
        price: basePrice[sym] ?? 1000,
        changePct: 0,
      });
    }
  }, [symbols, basePrice]);

  // Spawn the Web Worker
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const worker = new Worker(
        new URL('@/workers/ticker.worker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = (e: MessageEvent) => {
        if (e.data?.type !== 'tick') return;
        const ticks: TickerTick[] = e.data.payload;
        for (const t of ticks) {
          ticksRef.current.set(t.symbol, {
            symbol: t.symbol,
            price: t.price,
            changePct: t.changePct,
          });
        }
      };

      worker.postMessage({ type: 'start', symbols, basePrice });
      workerRef.current = worker;
    } catch {
      // Worker unavailable (e.g. SSR context during hydration check) — no-op
    }

    return () => {
      workerRef.current?.postMessage({ type: 'stop' });
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [symbols, basePrice]);

  // Canvas render + scroll loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth;
    const H = height;

    if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, W, H);

    // Build ticker string entries
    const entries = Array.from(ticksRef.current.values());
    if (entries.length === 0) return;

    // Typography
    const FONT_SIZE = 11;
    const FONT = `500 ${FONT_SIZE}px "Geist Mono", monospace`;
    ctx.font = FONT;
    ctx.textBaseline = 'middle';

    // Measure strip width once when entries change
    const SEP = 32; // px between items
    const PADDING = 12;
    let totalW = 0;
    const measured: Array<{ entry: TickerEntry; symW: number; priceW: number; pctW: number }> = [];
    for (const entry of entries) {
      const symW  = ctx.measureText(entry.symbol).width;
      const priceW = ctx.measureText(`₹${entry.price.toFixed(0)}`).width;
      const sign   = entry.changePct >= 0 ? '+' : '';
      const pctW  = ctx.measureText(`${sign}${(entry.changePct * 100).toFixed(2)}%`).width;
      const itemW  = PADDING + symW + 6 + priceW + 6 + pctW + PADDING + SEP;
      totalW += itemW;
      measured.push({ entry, symW, priceW, pctW });
    }
    stripWidthRef.current = totalW;

    // Scroll
    offsetRef.current = (offsetRef.current + speed) % totalW;

    // Draw two copies side by side for seamless loop
    for (let copy = 0; copy < 2; copy++) {
      let x = -offsetRef.current + copy * totalW;
      for (const { entry, symW, priceW, pctW } of measured) {
        const isUp = entry.changePct >= 0;
        const color = isUp ? 'var(--up, #4ade80)' : 'var(--down, #fb7185)';
        const neutral = 'rgba(241,241,241,0.55)';

        // Symbol label
        ctx.fillStyle = neutral;
        ctx.fillText(entry.symbol, x + PADDING, H / 2);

        // Price
        ctx.fillStyle = '#f5f4f0';
        ctx.fillText(`₹${entry.price.toFixed(0)}`, x + PADDING + symW + 6, H / 2);

        // Pct change (coloured)
        ctx.fillStyle = color;
        const sign = entry.changePct >= 0 ? '+' : '';
        ctx.fillText(
          `${sign}${(entry.changePct * 100).toFixed(2)}%`,
          x + PADDING + symW + 6 + priceW + 6,
          H / 2
        );

        x += PADDING + symW + 6 + priceW + 6 + pctW + PADDING + SEP;
      }
    }

    rafRef.current = requestAnimationFrame(draw);
  }, [height, speed]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <div
      style={{
        width: '100%',
        height,
        overflow: 'hidden',
        position: 'relative',
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-elevated)',
      }}
      role="marquee"
      aria-label="Live NIFTY 50 price ticker"
    >
      {/* Left + right fade masks */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to right, var(--bg-elevated) 0%, transparent 6%, transparent 94%, var(--bg-elevated) 100%)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height }}
      />
    </div>
  );
}
