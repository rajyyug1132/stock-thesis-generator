interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

export function Sparkline({ data, color, width = 200, height = 32 }: SparklineProps) {
  if (!data || data.length < 2) {
    return <span style={{ display: 'inline-block', width, height }} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const autoColor = color ?? (data[data.length - 1] >= data[0] ? 'var(--up)' : 'var(--down)');
  const step = width / (data.length - 1);

  const points = data
    .map((v, i) => {
      const x = (i * step).toFixed(1);
      const y = (height - ((v - min) / range) * height).toFixed(1);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <polyline points={points} fill="none" stroke={autoColor} strokeWidth="1.5" />
    </svg>
  );
}
