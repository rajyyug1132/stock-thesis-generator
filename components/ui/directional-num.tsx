interface DirectionalNumProps {
  value: number;
  /** Format: 'pct' multiplies by 100 + appends %, 'num' raw, 'currency' prepends ₹ */
  format?: 'pct' | 'num' | 'currency';
  decimals?: number;
  showSign?: boolean;
  showTriangle?: boolean;
  className?: string;
}

export function DirectionalNum({
  value,
  format = 'pct',
  decimals = 2,
  showSign = true,
  showTriangle = false,
  className = '',
}: DirectionalNumProps) {
  const positive = value >= 0;
  const color = value === 0 ? 'var(--text-secondary)' : positive ? 'var(--up)' : 'var(--down)';
  const triangle = value === 0 ? '·' : positive ? '▲' : '▼';
  const sign = value > 0 ? '+' : '';

  let displayValue: string;
  if (format === 'pct') {
    displayValue = `${(value * 100).toFixed(decimals)}%`;
  } else if (format === 'currency') {
    displayValue = `₹${value.toFixed(decimals)}`;
  } else {
    displayValue = value.toFixed(decimals);
  }

  return (
    <span className={`num ${className}`} style={{ color }}>
      {showTriangle && (
        <span className="mr-1" style={{ fontSize: '0.75em' }}>
          {triangle}
        </span>
      )}
      {showSign && sign}
      {displayValue}
    </span>
  );
}
