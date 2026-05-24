// Date alignment for time-series. Compare dates as YYYY-MM-DD strings to avoid timezone bugs.

export interface PricePoint {
  date: string;
  close: number;
  volume?: number;
}

export interface AlignedPair {
  dates: string[];
  a: number[];
  b: number[];
}

export interface AlignedMany {
  dates: string[];
  values: number[][];
}

export function alignSeries(a: PricePoint[], b: PricePoint[]): AlignedPair {
  const mapA = new Map(a.map((p) => [p.date, p.close]));
  const mapB = new Map(b.map((p) => [p.date, p.close]));

  const dates: string[] = [];
  const valuesA: number[] = [];
  const valuesB: number[] = [];

  // Intersect dates, preserve sorted order
  const allDates = Array.from(new Set([...mapA.keys(), ...mapB.keys()])).sort();

  for (const d of allDates) {
    const va = mapA.get(d);
    const vb = mapB.get(d);
    if (va !== undefined && vb !== undefined) {
      dates.push(d);
      valuesA.push(va);
      valuesB.push(vb);
    }
  }

  return { dates, a: valuesA, b: valuesB };
}

export function alignManySeries(series: PricePoint[][]): AlignedMany {
  if (series.length === 0) return { dates: [], values: [] };

  const maps = series.map((s) => new Map(s.map((p) => [p.date, p.close])));

  // Find intersection of all date sets
  const allDates = Array.from(
    new Set(series.flatMap((s) => s.map((p) => p.date)))
  ).sort();

  const dates: string[] = [];
  const values: number[][] = series.map(() => []);

  for (const d of allDates) {
    const row = maps.map((m) => m.get(d));
    if (row.every((v) => v !== undefined)) {
      dates.push(d);
      row.forEach((v, i) => values[i].push(v as number));
    }
  }

  return { dates, values };
}
