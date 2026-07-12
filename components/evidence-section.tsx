import { Panel } from '@/components/ui/panel';
import { SectionLabel } from '@/components/ui/section-label';
import type { Evidence } from '@/lib/data/filings';

interface EvidenceSectionProps {
  evidence: Evidence;
}

export function EvidenceSection({ evidence }: EvidenceSectionProps) {
  return (
    <section>
      <SectionLabel>FILING EVIDENCE</SectionLabel>
      <Panel className="mt-3">
        <p className="whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
          {evidence.answer}
        </p>
        {evidence.sources.length > 0 && (
          <ul
            className="mt-4 pt-4 space-y-1 text-sm"
            style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            {evidence.sources.map((src) => (
              <li key={src.index}>
                [{src.index}] {src.form} · {src.section} · {src.filing_date}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
          via StockRAG
        </p>
      </Panel>
    </section>
  );
}
