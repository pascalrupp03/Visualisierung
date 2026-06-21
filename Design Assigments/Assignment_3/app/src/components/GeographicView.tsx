import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import * as d3 from 'd3';
import { useAppState } from '../hooks/useAppState';
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator';
import type { DistrictFeature, DistrictFeatureCollection } from '../types/data';
import viennaGeo from '../data/vienna_districts.json';
import {
  contractDurationRows,
  districtRents,
  districtSpread,
  formatEuro,
  formatPercent,
  getAffordabilityShare,
  getDistrictRentForYear,
  housingCostRows,
  housingInflationSnapshots,
  tenureRows,
} from '../data/storyData';

const districtGeo = viennaGeo as unknown as DistrictFeatureCollection;
const AFFORDABILITY_THRESHOLD = 30;

const YEAR_MIN = housingInflationSnapshots[0]?.year ?? 2005;
const YEAR_MAX = housingInflationSnapshots[housingInflationSnapshots.length - 1]?.year ?? 2025;
const ALL_YEARS = Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => YEAR_MIN + i);

type YearRange = [number, number];

const GeographicView = () => {
  const { userData, selectedDistrict, setSelectedDistrict } = useAppState();

  // D3 DOM refs
  const mapSvgRef = useRef<SVGSVGElement>(null);
  const brushSvgRef = useRef<SVGSVGElement>(null);

  // Stable refs for values used inside D3 event-handler closures
  const selectedDistrictRef = useRef<string | null>(selectedDistrict);
  const userDataRef = useRef(userData);
  const districtRentMapRef = useRef<Map<string, { start: number; end: number; absChange: number; devFromAvg: number }>>(new Map());
  const committedRangeRef = useRef<YearRange>([YEAR_MIN, YEAR_MAX]);
  const isDraggingRef = useRef(false);

  useEffect(() => { selectedDistrictRef.current = selectedDistrict; }, [selectedDistrict]);
  useEffect(() => { userDataRef.current = userData; }, [userData]);

  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  const [committedRange, setCommittedRange] = useState<YearRange>([YEAR_MIN, YEAR_MAX]);
  const [draftRange, setDraftRange] = useState<YearRange>([YEAR_MIN, YEAR_MAX]);

  useEffect(() => { committedRangeRef.current = committedRange; }, [committedRange]);

  // Touch-device detection (once at mount)
  const isTouchDevice = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
    [],
  );

  const selectedDistrictData = useMemo(
    () => districtRents.find((d) => d.name === selectedDistrict) ?? null,
    [selectedDistrict],
  );

  // devFromAvg is time-independent (housing index cancels out) — used for the colour scale.
  // absChange scales with avgRentM2, so expensive districts show a larger absolute increase.
  const districtRentMap = useMemo(() => {
    const map = new Map<string, { start: number; end: number; absChange: number; devFromAvg: number }>();
    for (const district of districtRents) {
      const startRent  = getDistrictRentForYear(district, committedRange[0]);
      const endRent    = getDistrictRentForYear(district, committedRange[1]);
      const devFromAvg = districtSpread.average > 0 && district.avgRentM2 != null
        ? ((district.avgRentM2 - districtSpread.average) / districtSpread.average) * 100
        : 0;
      map.set(district.name, { start: startRent, end: endRent, absChange: endRent - startRent, devFromAvg });
    }
    return map;
  }, [committedRange]);

  useEffect(() => { districtRentMapRef.current = districtRentMap; }, [districtRentMap]);

  const maxAbsPct = useMemo(() => {
    let max = 1;
    for (const val of districtRentMap.values()) max = Math.max(max, Math.abs(val.devFromAvg));
    return max;
  }, [districtRentMap]);

  // sqrt power scale: stretches the ±0–12 % cluster (~22 districts) visually while
  // keeping Innere Stadt (+37 %) at max saturation — ~2.5× more colour spread near 0.
  const colorScale = useMemo(
    () => d3.scaleDivergingSqrt<string>((t) => d3.interpolateRdYlGn(1 - t))
      .domain([-maxAbsPct, 0, maxAbsPct]),
    [maxAbsPct],
  );

  // Side-panel derived values (all read from precomputed map)
  const selectedRentData = selectedDistrictData
    ? (districtRentMap.get(selectedDistrictData.name) ?? null)
    : null;
  const monthlyRentEnd = selectedRentData ? selectedRentData.end * userData.apartmentSize : 0;
  const affordability  = useAffordabilityCalculator(monthlyRentEnd, userData.salary);

  const housingCostRow = housingCostRows.find((row) => row.label === '18 bis 34 Jahre');
  const tenureRow      = tenureRows.find((row) => row.label === '18 bis 34 Jahre');
  const durationRow    = contractDurationRows.find((row) => row.label === 'Wien');

  const rankedDistricts = useMemo(
    () => [...districtRents].sort(
      (a, b) => (districtRentMap.get(b.name)?.end ?? 0) - (districtRentMap.get(a.name)?.end ?? 0),
    ),
    [districtRentMap],
  );

  // Static map geometry — runs once at mount
  useEffect(() => {
    if (!mapSvgRef.current) return;
    const svg    = d3.select(mapSvgRef.current);
    const width  = 760;
    const height = 600;
    const projection = d3.geoMercator().fitSize([width, height], districtGeo);
    const pathGen    = d3.geoPath(projection);

    const root = svg.selectAll<SVGGElement, unknown>('g.map-root')
      .data([null]).join('g').attr('class', 'map-root');

    // District paths — geometry only; fill/stroke set by style effect
    root.selectAll<SVGPathElement, DistrictFeature>('path.district-shape')
      .data(districtGeo.features, (f) => f.properties.name)
      .join('path')
      .attr('class', 'district-shape')
      .attr('d', (f) => pathGen(f) ?? '')
      .attr('fill', '#e2e8f0')
      .attr('stroke', 'rgba(255,255,255,0.9)')
      .attr('stroke-width', 1.2)
      .style('cursor', 'pointer')
      .on('mouseenter', (event: MouseEvent, feature: DistrictFeature) => {
        const district = districtRents.find((d) => d.name === feature.properties.name);
        if (!district) return;
        const rentData = districtRentMapRef.current.get(feature.properties.name);
        const endRent  = rentData?.end ?? getDistrictRentForYear(district, committedRangeRef.current[1]);
        const dev      = rentData?.devFromAvg ?? 0;
        const share    = getAffordabilityShare(endRent * userDataRef.current.apartmentSize, userDataRef.current.salary);
        const label    = share <= AFFORDABILITY_THRESHOLD ? 'affordable' : 'above threshold';
        setTooltip({
          x: event.pageX,
          y: event.pageY - 24,
          content: `${district.name}: ${formatEuro(endRent, 2)}/m² · ${dev >= 0 ? '+' : ''}${dev.toFixed(1)}% vs. Ø · ${share.toFixed(0)}% of income (${label})`,
        });
      })
      .on('mouseleave', () => setTooltip(null))
      .on('click', (_, feature: DistrictFeature) => {
        const name = feature.properties.name;
        setSelectedDistrict(selectedDistrictRef.current === name ? null : name);
      });

    // District ID labels at static centroids
    root.selectAll<SVGTextElement, DistrictFeature>('text.district-id')
      .data(districtGeo.features, (f) => f.properties.name)
      .join('text')
      .attr('class', 'district-id')
      .attr('transform', (f) => { const [x, y] = pathGen.centroid(f); return `translate(${x},${y})`; })
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px').attr('font-weight', '700')
      .attr('fill', 'rgba(15, 23, 42, 0.85)')
      .attr('pointer-events', 'none')
      .text((f) => districtRents.find((d) => d.name === f.properties.name)?.id ?? '');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fill/stroke/opacity update — runs on draftRange for live affordability feedback
  useEffect(() => {
    if (!mapSvgRef.current) return;
    const root = d3.select(mapSvgRef.current).select<SVGGElement>('g.map-root');
    if (root.empty()) return;
    const dur = isDraggingRef.current ? 0 : 220;

    root.selectAll<SVGPathElement, DistrictFeature>('path.district-shape')
      .transition().duration(dur)
      .attr('fill', (feature) => {
        const entry = districtRentMapRef.current.get(feature.properties.name);
        return colorScale(entry?.devFromAvg ?? 0);
      })
      .attr('stroke', (feature) => {
        if (feature.properties.name === selectedDistrict) return 'var(--geo-stroke-selected)';
        const district = districtRents.find((d) => d.name === feature.properties.name);
        if (!district) return 'rgba(255,255,255,0.9)';
        const e     = getDistrictRentForYear(district, draftRange[1]);
        const share = getAffordabilityShare(e * userData.apartmentSize, userData.salary);
        return share <= AFFORDABILITY_THRESHOLD ? 'var(--chart-affordable)' : 'var(--chart-not-affordable)';
      })
      .attr('stroke-width', (feature) => (feature.properties.name === selectedDistrict ? 2.4 : 1.2))
      .attr('opacity', (feature) => {
        const district = districtRents.find((d) => d.name === feature.properties.name);
        if (!district) return 1;
        const e     = getDistrictRentForYear(district, draftRange[1]);
        const share = getAffordabilityShare(e * userData.apartmentSize, userData.salary);
        return share <= AFFORDABILITY_THRESHOLD ? 1 : 0.82;
      });
  }, [draftRange, colorScale, selectedDistrict, userData]);

  // Brush setup (desktop only, runs once)
  useEffect(() => {
    if (!brushSvgRef.current || isTouchDevice) return;

    // Fixed coordinate space matching viewBox="0 0 700 64"
    const margin     = { left: 52, right: 52 };
    const innerWidth = 596;
    const brushH     = 28;

    const svgEl = brushSvgRef.current;
    const xScale = d3.scaleLinear()
      .domain([YEAR_MIN, YEAR_MAX])
      .range([0, innerWidth])
      .clamp(true);

    const svg = d3.select(svgEl);
    const g   = svg.append('g').attr('transform', `translate(${margin.left}, 4)`);

    g.append('g')
      .attr('class', 'brush-axis')
      .attr('transform', `translate(0, ${brushH + 20})`)
      .call(d3.axisBottom(xScale).ticks(YEAR_MAX - YEAR_MIN).tickFormat(d3.format('d')).tickSize(4))
      .call((ax) => ax.select('.domain').attr('stroke', 'rgba(148,163,184,0.4)'))
      .call((ax) => ax.selectAll('text').attr('fill', '#64748b').attr('font-size', '10px'));

    const lblStart = g.append('text')
      .attr('y', brushH / 2 + 4).attr('text-anchor', 'middle')
      .attr('font-size', '11px').attr('font-weight', '700').attr('fill', '#6366f1')
      .text(String(YEAR_MIN));
    const lblEnd = g.append('text')
      .attr('y', brushH / 2 + 4).attr('text-anchor', 'middle')
      .attr('font-size', '11px').attr('font-weight', '700').attr('fill', '#6366f1')
      .text(String(YEAR_MAX));

    const updateLabels = (px0: number, px1: number) => {
      lblStart.attr('x', px0).text(Math.round(xScale.invert(px0)));
      lblEnd.attr('x', px1).text(Math.round(xScale.invert(px1)));
    };

    const brush = d3.brushX()
      .extent([[0, 0], [innerWidth, brushH]])
      .on('start brush', (event) => {
        if (!event.selection) return;
        isDraggingRef.current = true;
        const [px0, px1] = event.selection as [number, number];
        const s = Math.round(xScale.invert(px0));
        const e = Math.round(xScale.invert(px1));
        setDraftRange([Math.min(s, e), Math.max(s, e)]);
        updateLabels(px0, px1);
      })
      .on('end', (event) => {
        isDraggingRef.current = false;
        if (!event.selection) {
          // Brush cleared — reset to full range
          setCommittedRange([YEAR_MIN, YEAR_MAX]);
          setDraftRange([YEAR_MIN, YEAR_MAX]);
          return;
        }
        const [px0, px1] = event.selection as [number, number];
        const s = Math.round(xScale.invert(px0));
        const e = Math.round(xScale.invert(px1));
        const range: YearRange = [Math.min(s, e), Math.max(s, e)];
        setCommittedRange(range);
        setDraftRange(range);
        updateLabels(px0, px1);
      });

    const brushG = g.append('g').attr('class', 'geo-brush').call(brush);

    brushG.select('.selection')
      .attr('fill', 'rgba(99,102,241,0.12)')
      .attr('stroke', '#6366f1').attr('stroke-width', 1.5);
    brushG.selectAll('.handle').attr('fill', '#6366f1').attr('rx', 3);
  }, [isTouchDevice]); // eslint-disable-line react-hooks/exhaustive-deps

  const affordabilityLabel = affordability.affordable
    ? 'Affordable (≤ 30 %)'
    : 'Above threshold (> 30 %)';

  return (
    <section className="view-container">
      <div className="section-header">
        <p className="eyebrow">Housing pressure</p>
        <h2>Vienna districts – rent level relative to average</h2>
        <p>
          Select a time window to set the reference period. Map colour shows each district relative
          to the Vienna average at the end year. Click a district for details;
          click the same district again to close it.
        </p>
      </div>

      {/* Year-range selector */}
      <div className="card brush-container">
        {isTouchDevice ? (
          <div className="touch-year-range">
            <div className="touch-year-field">
              <label htmlFor="geo-start-year">From</label>
              <select
                id="geo-start-year"
                value={committedRange[0]}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  const next: YearRange = [v, Math.max(v + 1, committedRange[1])];
                  setCommittedRange(next); setDraftRange(next);
                }}
              >
                {ALL_YEARS.slice(0, -1).map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <span className="touch-year-sep">→</span>
            <div className="touch-year-field">
              <label htmlFor="geo-end-year">To</label>
              <select
                id="geo-end-year"
                value={committedRange[1]}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  const next: YearRange = [Math.min(committedRange[0], v - 1), v];
                  setCommittedRange(next); setDraftRange(next);
                }}
              >
                {ALL_YEARS.slice(1).map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <span className="brush-range-badge">{committedRange[0]} – {committedRange[1]}</span>
          </div>
        ) : (
          <div className="brush-wrapper">
            <div className="brush-range-label">
              <span className="brush-range-badge">
                {draftRange[0]} – {draftRange[1]}
                {(draftRange[0] !== committedRange[0] || draftRange[1] !== committedRange[1]) && ' (dragging…)'}
              </span>
            </div>
            <svg ref={brushSvgRef} className="brush-timeline" viewBox="0 0 700 64" preserveAspectRatio="none" />
          </div>
        )}
      </div>

      <div className="map-layout-container">
        <div className="card map-card">
          <svg
            ref={mapSvgRef}
            className="responsive-map"
            viewBox="0 0 760 600"
            preserveAspectRatio="xMidYMid meet"
          />
          <div className="map-legend">
            <div className="legend-line">
              <span className="legend-label-below">Below Vienna average</span>
              <span className="legend-label-center">Vienna average (0 %)</span>
              <span className="legend-label-above">Above Vienna average</span>
            </div>
            <div className="legend-bar legend-bar-diverging" />
            <p>
              Border:{' '}
              <span style={{ color: 'var(--chart-affordable)', fontWeight: 600 }}>green</span> = affordable (≤ 30 %),{' '}
              <span style={{ color: 'var(--chart-not-affordable)', fontWeight: 600 }}>red</span> = above threshold.
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {selectedDistrict && selectedRentData && (
            <motion.div
              key={selectedDistrict}
              className="card side-panel-card"
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 28 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <div className="card-heading">
                <div>
                  <h3>{selectedDistrictData?.name}</h3>
                  <p>District {selectedDistrictData?.id}</p>
                </div>
                <button
                  type="button"
                  className="panel-close-btn"
                  onClick={() => setSelectedDistrict(null)}
                  aria-label="Close panel"
                >✕</button>
              </div>

              <div className="stat-stack">
                <div className="stat-item">
                  <span>Rent {committedRange[0]}</span>
                  <strong>{formatEuro(selectedRentData.start, 2)}/m²</strong>
                </div>
                <div className="stat-item">
                  <span>Rent {committedRange[1]}</span>
                  <strong>{formatEuro(selectedRentData.end, 2)}/m²</strong>
                </div>
                <div className="stat-item">
                  <span>Price increase {committedRange[0]}–{committedRange[1]}</span>
                  <strong className="stat-up">
                    +{selectedRentData.absChange.toFixed(2)} €/m²
                  </strong>
                </div>
                <div className="stat-item">
                  <span>vs. Vienna average ({committedRange[1]})</span>
                  <strong className={selectedRentData.devFromAvg >= 0 ? 'stat-up' : 'stat-down'}>
                    {selectedRentData.devFromAvg >= 0 ? '+' : ''}{selectedRentData.devFromAvg.toFixed(1)} %
                  </strong>
                </div>
                <div className="stat-item">
                  <span>Monthly rent for {userData.apartmentSize} m² ({committedRange[1]})</span>
                  <strong>{formatEuro(monthlyRentEnd, 0)}</strong>
                </div>
                <div className="stat-item">
                  <span>Share of your monthly gross income</span>
                  <strong>{affordability.rentPercentage.toFixed(0)} %</strong>
                </div>
                <div className="stat-item">
                  <span>Affordability status</span>
                  <strong>{affordabilityLabel}</strong>
                </div>
                <div className="stat-item">
                  <span>Vienna average (base year)</span>
                  <strong>{formatEuro(districtSpread.average, 2)}/m²</strong>
                </div>
              </div>

              <div className="mini-panel">
                <strong>Young adults in Vienna</strong>
                <p>
                  18–34 year-olds: {formatPercent(tenureRow?.shares.privateRent ?? null, 0)} private rent,{' '}
                  {formatPercent(tenureRow?.shares.municipal ?? null, 0)} municipal.
                  Median housing cost: {formatEuro(housingCostRow?.quantiles.median ?? null, 0)}.
                </p>
                <strong>Contract duration (Wien)</strong>
                <p>
                  Median {durationRow?.durationStats.median ?? '–'} years ·{' '}
                  {formatPercent(durationRow?.fixedTermShare ?? null, 0)} fixed-term.
                </p>
              </div>

              <div className="district-rank-list">
                <div className="mini-section-heading">Highest rents ({committedRange[1]})</div>
                {rankedDistricts.slice(0, 5).map((district, i) => (
                  <button
                    key={district.id}
                    type="button"
                    className={selectedDistrict === district.name ? 'district-row active' : 'district-row'}
                    onClick={() => setSelectedDistrict(selectedDistrict === district.name ? null : district.name)}
                  >
                    <span>{i + 1}. {district.name}</span>
                    <strong>{formatEuro(districtRentMap.get(district.name)?.end ?? 0, 2)}</strong>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {tooltip && (
        <div className="tooltip" style={{ left: tooltip.x + 10, top: tooltip.y }}>
          {tooltip.content}
        </div>
      )}
    </section>
  );
};

export default GeographicView;
