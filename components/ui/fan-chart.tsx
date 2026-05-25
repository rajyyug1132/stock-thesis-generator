'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import * as d3 from 'd3';

interface FanChartProps {
  /** Each array is a percentile band path over time (horizonDays+1 values starting at 1.0) */
  percentiles: {
    p5: Float64Array;
    p25: Float64Array;
    p50: Float64Array; // median
    p75: Float64Array;
    p95: Float64Array;
  };
  mean: Float64Array;
  horizonDays?: number;
  height?: number;
}

interface CrosshairState {
  x: number;
  y: number;
  day: number;
  values: {
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
    mean: number;
  };
}

const MARGIN = { top: 16, right: 16, bottom: 32, left: 52 };

/**
 * D3 fan chart rendering percentile bands.
 * D3 owns all SVG internals. React owns the container div + ResizeObserver.
 * Crosshair hover shows tooltip with all percentile values.
 */
export function FanChart({ percentiles, mean, height = 280 }: FanChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [crosshair, setCrosshair] = useState<CrosshairState | null>(null);
  const widthRef = useRef(600);

  const render = useCallback(
    (width: number) => {
      const svg = d3.select(svgRef.current!);
      svg.selectAll('*').interrupt();
      svg.selectAll('*').remove();

      const innerW = width - MARGIN.left - MARGIN.right;
      const innerH = height - MARGIN.top - MARGIN.bottom;
      const n = percentiles.p50.length;

      svg
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`);

      const g = svg
        .append('g')
        .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

      // Scales
      const xScale = d3.scaleLinear().domain([0, n - 1]).range([0, innerW]);

      const allVals = [
        ...Array.from(percentiles.p5),
        ...Array.from(percentiles.p95),
      ];
      const [yMin, yMax] = [d3.min(allVals)! * 0.98, d3.max(allVals)! * 1.02];
      const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerH, 0]);

      // Axes
      const xAxis = d3
        .axisBottom(xScale)
        .ticks(Math.min(8, Math.floor(innerW / 60)))
        .tickFormat((d) => `D${d}`)
        .tickSize(0);

      const yAxis = d3
        .axisLeft(yScale)
        .ticks(5)
        .tickFormat((d) => `${((d as number) * 100 - 100).toFixed(0)}%`)
        .tickSize(-innerW);

      // Y gridlines
      g.append('g')
        .attr('class', 'y-axis')
        .call(yAxis)
        .call((ax) => ax.select('.domain').remove())
        .call((ax) =>
          ax
            .selectAll('.tick line')
            .attr('stroke', 'var(--border-subtle)')
            .attr('stroke-dasharray', '2,4')
        )
        .call((ax) =>
          ax
            .selectAll('.tick text')
            .attr('fill', 'var(--text-tertiary)')
            .attr('font-size', '10px')
            .attr('font-family', 'var(--font-mono)')
            .attr('dx', '-4px')
        );

      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(xAxis)
        .call((ax) => ax.select('.domain').remove())
        .call((ax) =>
          ax
            .selectAll('.tick text')
            .attr('fill', 'var(--text-tertiary)')
            .attr('font-size', '10px')
            .attr('font-family', 'var(--font-mono)')
        );

      // Reference line at y=1 (starting portfolio value)
      const refY = yScale(1);
      if (refY >= 0 && refY <= innerH) {
        g.append('line')
          .attr('x1', 0)
          .attr('x2', innerW)
          .attr('y1', refY)
          .attr('y2', refY)
          .attr('stroke', 'var(--border-strong)')
          .attr('stroke-dasharray', '4,4')
          .attr('stroke-width', 1);
      }

      // Area generators
      type AreaDatum = [number, number, number];
      const area = d3
        .area<AreaDatum>()
        .x((_, i) => xScale(i))
        .y0(([, lo]) => yScale(lo))
        .y1(([, , hi]) => yScale(hi))
        .curve(d3.curveCatmullRom.alpha(0.5));

      const outerData: AreaDatum[] = Array.from({ length: n }, (_, i) => [
        i,
        percentiles.p5[i],
        percentiles.p95[i],
      ]);
      const innerData: AreaDatum[] = Array.from({ length: n }, (_, i) => [
        i,
        percentiles.p25[i],
        percentiles.p75[i],
      ]);

      // Outer band (p5–p95)
      g.append('path')
        .datum(outerData)
        .attr('d', area)
        .attr('fill', 'var(--accent)')
        .attr('opacity', 0.12);

      // Inner band (p25–p75)
      g.append('path')
        .datum(innerData)
        .attr('d', area)
        .attr('fill', 'var(--accent)')
        .attr('opacity', 0.25);

      // Mean line
      const lineGen = d3
        .line<number>()
        .x((_, i) => xScale(i))
        .y((v) => yScale(v))
        .curve(d3.curveCatmullRom.alpha(0.5));

      g.append('path')
        .datum(Array.from(mean))
        .attr('d', lineGen)
        .attr('fill', 'none')
        .attr('stroke', 'var(--accent)')
        .attr('stroke-width', 1)
        .attr('opacity', 0.5)
        .attr('stroke-dasharray', '3,3');

      // Median line
      g.append('path')
        .datum(Array.from(percentiles.p50))
        .attr('d', lineGen)
        .attr('fill', 'none')
        .attr('stroke', 'var(--accent)')
        .attr('stroke-width', 2);

      // Crosshair overlay
      const crosshairG = g.append('g').attr('opacity', 0).attr('pointer-events', 'none');
      const vLine = crosshairG
        .append('line')
        .attr('y1', 0)
        .attr('y2', innerH)
        .attr('stroke', 'var(--border-strong)')
        .attr('stroke-width', 1);

      const hoverRect = g
        .append('rect')
        .attr('width', innerW)
        .attr('height', innerH)
        .attr('fill', 'transparent')
        .attr('cursor', 'crosshair');

      hoverRect
        .on('mousemove', function (event) {
          const [mx] = d3.pointer(event);
          const day = Math.round(xScale.invert(mx));
          const clampedDay = Math.max(0, Math.min(n - 1, day));
          const cx = xScale(clampedDay);

          crosshairG.attr('opacity', 1);
          vLine.attr('x1', cx).attr('x2', cx);

          const containerRect = containerRef.current?.getBoundingClientRect();
          if (!containerRect) return;

          const svgRect = svgRef.current?.getBoundingClientRect();
          if (!svgRect) return;

          setCrosshair({
            x: svgRect.left - containerRect.left + cx + MARGIN.left,
            y: svgRect.top - containerRect.top + MARGIN.top,
            day: clampedDay,
            values: {
              p5: percentiles.p5[clampedDay],
              p25: percentiles.p25[clampedDay],
              p50: percentiles.p50[clampedDay],
              p75: percentiles.p75[clampedDay],
              p95: percentiles.p95[clampedDay],
              mean: mean[clampedDay],
            },
          });
        })
        .on('mouseleave', function () {
          crosshairG.attr('opacity', 0);
          setCrosshair(null);
        });
    },
    [percentiles, mean, height]
  );

  // ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 600;
      widthRef.current = w;
      render(w);
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [render]);

  const fmt = (v: number) => `${((v - 1) * 100).toFixed(1)}%`;

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      <svg ref={svgRef} style={{ display: 'block', width: '100%', overflow: 'visible' }} />
      {crosshair && (
        <div
          className="pointer-events-none absolute z-30"
          style={{
            left: crosshair.x + 12,
            top: crosshair.y,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-strong)',
            padding: '0.625rem 0.875rem',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-small)',
            color: 'var(--text-primary)',
            minWidth: '148px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ color: 'var(--text-tertiary)', marginBottom: '0.4rem', fontSize: '10px' }}>
            DAY {crosshair.day}
          </div>
          {(
            [
              ['p95', crosshair.values.p95],
              ['p75', crosshair.values.p75],
              ['p50', crosshair.values.p50],
              ['mean', crosshair.values.mean],
              ['p25', crosshair.values.p25],
              ['p5', crosshair.values.p5],
            ] as [string, number][]
          ).map(([label, val]) => (
            <div key={label} className="flex justify-between gap-4">
              <span style={{ color: 'var(--text-tertiary)' }}>{label}</span>
              <span
                style={{
                  color: val >= 1 ? 'var(--up)' : 'var(--down)',
                }}
              >
                {fmt(val)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
