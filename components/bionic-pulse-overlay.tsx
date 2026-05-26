'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { AnomalyEvent } from '@/lib/stream/anomalyDetector';

type PulseInstance = {
  id: string;
  x: number;   // screen coords of origin card center
  y: number;
  colorBase: string;
};

export function BioPulseOverlay({ anomaly }: { anomaly: AnomalyEvent | null }) {
  const [pulses, setPulses] = useState<PulseInstance[]>([]);
  const [mounted, setMounted] = useState(false);

  // Only mount on client — never SSR
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!anomaly) return;

    // Find the card DOM element for this symbol
    const card = document.querySelector(`[data-symbol="${anomaly.symbol}"]`);
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    if (card) {
      const rect = card.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }

    const pulse: PulseInstance = {
      id: anomaly.id,
      x, y,
      colorBase: anomaly.type === 'spike_up'
        ? 'rgba(168, 199, 186,'
        : 'rgba(212, 165, 116,',
    };

    setPulses((prev) => [...prev, pulse]);

    // Auto-remove after animation completes
    const timer = setTimeout(() => {
      setPulses((prev) => prev.filter((p) => p.id !== pulse.id));
    }, 1600);

    return () => clearTimeout(timer);
  }, [anomaly]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {pulses.map((pulse) => (
        <motion.div
          key={pulse.id}
          initial={{ width: 0, height: 0, opacity: 0.7 }}
          animate={{ width: '350vmax', height: '350vmax', opacity: 0 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed',
            left: pulse.x,
            top: pulse.y,
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${pulse.colorBase}0.12) 0%, ${pulse.colorBase}0.04) 40%, transparent 70%)`,
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        />
      ))}
    </AnimatePresence>,
    document.body
  );
}
