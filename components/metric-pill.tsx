interface MetricPillProps {
  label: string;
  value: string;
  subtitle?: string;
  highlight?: 'positive' | 'negative' | 'neutral';
}

export function MetricPill({ label, value, subtitle, highlight }: MetricPillProps) {
  const borderColor =
    highlight === 'positive'
      ? 'border-green-200 bg-green-50'
      : highlight === 'negative'
        ? 'border-red-200 bg-red-50'
        : 'border-gray-200 bg-white';

  return (
    <div className={`rounded-lg border px-4 py-3 ${borderColor}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}
