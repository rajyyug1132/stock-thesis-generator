import { SectionLabel } from './section-label';

interface ThesisAbstractProps {
  summary: string;
  symbol: string;
  generatedAt: string; // ISO string
  groundingScore?: number; // 0-1
}

/**
 * Editorial blockquote display for the thesis summary.
 * Serif italic, border-left accent, "ABSTRACT · GENERATED …" label.
 */
export function ThesisAbstract({
  summary,
  symbol,
  generatedAt,
  groundingScore,
}: ThesisAbstractProps) {
  const date = new Date(generatedAt);
  const dateStr = date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const scorePart =
    groundingScore !== undefined ? ` · GROUNDING ${(groundingScore * 100).toFixed(0)}%` : '';

  return (
    <div>
      <SectionLabel>
        ABSTRACT · {symbol.replace('.NS', '')} · {dateStr.toUpperCase()}{scorePart}
      </SectionLabel>
      <blockquote
        style={{
          margin: '0.75rem 0 0',
          paddingLeft: '1.25rem',
          borderLeft: '2px solid var(--accent)',
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: '1.15rem',
          lineHeight: 1.75,
          color: 'var(--text-primary)',
        }}
      >
        {summary}
      </blockquote>
    </div>
  );
}
