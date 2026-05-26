'use client';

/**
 * StockPageClient — Epic D
 *
 * Wraps the thesis bull/bear claim grids and manages EvidenceDrawer state.
 * This is a Client Component boundary so the parent StockPage can stay as
 * a Server Component (async data fetch, no hydration overhead).
 */

import { useState, useCallback } from 'react';
import { GroundedClaim } from '@/components/ui/grounded-claim';
import { EvidenceDrawer, type DrawerSource } from '@/components/evidence-drawer';
import { Panel } from '@/components/ui/panel';
import type { ValidationClaim, ValidationResult, Thesis } from '@/lib/ai/schemas';

interface StockPageClientProps {
  thesis: Thesis;
  validation: ValidationResult;
  /** Total bull points count (used to offset bear citation numbers) */
  bullCount: number;
}

export function StockPageClient({ thesis, validation, bullCount }: StockPageClientProps) {
  const [drawerSource, setDrawerSource] = useState<DrawerSource | null>(null);
  const closeDrawer = useCallback(() => setDrawerSource(null), []);

  // Map validation claims by location prefix for lookup
  const claimsByLocation = new Map<string, ValidationClaim>(
    validation.claims.map((c) => [c.location, c])
  );

  function getValidation(prefix: string, idx: number) {
    const key = `${prefix}[${idx}]`;
    return claimsByLocation.get(key) ?? null;
  }

  function openDrawer(claim: ValidationClaim, section: string) {
    setDrawerSource({ claim, section });
  }

  return (
    <>
      {/* Bull / Bear */}
      <section className="grid md:grid-cols-2 gap-6">
        {/* Bull case */}
        <Panel label={`BULL CASE · ${thesis.bullCase.points.length} POINTS`}>
          <p
            className="font-serif italic mb-4"
            style={{ fontSize: 'var(--text-body)', color: 'var(--up)', lineHeight: 1.5 }}
          >
            {thesis.bullCase.headline}
          </p>
          <ul className="space-y-4">
            {thesis.bullCase.points.map((pt, i) => {
              const v = getValidation('bullCase.points', i);
              return (
                <GroundedClaim
                  key={i}
                  citationN={i + 1}
                  claim={pt.claim}
                  evidence={pt.evidence}
                  verified={v?.verified ?? false}
                  verificationReason={v?.reason ?? 'Not validated'}
                  onOpenDrawer={
                    v
                      ? () => openDrawer(v, `Bull Case · Point ${i + 1}`)
                      : undefined
                  }
                />
              );
            })}
          </ul>
        </Panel>

        {/* Bear case */}
        <Panel label={`BEAR CASE · ${thesis.bearCase.points.length} POINTS`}>
          <p
            className="font-serif italic mb-4"
            style={{ fontSize: 'var(--text-body)', color: 'var(--down)', lineHeight: 1.5 }}
          >
            {thesis.bearCase.headline}
          </p>
          <ul className="space-y-4">
            {thesis.bearCase.points.map((pt, i) => {
              const v = getValidation('bearCase.points', i);
              return (
                <GroundedClaim
                  key={i}
                  citationN={bullCount + i + 1}
                  claim={pt.claim}
                  evidence={pt.evidence}
                  verified={v?.verified ?? false}
                  verificationReason={v?.reason ?? 'Not validated'}
                  onOpenDrawer={
                    v
                      ? () => openDrawer(v, `Bear Case · Point ${i + 1}`)
                      : undefined
                  }
                />
              );
            })}
          </ul>
        </Panel>
      </section>

      {/* Evidence Drawer — portal rendered */}
      <EvidenceDrawer source={drawerSource} onClose={closeDrawer} />
    </>
  );
}
