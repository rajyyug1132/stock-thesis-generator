'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { AnnotationTooltip } from '@/components/annotation-tooltip';
import { getAnnotations, type ChartAnnotation } from '@/lib/data/annotations';
import type { PricePoint } from '@/components/price-chart';

interface AnnotatedPriceChartProps {
  data: PricePoint[];
  symbol: string;
  height?: number;
  /** Override annotations (if not provided, falls back to ANNOTATIONS seed data) */
  annotations?: ChartAnnotation[];
}

const MARGIN = { top: 16, right: 12, bottom: 28, left: 58 };
const PIN_R = 5;

const SENTIMENT_PIN: Record<string, string> = {
  positive: 'var(--up, #4ade80)',
  negative: 'var(--down, #fb7185)',
  neutral: 'var(--accent, #c1f2e0)',
};

function fmtINR(v: number): string {
  if (v >= 1e5) return `₹${(v / 1e3).toFixed(0)}K`;
  return `₹${v.toFixed(0)}`;
}

function fmtDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  } catch {
    return dateStr;
  }
}

export function AnnotatedPriceChart({
  data,
  symbol,
  height = 260,
  annotations: annotationsProp,
}: AnnotatedPriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(640);
  const [activeAnnotation, setActiveAnnotation] = useState<{
    ann: ChartAnnotation;
    rect: DOMRect;
  } | null>(null);

  // Merge prop annotations with seed data
  const annotations = useMemo(
    () => annotationsProp ?? getAnnotations(symbol),
    [annotationsProp, symbol]
  );

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = height - MARGIN.top - MARGIN.bottom;

  // Scales (memoised so they recompute only when data/size changes)
  const { xScale, yScale } = useMemo(() => {
    if (!data || data.length < 2) return { xScale: null, yScale: null };

    const dates = data.map((d) => new Date(d.date));
    const prices = data.map((d) => d.close);

    const xScale = d3
      .scaleTime()
      .domain(d3.extent(dates) as [Date, Date])
      .range([0, innerW]);

    const [minP, maxP] = d3.extent(prices) as [number, number];
    const pad = (maxP - minP) * 0.08;
    const yScale = d3
      .scaleLinear()
      .domain([minP - pad, maxP + pad])
      .range([innerH, 0]);

    return { xScale, yScale };
  }, [data, innerW, innerH]);

  // Draw chart via D3 imperatively
  useEffect(() => {
    if (!svgRef.current || !xScale || !yScale || !data?.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg
      .append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // — Grid lines —
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3.axisLeft(yScale)
          .ticks(4)
          .tickSize(-innerW)
          .tickFormat(() => '')
      )
      .call((g) => g.select('.domain').remove())
      .call((g) =>
        g.selectAll('.tick line').attr('stroke', 'var(--bg-rule, #1a1c1e)').attr('stroke-width', 1)
      );

    // — X Axis —
    const everyTwoMonths = d3.timeMonth.every(2);
    const xTicks = everyTwoMonths ? xScale.ticks(everyTwoMonths) : xScale.ticks(4);
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).tickValues(xTicks).tickFormat((d) => fmtDate((d as Date).toISOString())))
      .call((g) => g.select('.domain').remove())
      .call((g) =>
        g.selectAll('.tick text')
          .attr('fill', 'var(--zinc-muted, #71717a)')
          .attr('font-size', 10)
          .attr('font-family', 'var(--font-mono, monospace)')
      )
      .call((g) => g.selectAll('.tick line').remove());

    // — Y Axis —
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(4).tickFormat((d) => fmtINR(d as number)))
      .call((g) => g.select('.domain').remove())
      .call((g) =>
        g.selectAll('.tick text')
          .attr('fill', 'var(--zinc-muted, #71717a)')
          .attr('font-size', 10)
          .attr('font-family', 'var(--font-mono, monospace)')
      )
      .call((g) => g.selectAll('.tick line').remove());

    // — Area gradient —
    const first = data[0].close;
    const last = data[data.length - 1].close;
    const isUp = last >= first;
    const lineColor = isUp ? 'var(--up, #4ade80)' : 'var(--down, #fb7185)';
    const gradStart = isUp ? 'rgba(74,222,128,0.18)' : 'rgba(251,113,133,0.18)';

    const defs = svg.append('defs');
    const gradId = `pcGrad-${symbol.replace(/[^a-z0-9]/gi, '')}`;
    const grad = defs
      .append('linearGradient')
      .attr('id', gradId)
      .attr('x1', '0')
      .attr('y1', '0')
      .attr('x2', '0')
      .attr('y2', '1');
    grad.append('stop').attr('offset', '0%').attr('stop-color', gradStart);
    grad.append('stop').attr('offset', '100%').attr('stop-color', 'transparent');

    // — Area path —
    const areaGen = d3
      .area<PricePoint>()
      .x((d) => xScale(new Date(d.date)))
      .y0(innerH)
      .y1((d) => yScale(d.close))
      .curve(d3.curveCatmullRom.alpha(0.5));

    g.append('path')
      .datum(data)
      .attr('fill', `url(#${gradId})`)
      .attr('d', areaGen);

    // — Line path —
    const lineGen = d3
      .line<PricePoint>()
      .x((d) => xScale(new Date(d.date)))
      .y((d) => yScale(d.close))
      .curve(d3.curveCatmullRom.alpha(0.5));

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', lineColor)
      .attr('stroke-width', 1.8)
      .attr('d', lineGen);

    // — Annotation pins —
    const annLayer = g.append('g').attr('class', 'annotations');

    annotations.forEach((ann) => {
      const annDate = new Date(ann.timestamp);
      // Find the nearest data point
      const nearest = data.reduce((prev, cur) =>
        Math.abs(new Date(cur.date).getTime() - annDate.getTime()) <
        Math.abs(new Date(prev.date).getTime() - annDate.getTime())
          ? cur
          : prev
      );
      const cx = xScale(new Date(nearest.date));
      const cy = yScale(nearest.close);
      const pinColor = SENTIMENT_PIN[ann.sentiment ?? 'neutral'];

      const pinG = annLayer
        .append('g')
        .attr('transform', `translate(${cx},${cy})`)
        .attr('class', 'ann-pin')
        .style('cursor', 'pointer');

      // Pulse ring
      pinG
        .append('circle')
        .attr('r', PIN_R + 4)
        .attr('fill', pinColor)
        .attr('opacity', 0.15);

      // Solid pin
      pinG
        .append('circle')
        .attr('r', PIN_R)
        .attr('fill', pinColor)
        .attr('stroke', 'var(--background, #050505)')
        .attr('stroke-width', 1.5);

      // Label tag
      const tagWidth = ann.label.length * 6.5 + 10;
      const tagX = cx + tagWidth / 2 > innerW ? -(tagWidth + 6) : 6;
      const tagG = pinG.append('g').attr('transform', `translate(${tagX},-12)`);
      tagG
        .append('rect')
        .attr('x', 0)
        .attr('y', -9)
        .attr('width', tagWidth)
        .attr('height', 14)
        .attr('rx', 3)
        .attr('fill', pinColor)
        .attr('opacity', 0.18);
      tagG
        .append('text')
        .attr('x', tagWidth / 2)
        .attr('y', 1)
        .attr('text-anchor', 'middle')
        .attr('fill', pinColor)
        .attr('font-size', 9)
        .attr('font-family', 'var(--font-mono, monospace)')
        .attr('font-weight', '700')
        .attr('letter-spacing', '0.06em')
        .text(ann.label.toUpperCase());

      // Hit area (larger clickable zone)
      pinG
        .append('circle')
        .attr('r', PIN_R + 8)
        .attr('fill', 'transparent')
        .attr('data-timestamp', ann.timestamp)
        .on('mouseenter', function () {
          d3.select(this.parentNode as SVGGElement)
            .select('circle:nth-child(2)')
            .transition()
            .duration(120)
            .attr('r', PIN_R + 2);
        })
        .on('mouseleave', function () {
          d3.select(this.parentNode as SVGGElement)
            .select('circle:nth-child(2)')
            .transition()
            .duration(120)
            .attr('r', PIN_R);
        })
        .on('click', function (event: MouseEvent) {
          event.stopPropagation();
          // Use the actual SVG circle's bounding rect for tooltip positioning
          const circleEl = (event.target as SVGCircleElement).closest('.ann-pin')
            ?.querySelector('circle:nth-child(2)');
          const rect = circleEl
            ? (circleEl as SVGCircleElement).getBoundingClientRect()
            : (event.target as SVGElement).getBoundingClientRect();
          setActiveAnnotation({ ann, rect });
        });
    });

    // Dismiss on background click
    svg.on('click', () => setActiveAnnotation(null));
  }, [data, symbol, xScale, yScale, annotations, innerW, innerH]);

  const handleCloseTooltip = useCallback(() => setActiveAnnotation(null), []);

  if (!data || data.length < 2) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--zinc-muted)',
        }}
        aria-label="No price data available"
      >
        No price data
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        role="img"
        aria-label={`Annotated 1-year price chart for ${symbol}`}
        style={{ display: 'block', overflow: 'visible' }}
      />

      {activeAnnotation && (
        <AnnotationTooltip
          annotation={activeAnnotation.ann}
          anchorRect={activeAnnotation.rect}
          onClose={handleCloseTooltip}
        />
      )}

      {/* Legend */}
      {annotations.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            right: 8,
            display: 'flex',
            gap: 10,
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 9,
            color: 'var(--zinc-muted, #71717a)',
            letterSpacing: '0.06em',
            pointerEvents: 'none',
          }}
        >
          <span style={{ color: 'var(--up)' }}>● +EVENT</span>
          <span style={{ color: 'var(--down)' }}>● −EVENT</span>
          <span>CLICK TO INSPECT</span>
        </div>
      )}
    </div>
  );
}
