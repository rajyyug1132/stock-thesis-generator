export default function Loading() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-canvas)' }}>
      <div className="max-w-5xl mx-auto px-8 py-12 space-y-14 animate-pulse">
        {/* Header */}
        <div className="space-y-3">
          <div className="h-3 w-56 rounded-sm" style={{ background: 'var(--bg-input)' }} />
          <div className="h-10 w-72 rounded-sm" style={{ background: 'var(--bg-elevated)' }} />
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-5 w-24 rounded-sm" style={{ background: 'var(--bg-input)' }} />
            ))}
          </div>
        </div>

        {/* Metrics table */}
        <div className="space-y-3">
          <div className="h-3 w-24 rounded-sm" style={{ background: 'var(--bg-input)' }} />
          <div className="h-56 rounded-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }} />
        </div>

        {/* Correlation heatmap */}
        <div className="space-y-3">
          <div className="h-3 w-64 rounded-sm" style={{ background: 'var(--bg-input)' }} />
          <div className="h-64 rounded-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }} />
        </div>

        {/* Portfolio simulator */}
        <div className="space-y-3">
          <div className="h-3 w-72 rounded-sm" style={{ background: 'var(--bg-input)' }} />
          <div className="h-72 rounded-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }} />
        </div>
      </div>
    </main>
  );
}
