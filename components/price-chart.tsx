'use client';

import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
} from 'recharts';
import { parseISO, format } from 'date-fns';

export interface PricePoint {
  date: string;
  close: number;
}

interface PriceChartProps {
  data: PricePoint[];
  height?: number;
}

function fmtINR(value: number): string {
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(1)}Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(1)}L`;
  if (value >= 1e3) return `₹${(value / 1e3).toFixed(1)}K`;
  return `₹${value.toFixed(0)}`;
}

function fmtTick(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "MMM ''yy");
  } catch {
    return dateStr;
  }
}

// Show ~1 tick per 60 days
function tickFilter(dates: string[]): string[] {
  const result: string[] = [];
  let lastIdx = -999;
  dates.forEach((d, i) => {
    if (i - lastIdx >= 60) {
      result.push(d);
      lastIdx = i;
    }
  });
  return result;
}

export function PriceChart({ data, height = 300 }: PriceChartProps) {
  if (!data || data.length < 2) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-lg bg-gray-50 border border-gray-100 text-gray-400 text-sm"
      >
        No price data
      </div>
    );
  }

  const first = data[0].close;
  const last = data[data.length - 1].close;
  const isUp = last >= first;
  const lineColor = isUp ? '#16a34a' : '#dc2626';
  const gradientId = isUp ? 'priceGradientGreen' : 'priceGradientRed';
  const gradientColor = isUp ? '#16a34a' : '#dc2626';

  const ticks = tickFilter(data.map((d) => d.date));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={gradientColor} stopOpacity={0.15} />
            <stop offset="95%" stopColor={gradientColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="date"
          ticks={ticks}
          tickFormatter={fmtTick}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={fmtINR}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          width={56}
          domain={['auto', 'auto']}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as PricePoint;
            return (
              <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm text-xs">
                <p className="text-gray-500">{d.date}</p>
                <p className="font-semibold text-gray-900">₹{d.close.toFixed(2)}</p>
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="close"
          stroke={lineColor}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
