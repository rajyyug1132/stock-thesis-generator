'use client';

import { useState } from 'react';
import { AllocationBar } from '@/components/ui/allocation-bar';
import { PortfolioPresets, type PresetName } from '@/components/ui/portfolio-presets';
import { equalWeight, minVariance } from '@/lib/sim/portfolio';

const SYMBOLS = ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS'];
// Mock covariance matrix (approx Indian large-cap)
const MOCK_COV = [
  [0.0400, 0.0160, 0.0140, 0.0120],
  [0.0160, 0.0361, 0.0220, 0.0110],
  [0.0140, 0.0220, 0.0324, 0.0090],
  [0.0120, 0.0110, 0.0090, 0.0289],
];

export function AllocationBarDemo() {
  const [preset, setPreset] = useState<PresetName>('equal');
  const [weights, setWeights] = useState<number[]>(equalWeight(SYMBOLS.length));

  function handlePreset(p: PresetName) {
    setPreset(p);
    if (p === 'equal') setWeights(equalWeight(SYMBOLS.length));
    if (p === 'minvar') setWeights(minVariance(MOCK_COV));
    if (p === 'custom') { /* keep current */ }
  }

  function handleDrag(w: number[]) {
    setWeights(w);
    setPreset('custom');
  }

  return (
    <div className="space-y-3 max-w-2xl">
      <PortfolioPresets active={preset} onSelect={handlePreset} />
      <AllocationBar
        symbols={SYMBOLS}
        weights={weights}
        onChange={handleDrag}
      />
    </div>
  );
}
