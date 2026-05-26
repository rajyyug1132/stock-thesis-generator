'use client';

/**
 * TickerCanvas — refactored for Feature 2 (Bionic Pulse)
 *
 * Previously spawned its own ticker.worker.ts with an internal GBM stream.
 * Now reads prices from StockStreamProvider so there is exactly ONE stream
 * running in the app (no duplicate setIntervals).
 *
 * The canvas rAF render loop is unchanged; it just reads from the shared
 * prices ref which is kept in sync via a useEffect that watches provider state.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useStockStream } from '@/providers/stock-stream-provider';

interface TickerCanvasProps {
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
  height = 32,
  speed = 0.6,
}: TickerCanvasProps) {
  const { prices } = useStockStream();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ticksRef = useRef<Map<string, TickerEntry>>(new Map());
  const offsetRef = useRef(0);
  const rafRef = useRef<number>(0);

  // Sync provider prices into the ref that the canvas render loop reads from.
  // This avoids closing over stale state in the rAF callback.
  useEffect(() => {
    for (const [symbol, update] of Object.entries(prices)) {
      ticksRef.current.set(symbol, {
        symbol,
        price: update.price,
        changePct: update.changePct,
      });
    }
  }, [prices]);

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

    const entries = Array.from(ticksRef.current.values());
    if (entries.length === 0) {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    const FONT_SIZE = 11;
    ctx.font = `500 ${FONT_SIZE}px "Geist Mono", monospace`;
    ctx.textBaseline = 'middle';

    const SEP = 32;
    const PADDING = 12;
    let totalW = 0;
    const measured: Array<{ entry: TickerEntry; symW: number; priceW: number; pctW: number }> = [];

    for (const entry of entries) {
      const symW   = ctx.measureText(entry.symbol).width;
      const priceW = ctx.measureText(`₹${entry.price.toFixed(0)}`).width;
      const sign   = entry.changePct >= 0 ? '+' : '';
      const pctW   = ctx.measureText(`${sign}${(entry.changePct * 100).toFixed(2)}%`).width;
      const itemW  = PADDING + symW + 6 + priceW + 6 + pctW + PADDING + SEP;
      totalW += itemW;
      measured.push({ entry, symW, priceW, pctW });
    }

    if (totalW === 0) {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    offsetRef.current = (offsetRef.current + speed) % totalW;

    // Draw two copies side by side for seamless loop
    for (let copy = 0; copy < 2; copy++) {
      let x = -offsetRef.current + copy * totalW;
      for (const { entry, symW, priceW, pctW } of measured) {
        const isUp    = entry.changePct >= 0;
        const color   = isUp ? 'var(--up, #4ade80)' : 'var(--down, #fb7185)';
        const neutral = 'rgba(241,241,241,0.55)';

        ctx.fillStyle = neutral;
        ctx.fillText(entry.symbol, x + PADDING, H / 2);

        ctx.fillStyle = '#f5f4f0';
        ctx.fillText(`₹${entry.price.toFixed(0)}`, x + PADDING + symW + 6, H / 2);

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
        aria-label="Live NIFTY 50 stock ticker animation"
        style={{ display: 'block', width: '100%', height }}
      />
    </div>
  );
}
