'use client';

import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

export function Sparkline({ data, color, width = 80, height = 20 }: SparklineProps) {
  if (!data || data.length < 2) return <span className="inline-block w-20 h-5" />;

  const autoColor = color ?? (data[data.length - 1] >= data[0] ? '#16a34a' : '#dc2626');
  const chartData = data.map((v) => ({ v }));

  return (
    <span className="inline-block" style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={autoColor}
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </span>
  );
}
