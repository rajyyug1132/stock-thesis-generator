/* eslint-disable */
/* PriceChart — area chart in raw SVG (no recharts dependency).
   Mirrors Stocks/components/price-chart.tsx visually. */

function PriceChart({ data, height = 220, width = 920 }) {
  if (!data || data.length < 2) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>No price data</div>;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = { l: 48, r: 12, t: 8, b: 22 };
  const w = width - padding.l - padding.r;
  const h = height - padding.t - padding.b;
  const isUp = data[data.length - 1] >= data[0];
  const stroke = isUp ? 'var(--up)' : 'var(--down)';
  const fillId = isUp ? 'fillUp' : 'fillDn';
  const step = w / (data.length - 1);

  const pts = data.map((v, i) => [padding.l + i * step, padding.t + h - ((v - min) / range) * h]);
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${pts[pts.length - 1][0].toFixed(1)} ${padding.t + h} L ${pts[0][0].toFixed(1)} ${padding.t + h} Z`;

  // y-axis ticks (4 steps)
  const yTicks = [0, 0.33, 0.66, 1].map((t) => {
    const v = min + t * range;
    const y = padding.t + h - t * h;
    return { v, y };
  });

  // x-axis tick positions — every 12 weeks (quarterly)
  const xTicks = [];
  for (let i = 0; i < data.length; i += 12) {
    xTicks.push({ i, x: padding.l + i * step, label: `W${i + 1}` });
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
      <defs>
        <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={isUp ? '#a8c7ba' : '#c98a7a'} stopOpacity="0.18"/>
          <stop offset="100%" stopColor={isUp ? '#a8c7ba' : '#c98a7a'} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* y-grid */}
      {yTicks.map((t, idx) => (
        <g key={idx}>
          <line x1={padding.l} y1={t.y} x2={width - padding.r} y2={t.y} stroke="#26221f" strokeWidth="1" strokeDasharray="3 3"/>
          <text x={padding.l - 8} y={t.y + 3} textAnchor="end" fontFamily="'Geist Mono', monospace" fontSize="10" fill="#6c665e" letterSpacing="0.04em">
            ₹{t.v.toFixed(0)}
          </text>
        </g>
      ))}
      {/* x-axis */}
      <line x1={padding.l} y1={padding.t + h} x2={width - padding.r} y2={padding.t + h} stroke="#3a342d" strokeWidth="1"/>
      {xTicks.map((t, idx) => (
        <text key={idx} x={t.x} y={padding.t + h + 16} textAnchor="middle" fontFamily="'Geist Mono', monospace" fontSize="10" fill="#6c665e" letterSpacing="0.04em">{t.label}</text>
      ))}
      {/* area + line */}
      <path d={areaPath} fill={`url(#${fillId})`} />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
      {/* terminal dot */}
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill={stroke}/>
    </svg>
  );
}

Object.assign(window, { PriceChart });
