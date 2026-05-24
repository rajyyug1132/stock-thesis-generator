import { GroundedBadge } from './grounded-badge';
import type { ValidationClaim } from '@/lib/ai/schemas';

interface ThesisPoint {
  claim: string;
  evidence: string;
}

interface ThesisCardProps {
  variant: 'bull' | 'bear';
  headline: string;
  points: ThesisPoint[];
  claims: ValidationClaim[];
  locationPrefix: string;
}

export function ThesisCard({
  variant,
  headline,
  points,
  claims,
  locationPrefix,
}: ThesisCardProps) {
  const isBull = variant === 'bull';
  const accentBorder = isBull ? 'border-l-green-400' : 'border-l-red-400';
  const headingColor = isBull ? 'text-green-700' : 'text-red-700';
  const bgColor = isBull ? 'bg-green-50/50' : 'bg-red-50/50';
  const label = isBull ? '↑ Bull Case' : '↓ Bear Case';

  const findClaim = (idx: number) =>
    claims.find((c) => c.location === `${locationPrefix}[${idx}]`);

  return (
    <div className={`rounded-xl border-l-4 ${accentBorder} ${bgColor} border border-gray-100 p-5`}>
      <p className={`text-xs font-semibold uppercase tracking-widest ${headingColor} mb-1`}>
        {label}
      </p>
      <h3 className="text-base font-semibold text-gray-900 mb-4">{headline}</h3>
      <ul className="space-y-4">
        {points.map((point, i) => {
          const validationClaim = findClaim(i);
          return (
            <li key={i} className="text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-gray-800">{point.claim}</p>
                {validationClaim && (
                  <GroundedBadge
                    verified={validationClaim.verified}
                    reason={validationClaim.reason}
                  />
                )}
              </div>
              <p className="mt-1 text-gray-500 text-xs leading-relaxed">{point.evidence}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
