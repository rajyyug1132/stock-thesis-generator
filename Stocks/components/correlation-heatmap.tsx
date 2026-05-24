interface CorrelationHeatmapProps {
  symbols: string[];
  // matrix[i][j] = correlation between symbols[i] and symbols[j]
  matrix: number[][];
}

function corrColor(r: number): string {
  // Diverging: blue (positive) → white (0) → red (negative)
  if (r >= 0) return `hsl(210, 80%, ${100 - r * 50}%)`;
  return `hsl(0, 80%, ${100 + r * 50}%)`;
}

function corrTextColor(r: number): string {
  return Math.abs(r) > 0.6 ? 'white' : '#374151';
}

function shortLabel(sym: string): string {
  return sym.replace('.NS', '').replace('.BO', '');
}

export function CorrelationHeatmap({ symbols, matrix }: CorrelationHeatmapProps) {
  const labels = symbols.map(shortLabel);
  const n = symbols.length;

  if (n < 2 || matrix.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <div
        className="inline-grid gap-0.5"
        style={{ gridTemplateColumns: `5rem repeat(${n}, minmax(4rem, 1fr))` }}
      >
        {/* Top-left empty cell */}
        <div />

        {/* Column headers */}
        {labels.map((lbl) => (
          <div
            key={lbl}
            className="flex items-center justify-center text-xs font-semibold text-gray-500 h-8 px-1 text-center"
          >
            {lbl}
          </div>
        ))}

        {/* Rows */}
        {symbols.map((rowSym, ri) => (
          <div key={rowSym} className="contents">
            {/* Row label */}
            <div className="flex items-center justify-end pr-2 text-xs font-semibold text-gray-500 h-10">
              {labels[ri]}
            </div>

            {/* Cells */}
            {symbols.map((colSym, ci) => {
              const r = matrix[ri]?.[ci] ?? (ri === ci ? 1 : 0);
              const isDiag = ri === ci;
              const bg = isDiag ? '#1f2937' : corrColor(r);
              const color = isDiag ? 'white' : corrTextColor(r);
              return (
                <div
                  key={`${rowSym}-${colSym}`}
                  className="flex items-center justify-center h-10 rounded text-xs font-medium tabular-nums"
                  style={{ backgroundColor: bg, color }}
                  title={`${labels[ri]} × ${labels[ci]}: ${r.toFixed(4)}`}
                >
                  {r.toFixed(2)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
