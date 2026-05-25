export default function Loading() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-canvas)' }}>
      <div className="max-w-4xl mx-auto px-8 py-12 space-y-12 animate-pulse">
        {/* Header skeleton */}
        <div className="space-y-3">
          <div className="h-3 w-48 rounded-sm" style={{ background: 'var(--bg-input)' }} />
          <div className="h-10 w-40 rounded-sm" style={{ background: 'var(--bg-elevated)' }} />
        </div>
        {/* Fundamentals */}
        <div className="space-y-2 max-w-sm">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex justify-between py-2" style={{ borderBottom: '1px dotted var(--border-subtle)' }}>
              <div className="h-3 w-28 rounded-sm" style={{ background: 'var(--bg-input)' }} />
              <div className="h-3 w-16 rounded-sm" style={{ background: 'var(--bg-input)' }} />
            </div>
          ))}
        </div>
        {/* Chart */}
        <div className="h-52 rounded-sm" style={{ background: 'var(--bg-card)' }} />
        {/* Abstract */}
        <div className="space-y-2">
          <div className="h-3 w-56 rounded-sm" style={{ background: 'var(--bg-input)' }} />
          <div className="h-24 rounded-sm" style={{ background: 'var(--bg-card)', borderLeft: '2px solid var(--border-strong)' }} />
        </div>
        {/* Bull/Bear */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-48 rounded-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }} />
          <div className="h-48 rounded-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }} />
        </div>
      </div>
    </main>
  );
}
