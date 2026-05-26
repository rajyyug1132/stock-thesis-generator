'use client';

/**
 * StockPageClient — Epic D + Conviction Slider
 *
 * Wraps the thesis bull/bear split and manages EvidenceDrawer state.
 * Client Component boundary so the parent StockPage stays a Server Component.
 */

import { useState, useCallback } from 'react';
import { EvidenceDrawer, type DrawerSource } from '@/components/evidence-drawer';
import { ConvictionSlider } from '@/components/conviction/conviction-slider';
import { BullBearSplit } from '@/components/conviction/bull-bear-split';
import { useConviction } from '@/hooks/use-conviction';
import type { ValidationClaim, ValidationResult, Thesis } from '@/lib/ai/schemas';

interface StockPageClientProps {
  thesis: Thesis;
  validation: ValidationResult;
  /** Total bull points count (used to offset bear citation numbers) */
  bullCount: number;
}

export function StockPageClient({ thesis, validation }: StockPageClientProps) {
  const [drawerSource, setDrawerSource] = useState<DrawerSource | null>(null);
  const closeDrawer = useCallback(() => setDrawerSource(null), []);

  const { conviction, setConviction } = useConviction(50);

  function openDrawer(claim: ValidationClaim) {
    // Derive section label from claim location
    const isBull = claim.location.startsWith('bull');
    const match = claim.location.match(/\[(\d+)\]/);
    const idx = match ? Number(match[1]) + 1 : 1;
    const section = `${isBull ? 'Bull' : 'Bear'} Case · Point ${idx}`;
    setDrawerSource({ claim, section });
  }

  return (
    <>
      <section>
        <ConvictionSlider conviction={conviction} onChange={setConviction} />
        <BullBearSplit
          thesis={thesis}
          validation={validation}
          conviction={conviction}
          onConvictionChange={setConviction}
          onClaimClick={openDrawer}
        />
      </section>

      {/* Evidence Drawer — portal rendered */}
      <EvidenceDrawer source={drawerSource} onClose={closeDrawer} />
    </>
  );
}
