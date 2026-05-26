'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import * as d3 from 'd3';
import type { SimResult } from '@/lib/sim/types';

interface DualFanChartProps {
  base: SimResult;
  shock: SimResult | null;
  height?: number;
}

interface CrosshairState {
  x: number;
  y: number;
  day: number;
  baseP50: number;
  shockP50: number | null;
}

const MARGIN = { top: 16, right: 16, bottom: 32, left: 52 };
const MINT = 'var(--mint)';
const RUST = 'var(--rust)';

export function DualFanChart({ base, shock, height = 280 }: DualFanChartProps) {
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
      const n = base.percentiles.p50.length;

      svg
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`);

      const g = svg
        .append('g')
        .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

      // Shared scale encompassing both base and shock
      const allVals = [
        ...Array.from(base.percentiles.p5),
        ...Array.from(base.percentiles.p95),
        ...(shock ? Array.from(shock.percentiles.p5) : []),
        ...(shock ? Array.from(shock.percentiles.p95) : []),
      ];
      const yMin = d3.min(allVals)! * 0.98;
      const yMax = d3.max(allVals)! * 1.02;

      const xScale = d3.scaleLinear().domain([0, n - 1]).range([0, innerW]);
      const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerH, 0]);

      // Axes
      g.append('g')
        .attr('class', 'y-axis')
        .call(
          d3.axisLeft(yScale)
            .ticks(5)
            .tickFormat((d) => `${(((d as number) * 100) - 100).toFixed(0)}%`)
            .tickSize(-innerW)
        )
        .call((ax) => ax.select('.domain').remove())
        .call((ax) => ax.selectAll('.tick line').attr('stroke', 'var(--border-subtle)').attr('stroke-dasharray', '2,4'))
        .call((ax) => ax.selectAll('.tick text').attr('fill', 'var(--text-tertiary)').attr('font-size', '10px').attr('font-family', 'var(--font-mono)').attr('dx', '-4px'));

      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(
          d3.axisBottom(xScale)
            .ticks(Math.min(8, Math.floor(innerW / 60)))
            .tickFormat((d) => `D${d}`)
            .tickSize(0)
        )
        .call((ax) => ax.select('.domain').remove())
        .call((ax) => ax.selectAll('.tick text').attr('fill', 'var(--text-tertiary)').attr('font-size', '10px').attr('font-family', 'var(--font-mono)'));

      // Baseline at y=1
      const refY = yScale(1);
      if (refY >= 0 && refY <= innerH) {
        g.append('line')
          .attr('x1', 0).attr('x2', innerW)
          .attr('y1', refY).attr('y2', refY)
          .attr('stroke', 'var(--border-strong)')
          .attr('stroke-dasharray', '4,4')
          .attr('stroke-width', 1);
      }

      type AreaDatum = [number, number, number];
      const area = d3
        .area<AreaDatum>()
        .x((_, i) => xScale(i))
        .y0(([, lo]) => yScale(lo))
        .y1(([, , hi]) => yScale(hi))
        .curve(d3.curveCatmullRom.alpha(0.5));

      const lineGen = d3
        .line<number>()
        .x((_, i) => xScale(i))
        .y((v) => yScale(v))
        .curve(d3.curveCatmullRom.alpha(0.5));

      function drawFan(
        pct: SimResult['percentiles'],
        mean: SimResult['mean'],
        color: string,
        opacityOuter: number,
        opacityInner: number
      ) {
        const outer: AreaDatum[] = Array.from({ length: n }, (_, i) => [i, pct.p5[i], pct.p95[i]]);
        const inner: AreaDatum[] = Array.from({ length: n }, (_, i) => [i, pct.p25[i], pct.p75[i]]);

        g.append('path').datum(outer).attr('d', area).attr('fill', color).attr('opacity', opacityOuter);
        g.append('path').datum(inner).attr('d', area).attr('fill', color).attr('opacity', opacityInner);

        g.append('path')
          .datum(Array.from(mean))
          .attr('d', lineGen)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 1)
          .attr('opacity', 0.4)
          .attr('stroke-dasharray', '3,3');

        g.append('path')
          .datum(Array.from(pct.p50))
          .attr('d', lineGen)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 2)
          .attr('opacity', 0.85);
      }

      // Base first (below), shock on top
      drawFan(base.percentiles, base.mean, MINT, 0.10, 0.22);
      if (shock) drawFan(shock.percentiles, shock.mean, RUST, 0.08, 0.18);

      // Crosshair
      const crosshairG = g.append('g').attr('opacity', 0).attr('pointer-events', 'none');
      const vLine = crosshairG
        .append('line')
        .attr('y1', 0).attr('y2', innerH)
        .attr('stroke', 'var(--border-strong)')
        .attr('stroke-width', 1);

      g.append('rect')
        .attr('width', innerW).attr('height', innerH)
        .attr('fill', 'transparent')
        .attr('cursor', 'crosshair')
        .on('mousemove', function (event) {
          const [mx] = d3.pointer(event);
          const day = Math.max(0, Math.min(n - 1, Math.round(xScale.invert(mx))));
          const cx = xScale(day);

          crosshairG.attr('opacity', 1);
          vLine.attr('x1', cx).attr('x2', cx);

          const containerRect = containerRef.current?.getBoundingClientRect();
          const svgRect = svgRef.current?.getBoundingClientRect();
          if (!containerRect || !svgRect) return;

          setCrosshair({
            x: svgRect.left - containerRect.left + cx + MARGIN.left,
            y: svgRect.top - containerRect.top + MARGIN.top,
            day,
            baseP50: base.percentiles.p50[day],
            shockP50: shock ? shock.percentiles.p50[day] : null,
          });
        })
        .on('mouseleave', function () {
          crosshairG.attr('opacity', 0);
          setCrosshair(null);
        });
    },
    [base, shock, height]
  );

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
    <div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', color: 'var(--mint)' }}>
          ▬ BASE CASE
        </span>
        {shock && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', color: 'var(--rust)' }}>
            ▬ SHOCK CASE
          </span>
        )}
      </div>

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
            <div className="flex justify-between gap-4">
              <span style={{ color: 'var(--mint)' }}>base p50</span>
              <span style={{ color: crosshair.baseP50 >= 1 ? 'var(--up)' : 'var(--down)' }}>
                {fmt(crosshair.baseP50)}
              </span>
            </div>
            {crosshair.shockP50 !== null && (
              <div className="flex justify-between gap-4">
                <span style={{ color: 'var(--rust)' }}>shock p50</span>
                <span style={{ color: crosshair.shockP50 >= 1 ? 'var(--up)' : 'var(--down)' }}>
                  {fmt(crosshair.shockP50)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
