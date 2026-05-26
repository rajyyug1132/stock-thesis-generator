export function StockGridSkeleton() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 0,
        borderLeft: '1px solid var(--border-subtle)',
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{
            padding: '1.5rem',
            borderRight: '1px solid var(--border-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
            minHeight: 140,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          {/* Symbol placeholder */}
          <div style={{ width: 80, height: 10, background: 'var(--bg-elevated)' }} />
          {/* Price placeholder */}
          <div style={{ width: 120, height: 24, background: 'var(--bg-elevated)' }} />
          {/* Sparkline placeholder */}
          <div style={{ width: '100%', height: 28, background: 'var(--bg-elevated)' }} />
          {/* Return placeholder */}
          <div style={{ width: 60, height: 10, background: 'var(--bg-elevated)' }} />
        </div>
      ))}
    </div>
  );
}
