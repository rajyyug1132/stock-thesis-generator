/* eslint-disable */
/* Primitive components — direct reskins of Stocks/components/ui/*.tsx
   in Editorial Quant tokens. */

const { useState, useEffect, useRef, useMemo } = React;

function SectionLabel({ children, style }) {
  return (
    <div className="section-label" style={style}>{children}</div>
  );
}

function Pill({ variant = 'default', children, style }) {
  const palette = {
    default:    { color: 'var(--text-secondary)', border: 'var(--border-subtle)', bg: 'transparent' },
    up:         { color: 'var(--up)',             border: 'var(--up)',            bg: 'var(--up-soft)' },
    down:       { color: 'var(--down)',           border: 'var(--down)',          bg: 'var(--down-soft)' },
    accent:     { color: 'var(--accent)',         border: 'var(--accent)',        bg: 'transparent' },
    unverified: { color: 'var(--unverified)',     border: 'var(--unverified)',    bg: 'transparent' },
  }[variant];
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      fontFamily: 'var(--font-mono)',
      textTransform: 'uppercase',
      fontSize: 'var(--text-micro)',
      letterSpacing: '0.1em',
      lineHeight: 1.4,
      padding: '2px 8px',
      color: palette.color,
      border: `1px solid ${palette.border}`,
      background: palette.bg,
      ...style,
    }}>{children}</span>
  );
}

function Panel({ label, children, padded = true, style }) {
  return (
    <div style={{
      position: 'relative',
      border: '1px solid var(--border-subtle)',
      background: 'var(--bg-elevated)',
      ...style,
    }}>
      {label && (
        <div style={{
          position: 'absolute',
          top: -9,
          left: 18,
          background: 'var(--bg-canvas)',
          padding: '0 8px',
        }}>
          <SectionLabel>{label}</SectionLabel>
        </div>
      )}
      <div style={padded ? { padding: '24px' } : null}>{children}</div>
    </div>
  );
}

function DataRow({ label, value, unit, divider = true }) {
  return (
    <div className={divider ? 'divider-dotted' : ''} style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      padding: '8px 0', gap: 16,
    }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-small)' }}>{label}</span>
      <span className="num" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-body)' }}>
        {value}
        {unit && <span style={{ marginLeft: 4, color: 'var(--text-tertiary)', fontSize: 'var(--text-small)' }}>{unit}</span>}
      </span>
    </div>
  );
}

function DirectionalNum({ value, format = 'pct', decimals = 2, showSign = true, showTriangle = false, style }) {
  const positive = value >= 0;
  const zero = value === 0;
  const color = zero ? 'var(--text-secondary)' : positive ? 'var(--up)' : 'var(--down)';
  const triangle = zero ? '·' : positive ? '▲' : '▼';
  const sign = value > 0 ? '+' : '';
  let display;
  if (format === 'pct')      display = `${(value * 100).toFixed(decimals)}%`;
  else if (format === 'currency') display = `₹${value.toFixed(decimals)}`;
  else                        display = value.toFixed(decimals);
  return (
    <span className="num" style={{ color, ...style }}>
      {showTriangle && <span style={{ fontSize: '0.7em', marginRight: 4 }}>{triangle}</span>}
      {showSign && sign}
      {display}
    </span>
  );
}

function Sparkline({ data, color, width = 200, height = 32 }) {
  if (!data || data.length < 2) return <span style={{ display: 'inline-block', width, height }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const lineColor = color || (data[data.length - 1] >= data[0] ? 'var(--up)' : 'var(--down)');
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / range) * height).toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={lineColor} strokeWidth="1.5" />
    </svg>
  );
}

function Button({ variant = 'primary', children, onClick, disabled, style, as = 'button', href }) {
  const cls = variant === 'primary' ? 'btn btn-primary' : variant === 'outline' ? 'btn btn-outline' : 'btn';
  const Tag = as;
  return (
    <Tag className={cls} onClick={onClick} disabled={disabled} href={href} style={style}>
      {children}
    </Tag>
  );
}

/* Logo mark (matches assets/logo-mark.svg) */
function LogoMark({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <rect x="0.5" y="0.5" width="63" height="63" fill="none" stroke="var(--accent)" strokeWidth="1"/>
      <text x="32" y="44" fontFamily="'Instrument Serif', Georgia, serif" fontSize="44" fill="var(--text-primary)" textAnchor="middle" fontStyle="italic">Q</text>
      <line x1="44" y1="46" x2="58" y2="32" stroke="var(--accent)" strokeWidth="2"/>
      <line x1="58" y1="32" x2="58" y2="38" stroke="var(--accent)" strokeWidth="2"/>
      <line x1="58" y1="32" x2="52" y2="32" stroke="var(--accent)" strokeWidth="2"/>
    </svg>
  );
}

Object.assign(window, {
  SectionLabel, Pill, Panel, DataRow, DirectionalNum, Sparkline, Button, LogoMark,
  React_useState: useState, React_useEffect: useEffect, React_useRef: useRef, React_useMemo: useMemo,
});
