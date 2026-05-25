'use client';

import { useState } from 'react';
import { PortfolioPresets, type PresetName } from '@/components/ui/portfolio-presets';

export function PortfolioPresetsDemo() {
  const [active, setActive] = useState<PresetName>('equal');
  return (
    <div className="space-y-3">
      <PortfolioPresets active={active} onSelect={setActive} />
      <p style={{ fontSize: 'var(--text-small)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
        ACTIVE → {active.toUpperCase()}
      </p>
    </div>
  );
}
