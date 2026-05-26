'use client';

import { useState, useMemo } from 'react';

export type ConvictionState = {
  value: number;              // 0–100. 50 = neutral. 100 = max bull. 0 = max bear.
  label: string;              // "STRONG BULL" | "BULL" | "NEUTRAL" | "BEAR" | "STRONG BEAR"
  bullWeight: number;         // 0.28–0.72, drives bull column flex
  bearWeight: number;         // complement of bullWeight
  bullOpacity: number;        // 0.3–1.0
  bearOpacity: number;        // 0.3–1.0
  shadowCaseVisible: boolean; // true when value > 78 or value < 22
  shadowCaseType: 'bear' | 'bull' | null;
};

export function useConviction(initial = 50) {
  const [value, setValue] = useState(initial);

  const state = useMemo<ConvictionState>(() => {
    const t = value / 100; // 0 to 1

    const MIN_FLEX = 0.28;
    const MAX_FLEX = 0.72;
    const bullWeight = MIN_FLEX + t * (MAX_FLEX - MIN_FLEX);
    const bearWeight = 1 - bullWeight;

    const MIN_OPACITY = 0.3;
    const bullOpacity = MIN_OPACITY + t * (1 - MIN_OPACITY);
    const bearOpacity = MIN_OPACITY + (1 - t) * (1 - MIN_OPACITY);

    const label =
      value >= 80 ? 'STRONG BULL' :
      value >= 60 ? 'BULL' :
      value >= 40 ? 'NEUTRAL' :
      value >= 20 ? 'BEAR' :
      'STRONG BEAR';

    const shadowCaseVisible = value > 78 || value < 22;
    const shadowCaseType = value > 78 ? 'bear' : value < 22 ? 'bull' : null;

    return {
      value, label, bullWeight, bearWeight,
      bullOpacity, bearOpacity,
      shadowCaseVisible, shadowCaseType,
    };
  }, [value]);

  return { conviction: state, setConviction: setValue };
}
