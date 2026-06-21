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
  getHousingIndexForYear,
  getHousingIndexRatio,
  housingCostRows,
  housingInflationSnapshots,
  tenureRows,
} from '../data/storyData';

const districtGeo = viennaGeo as unknown as DistrictFeatureCollection;
const AFFORDABILITY_THRESHOLD = 30;

const YEAR_MIN = housingInflationSnapshots[0]?.year ?? 2005;
const YEAR_MAX = housingInflationSnapshots[housingInflationSnapshots.length - 1]?.year ?? 2025;
const FIRST_HOUSING_INDEX = getHousingIndexForYear(YEAR_MIN);
const LAST_HOUSING_INDEX = getHousingIndexForYear(YEAR_MAX);

type YearRange = [number, number];

const GeographicView = () => {
  const { userData, selectedDistrict, setSelectedDistrict } = useAppState();

  // D3 DOM refs
  const mapSvgRef = useRef<SVGSVGElement>(null);
  const brushSvgRef = useRef<SVGSVGElement>(null);

  // Stable refs for values used inside D3 event-handler closures
  const selectedDistrictRef = useRef<string | null>(selectedDistrict);
  const compareDistrictRef   = useRef<string | null>(null);
  const userDataRef = useRef(userData);
  const districtRentMapRef = useRef<Map<string, { start: number; end: number; absChange: number; devFromAvg: number }>>(new Map());
  const committedRangeRef = useRef<YearRange>([YEAR_MIN, YEAR_MAX]);
  const isDraggingRef = useRef(false);
  const brushXScaleRef = useRef<d3.ScaleLinear<number, number> | null>(null);
  const brushGRef      = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const d3BrushRef     = useRef<d3.BrushBehavior<unknown> | null>(null);
  const playTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { selectedDistrictRef.current = selectedDistrict; }, [selectedDistrict]);
  useEffect(() => { userDataRef.current = userData; }, [userData]);

  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  const [committedRange, setCommittedRange] = useState<YearRange>([YEAR_MIN, YEAR_MIN]);
  const [draftRange, setDraftRange] = useState<YearRange>([YEAR_MIN, YEAR_MIN]);
  const [compareDistrict, setCompareDistrict] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rankSortBy, setRankSortBy] = useState<'devFromAvg' | 'endRent'>('devFromAvg');

  useEffect(() => { committedRangeRef.current = committedRange; }, [committedRange]);
  useEffect(() => { compareDistrictRef.current = compareDistrict; }, [compareDistrict]);

  const selectedDistrictData = useMemo(
    () => districtRents.find((d) => d.name === selectedDistrict) ?? null,
    [selectedDistrict],
  );

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

  const allYearEndRentExtent = useMemo(() => {
    const values = districtRents.flatMap((district) => housingInflationSnapshots.map((entry) => (
      getDistrictRentForYear(district, entry.year)
    )));
    return d3.extent(values) as [number, number];
  }, []);

  const mapMetricMode = rankSortBy;

  // Color scale adapts to the selected metric:
  // relative mode emphasizes distance from Vienna average;
  // absolute mode emphasizes €/m² differences across districts.
  const colorScale = useMemo(
    () => (
      mapMetricMode === 'devFromAvg'
        ? d3.scaleDivergingSqrt<string>((t) => d3.interpolateRdYlGn(1 - t))
          .domain([-(maxAbsPct + 6), 0, maxAbsPct + 6])
        : d3.scaleSequential<string>(d3.interpolateYlOrRd)
          .domain([allYearEndRentExtent[0] ?? 0, allYearEndRentExtent[1] ?? 1])
    ),
    [maxAbsPct, allYearEndRentExtent, mapMetricMode],
  );

  // Side-panel derived values (all read from precomputed map)
  const selectedRentData = selectedDistrictData
    ? (districtRentMap.get(selectedDistrictData.name) ?? null)
    : null;
  const selectedAverageRent = districtSpread.average * getHousingIndexRatio(committedRange[1]);
  const monthlyRentEnd = selectedRentData ? selectedRentData.end * userData.apartmentSize : 0;
  const affordability  = useAffordabilityCalculator(monthlyRentEnd, userData.salary);

  // Compare-district derived values (hooks must be called unconditionally)
  const compareDistrictData = useMemo(
    () => districtRents.find((d) => d.name === compareDistrict) ?? null,
    [compareDistrict],
  );
  const compareRentData = compareDistrictData
    ? (districtRentMap.get(compareDistrictData.name) ?? null)
    : null;
  const compareAverageRent = districtSpread.average * getHousingIndexRatio(committedRange[1]);
  const monthlyRentEndCompare = compareRentData ? compareRentData.end * userData.apartmentSize : 0;
  const affordabilityCompare  = useAffordabilityCalculator(monthlyRentEndCompare, userData.salary);

  const housingCostRow = housingCostRows.find((row) => row.label === '18 bis 34 Jahre');
  const tenureRow      = tenureRows.find((row) => row.label === '18 bis 34 Jahre');
  const durationRow    = contractDurationRows.find((row) => row.label === 'Wien');

  const rankedDistricts = useMemo(
    () => [...districtRents].sort((a, b) =>
      rankSortBy === 'devFromAvg'
        ? (districtRentMap.get(b.name)?.devFromAvg ?? 0) - (districtRentMap.get(a.name)?.devFromAvg ?? 0)
        : (districtRentMap.get(b.name)?.end ?? 0) - (districtRentMap.get(a.name)?.end ?? 0),
    ),
    [districtRentMap, rankSortBy],
  );

  const sortModeLabel = rankSortBy === 'devFromAvg'
    ? 'deviation from Vienna average'
    : 'absolute rent per m²';

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
      .on('click', (event: MouseEvent, feature: DistrictFeature) => {
        const name = feature.properties.name;
        if (event.shiftKey) {
          // Shift-click: toggle compare district (can't compare a district with itself)
          if (name === selectedDistrictRef.current) return;
          setCompareDistrict(compareDistrictRef.current === name ? null : name);
        } else {
          setSelectedDistrict(selectedDistrictRef.current === name ? null : name);
        }
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
    const yearProgress = Math.max(
      0,
      Math.min(
        1,
        (getHousingIndexForYear(committedRangeRef.current[1]) - FIRST_HOUSING_INDEX)
          / Math.max(LAST_HOUSING_INDEX - FIRST_HOUSING_INDEX, 1),
      ),
    );

    root.selectAll<SVGPathElement, DistrictFeature>('path.district-shape')
      .transition().duration(dur)
      .attr('fill', (feature) => {
        const entry = districtRentMapRef.current.get(feature.properties.name);
        if (!entry) return '#e2e8f0';
        return mapMetricMode === 'devFromAvg'
          ? colorScale(entry.devFromAvg + (yearProgress * 4))
          : colorScale(entry.end);
      })
      .attr('stroke', (feature) => {
        if (feature.properties.name === selectedDistrict) return 'var(--geo-stroke-selected)';
        if (feature.properties.name === compareDistrict) return '#7c3aed';
        return 'rgba(255,255,255,0.82)';
      })
      .attr('stroke-width', (feature) => (
        feature.properties.name === selectedDistrict || feature.properties.name === compareDistrict ? 2.4 : 1.2
      ))
      .attr('opacity', (feature) => {
        const district = districtRents.find((d) => d.name === feature.properties.name);
        if (!district) return 1;
        const e     = getDistrictRentForYear(district, draftRange[1]);
        const share = getAffordabilityShare(e * userData.apartmentSize, userData.salary);
        return share <= AFFORDABILITY_THRESHOLD ? 1 : 0.82;
      });
  }, [draftRange, colorScale, selectedDistrict, compareDistrict, userData, mapMetricMode]);

  // Brush setup (desktop only, runs once)
  useEffect(() => {
    if (!brushSvgRef.current) return;

    const margin     = { left: 52, right: 52 };
    const innerWidth = 596;
    const brushH     = 28;

    const svgEl = brushSvgRef.current;
    const xScale = d3.scaleLinear()
      .domain([YEAR_MIN, YEAR_MAX])
      .range([0, innerWidth])
      .clamp(true);
    brushXScaleRef.current = xScale;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();
    const g = svg.append('g').attr('transform', `translate(${margin.left}, 4)`);

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

    d3BrushRef.current = brush;
    const brushG = g.append('g').attr('class', 'geo-brush').call(brush);
    brushGRef.current = brushG;

    brushG.select('.selection')
      .attr('fill', 'rgba(99,102,241,0.12)')
      .attr('stroke', '#6366f1').attr('stroke-width', 1.5);
    brushG.selectAll('.handle').attr('fill', '#6366f1').attr('rx', 3);

    brushG.call(brush.move, [xScale(committedRangeRef.current[0]), xScale(committedRangeRef.current[1])]);
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      if (playTimerRef.current) { clearInterval(playTimerRef.current); playTimerRef.current = null; }
      return;
    }
    playTimerRef.current = setInterval(() => {
      setCommittedRange((prev) => {
        if (prev[1] >= YEAR_MAX) {
          setIsPlaying(false);
          return prev;
        }
        const next: YearRange = [prev[0], prev[1] + 1];
        setDraftRange(next);
        if (brushXScaleRef.current && brushGRef.current && d3BrushRef.current) {
          brushGRef.current.call(
            d3BrushRef.current.move,
            [brushXScaleRef.current(prev[0]), brushXScaleRef.current(prev[1] + 1)],
          );
        }
        return next;
      });
    }, 600);
    return () => {
      if (playTimerRef.current) { clearInterval(playTimerRef.current); playTimerRef.current = null; }
    };
  }, [isPlaying]);

  const affordabilityLabel = affordability.affordable
    ? 'Affordable (≤ 30 %)'
    : 'Above threshold (> 30 %)';

  return (
    <section className="view-container">
      <div className="section-header">
        <p className="eyebrow">Housing pressure</p>
        <h2>Vienna districts – rent level relative to average</h2>
        <p>
          Use the year range slider to move the comparison window. Map colour shows each district relative
          to the Vienna average at the selected end year, or by absolute €/m² if you switch the ranking mode below. Click a district for details;
          click the same district again to close it. <strong>Shift-click</strong> a second district
          to compare both side by side.
        </p>
      </div>

      {/* Year-range selector */}
      <div className="card brush-container">
        <div className="brush-wrapper">
          <div className="brush-range-label">
            <span className="brush-range-badge">
              {draftRange[0]} – {draftRange[1]}
              {(draftRange[0] !== committedRange[0] || draftRange[1] !== committedRange[1]) && ' (dragging…)'}
            </span>
            <button
              type="button"
              className={`play-btn${isPlaying ? ' playing' : ''}`}
              onClick={() => {
                if (!isPlaying && committedRange[1] >= YEAR_MAX) {
                  const reset: YearRange = [committedRange[0], committedRange[0] + 1];
                  setCommittedRange(reset);
                  setDraftRange(reset);
                }
                setIsPlaying((p) => !p);
              }}
              aria-label={isPlaying ? 'Pause animation' : 'Play — advances end year automatically'}
              title={isPlaying ? 'Pause' : 'Play — advances end year automatically'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
          </div>
          <svg ref={brushSvgRef} className="brush-timeline" viewBox="0 0 700 64" preserveAspectRatio="none" />
        </div>
      </div>

      <div className="map-layout-container">
        <div className="map-column">
          <div className="card map-card">
            <svg
              ref={mapSvgRef}
              className="responsive-map"
              viewBox="0 0 760 600"
              preserveAspectRatio="xMidYMid meet"
            />
            <div className="map-legend">
              <div className="legend-line">
                {mapMetricMode === 'devFromAvg' ? (
                  <>
                    <span className="legend-label-below">Below Vienna average</span>
                    <span className="legend-label-center">Vienna average (0 %)</span>
                    <span className="legend-label-above">Above Vienna average</span>
                  </>
                ) : (
                  <>
                    <span className="legend-label-below">Lower €/m²</span>
                    <span className="legend-label-center">Selected year</span>
                    <span className="legend-label-above">Higher €/m²</span>
                  </>
                )}
              </div>
              <div className={mapMetricMode === 'devFromAvg' ? 'legend-bar legend-bar-diverging' : 'legend-bar legend-bar-sequential'} />
              <p>
                Fill mode:{' '}
                {mapMetricMode === 'devFromAvg' ? 'relative to average' : 'absolute rent per m²'} · Border:{' '}
                <span style={{ fontWeight: 600 }}>selected district</span> = dark outline.
              </p>
              <p>Affordability threshold: {AFFORDABILITY_THRESHOLD}% of monthly gross income is shown in the side panel.</p>
            </div>
          </div>

          <div className="card ranking-card ranking-card--inline">
            <div className="ranking-header">
              <span className="mini-section-heading">All 23 districts ({committedRange[1]})</span>
              <div className="ranking-sort-group">
                <span className="ranking-sort-label">Sort districts by:</span>
                <button
                  type="button"
                  className={rankSortBy === 'devFromAvg' ? 'sort-btn active' : 'sort-btn'}
                  onClick={() => setRankSortBy('devFromAvg')}
                >Deviation from average</button>
                <button
                  type="button"
                  className={rankSortBy === 'endRent' ? 'sort-btn active' : 'sort-btn'}
                  onClick={() => setRankSortBy('endRent')}
                >€/m²</button>
              </div>
            </div>
            <p className="control-note">
              Current mode: {sortModeLabel}. The ranking order and the map colour scale update together.
            </p>
            <div className="ranking-list">
              {rankedDistricts.map((district, i) => {
                const data       = districtRentMap.get(district.name);
                const isSelected = selectedDistrict === district.name;
                const isCompare  = compareDistrict === district.name;
                return (
                  <button
                    key={district.id}
                    type="button"
                    className={`ranking-row${isSelected ? ' active' : ''}${isCompare ? ' compare' : ''}`}
                    onClick={(e) => {
                      if (e.shiftKey && selectedDistrict && district.name !== selectedDistrict) {
                        setCompareDistrict(isCompare ? null : district.name);
                      } else {
                        setSelectedDistrict(isSelected ? null : district.name);
                      }
                    }}
                  >
                    <span className="ranking-pos">{i + 1}</span>
                    <span className="ranking-name">{district.name}</span>
                    {rankSortBy === 'devFromAvg' ? (
                      <>
                        <strong className={`ranking-value-emphasis${(data?.devFromAvg ?? 0) >= 0 ? ' stat-up' : ' stat-down'}`}>
                          {(data?.devFromAvg ?? 0) >= 0 ? '+' : ''}
                          {(data?.devFromAvg ?? 0).toFixed(1)} %
                        </strong>
                        <span className="ranking-value-secondary">
                          {formatEuro(data?.end ?? 0, 2)}/m²
                        </span>
                      </>
                    ) : (
                      <>
                        <strong className="ranking-value-emphasis ranking-value-neutral">
                          {formatEuro(data?.end ?? 0, 2)}/m²
                        </strong>
                        <span className="ranking-value-secondary">
                          {(data?.devFromAvg ?? 0) >= 0 ? '+' : ''}
                          {(data?.devFromAvg ?? 0).toFixed(1)} %
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {selectedDistrict && selectedRentData && (
            <motion.div
              key={`${selectedDistrict}|${compareDistrict ?? ''}`}
              className={`card side-panel-card${compareDistrict && compareRentData ? ' side-panel-card--compare' : ''}`}
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 28 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <div className="card-heading">
                <div>
                  {compareDistrict && compareRentData ? (
                    <h3>Comparing 2 districts</h3>
                  ) : (
                    <>
                      <h3>{selectedDistrictData?.name}</h3>
                      <p>District {selectedDistrictData?.id}</p>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  className="panel-close-btn"
                  onClick={() => { setSelectedDistrict(null); setCompareDistrict(null); }}
                  aria-label="Close panel"
                >✕</button>
              </div>

              {compareDistrict && compareRentData ? (
                /* ── Compare mode: two stat columns ── */
                <div className="compare-columns">
                  <div className="compare-col">
                    <div className="compare-col-header">
                      {selectedDistrictData?.name}
                      <span className="compare-col-id">({selectedDistrictData?.id})</span>
                    </div>
                    <div className="stat-stack">
                      <div className="stat-item">
                        <span>Rent {committedRange[1]}</span>
                        <strong>{formatEuro(selectedRentData.end, 2)}/m²</strong>
                      </div>
                      <div className="stat-item">
                        <span>vs. Vienna Ø</span>
                        <strong className={selectedRentData.end >= selectedAverageRent ? 'stat-up' : 'stat-down'}>
                          {selectedRentData.end >= selectedAverageRent ? '+' : ''}
                          {formatEuro(Math.abs(selectedRentData.end - selectedAverageRent), 2)}/m²
                        </strong>
                      </div>
                      <div className="stat-item">
                        <span>Monthly ({userData.apartmentSize} m²)</span>
                        <strong>{formatEuro(monthlyRentEnd, 0)}</strong>
                      </div>
                      <div className="stat-item">
                        <span>% of income</span>
                        <strong>{affordability.rentPercentage.toFixed(0)} %</strong>
                      </div>
                      <div className="stat-item">
                        <span>Status</span>
                        <strong>{affordability.affordable ? '✓ Affordable' : '✗ Above 30 %'}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="compare-col compare-col--secondary">
                    <div className="compare-col-header">
                      {compareDistrictData?.name}
                      <span className="compare-col-id">({compareDistrictData?.id})</span>
                    </div>
                    <div className="stat-stack">
                      <div className="stat-item">
                        <span>Rent {committedRange[1]}</span>
                        <strong>{formatEuro(compareRentData.end, 2)}/m²</strong>
                      </div>
                      <div className="stat-item">
                        <span>vs. Vienna Ø</span>
                        <strong className={compareRentData.end >= compareAverageRent ? 'stat-up' : 'stat-down'}>
                          {compareRentData.end >= compareAverageRent ? '+' : ''}
                          {formatEuro(Math.abs(compareRentData.end - compareAverageRent), 2)}/m²
                        </strong>
                      </div>
                      <div className="stat-item">
                        <span>Monthly ({userData.apartmentSize} m²)</span>
                        <strong>{formatEuro(monthlyRentEndCompare, 0)}</strong>
                      </div>
                      <div className="stat-item">
                        <span>% of income</span>
                        <strong>{affordabilityCompare.rentPercentage.toFixed(0)} %</strong>
                      </div>
                      <div className="stat-item">
                        <span>Status</span>
                        <strong>{affordabilityCompare.affordable ? '✓ Affordable' : '✗ Above 30 %'}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Single-district mode ── */
                <>
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
                        +{selectedRentData.absChange.toFixed(2)} €/m²
                      </strong>
                    </div>
                    <div className="stat-item">
                      <span>vs. Vienna average ({committedRange[1]})</span>
                      <strong className={selectedRentData.end >= selectedAverageRent ? 'stat-up' : 'stat-down'}>
                        {selectedRentData.end >= selectedAverageRent ? '+' : ''}
                        {formatEuro(Math.abs(selectedRentData.end - selectedAverageRent), 2)}/m²
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
                </>
              )}
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
