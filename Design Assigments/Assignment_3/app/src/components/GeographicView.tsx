import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useAppState } from '../hooks/useAppState';
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator';
import SharedControls from './SharedControls';
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

const GeographicView = () => {
  const { userData, selectedHousingYear, setSelectedHousingYear, selectedDistrict, setSelectedDistrict } = useAppState();
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  const selectedDistrictData = useMemo(
    () => districtRents.find((district) => district.name === selectedDistrict) ?? districtRents[0],
    [selectedDistrict],
  );

  const rentIndex = housingInflationSnapshots.find((point) => point.year === selectedHousingYear);
  const districtRent = selectedDistrictData ? getDistrictRentForYear(selectedDistrictData, selectedHousingYear) : 0;
  const monthlyDistrictRent = districtRent * userData.apartmentSize;
  const affordability = useAffordabilityCalculator(monthlyDistrictRent, userData.salary);
  const rentShareToUser = affordability.rentPercentage;
  const housingCostRow = housingCostRows.find((row) => row.label === '18 bis 34 Jahre');
  const tenureRow = tenureRows.find((row) => row.label === '18 bis 34 Jahre');
  const durationRow = contractDurationRows.find((row) => row.label === 'Wien');

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = 820;
    const height = 620;
    const baselineYear = housingInflationSnapshots[0]?.year ?? 2016;
    const sensitivityBoost = 4;

    const projection = d3.geoMercator().fitSize([width, height], districtGeo);
    const path = d3.geoPath(projection);

    const sensitiveValues = districtRents.flatMap((district) =>
      housingInflationSnapshots.map((entry) => {
        const currentRent = getDistrictRentForYear(district, entry.year);
        const baselineRent = getDistrictRentForYear(district, baselineYear);
        return currentRent + (currentRent - baselineRent) * sensitivityBoost;
      }),
    );

    const colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([
      d3.min(sensitiveValues) ?? 0,
      d3.max(sensitiveValues) ?? 1,
    ]);

    const root = svg.selectAll<SVGGElement, unknown>('g.map-root')
      .data([null])
      .join('g')
      .attr('class', 'map-root');

    const districtPaths = root.selectAll<SVGPathElement, DistrictFeature>('path.district-shape')
      .data(districtGeo.features, (feature) => feature.properties.name)
      .join('path')
      .attr('class', 'district-shape')
      .attr('d', (feature) => path(feature) ?? '')
      .style('cursor', 'pointer')
      .on('mouseenter', (event: MouseEvent, feature: DistrictFeature) => {
        const district = districtRents.find((item) => item.name === feature.properties.name);
        if (!district) return;

        const currentRent = getDistrictRentForYear(district, selectedHousingYear);
        const monthlyRent = currentRent * userData.apartmentSize;
        const share = getAffordabilityShare(monthlyRent, userData.salary);
        const label = share <= AFFORDABILITY_THRESHOLD ? 'affordable' : 'not affordable';

        setTooltip({
          x: event.pageX,
          y: event.pageY - 24,
          content: `${district.name}: ${formatEuro(currentRent, 2)} / m², ${formatEuro(monthlyRent, 0)} for ${userData.apartmentSize} m², ${share.toFixed(0)}% of your income (${label}).`,
        });
      })
      .on('mouseleave', () => setTooltip(null))
      .on('click', (_, feature: DistrictFeature) => {
        setSelectedDistrict(feature.properties.name);
      });

    districtPaths
      .transition()
      .duration(280)
      .attr('fill', (feature) => {
        const district = districtRents.find((item) => item.name === feature.properties.name);
        if (!district) return '#e2e8f0';

        const currentRent = getDistrictRentForYear(district, selectedHousingYear);
        const baselineRent = getDistrictRentForYear(district, baselineYear);
        const sensitiveValue = currentRent + (currentRent - baselineRent) * sensitivityBoost;
        return colorScale(sensitiveValue);
      })
      .attr('stroke', (feature) => {
        const district = districtRents.find((item) => item.name === feature.properties.name);
        if (!district) return 'rgba(255,255,255,0.9)';

        const share = getAffordabilityShare(getDistrictRentForYear(district, selectedHousingYear) * userData.apartmentSize, userData.salary);
        if (feature.properties.name === selectedDistrict) return 'var(--geo-stroke-selected)';
        return share <= AFFORDABILITY_THRESHOLD ? 'var(--chart-affordable)' : 'var(--chart-not-affordable)';
      })
      .attr('stroke-width', (feature) => (feature.properties.name === selectedDistrict ? 2.4 : 1.2))
      .attr('opacity', (feature) => {
        const district = districtRents.find((item) => item.name === feature.properties.name);
        if (!district) return 1;
        const share = getAffordabilityShare(getDistrictRentForYear(district, selectedHousingYear) * userData.apartmentSize, userData.salary);
        return share <= AFFORDABILITY_THRESHOLD ? 1 : 0.86;
      });

    root.selectAll<SVGTextElement, DistrictFeature>('text.district-id')
      .data(districtGeo.features, (feature) => feature.properties.name)
      .join('text')
      .attr('class', 'district-id')
      .attr('transform', (feature) => {
        const [x, y] = path.centroid(feature);
        return `translate(${x},${y})`;
      })
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .attr('fill', 'rgba(15, 23, 42, 0.85)')
      .attr('pointer-events', 'none')
      .text((feature) => districtRents.find((item) => item.name === feature.properties.name)?.id ?? '');
  }, [selectedHousingYear, selectedDistrict, setSelectedDistrict, userData.apartmentSize, userData.salary]);

  const rankedDistricts = useMemo(
    () => [...districtRents]
      .sort((left, right) => getDistrictRentForYear(right, selectedHousingYear) - getDistrictRentForYear(left, selectedHousingYear)),
    [selectedHousingYear],
  );

  const bottomDistricts = useMemo(
    () => [...districtRents]
      .sort((left, right) => getDistrictRentForYear(left, selectedHousingYear) - getDistrictRentForYear(right, selectedHousingYear)),
    [selectedHousingYear],
  );

  const affordabilityLabel = affordability.affordable ? 'Affordable for your input' : 'Above affordability threshold';

  return (
    <section className="view-container">
      <div className="section-header">
        <p className="eyebrow">Housing pressure</p>
        <h2>Vienna districts, rent inflation, and affordability</h2>
        <p>
          Income timeline starts at 1998, but district-rent timeline starts at 2016. District borders indicate affordability for your input.
        </p>
      </div>

      <SharedControls
        minYear={2016}
        maxYear={2025}
        note="Housing timeline available for 2016-2025."
        value={selectedHousingYear}
        onChange={setSelectedHousingYear}
      />

      <div className="content-grid map-layout">
        <div className="card map-card">
          <svg ref={svgRef} className="responsive-map" viewBox="0 0 860 700" preserveAspectRatio="xMidYMid meet" />
          <div className="map-legend">
            <div className="legend-line">
              <span>Lower rent</span>
              <span>Higher rent</span>
            </div>
            <div className="legend-bar" />
            <p>Border color: green = affordable, red = above 30% of your monthly gross income.</p>
          </div>
        </div>

        <div className="card detail-card">
          <div className="card-heading">
            <div>
              <h3>{selectedDistrictData?.name ?? 'Selected district'}</h3>
              <p>Selected year {selectedHousingYear}</p>
            </div>
            <div className="chart-badges">
              <span>{formatEuro(rentIndex?.housing ?? null, 1)} housing CPI</span>
              <span>{formatEuro(districtSpread.average, 2)} avg. district rent</span>
            </div>
          </div>

          <div className="stat-stack">
            <div className="stat-item">
              <span>District rent per m²</span>
              <strong>{formatEuro(districtRent, 2)}</strong>
            </div>
            <div className="stat-item">
              <span>Monthly rent for {userData.apartmentSize} m²</span>
              <strong>{formatEuro(monthlyDistrictRent, 0)}</strong>
            </div>
            <div className="stat-item">
              <span>Share of your monthly gross income</span>
              <strong>{rentShareToUser.toFixed(0)}%</strong>
            </div>
            <div className="stat-item">
              <span>Affordability status</span>
              <strong>{affordabilityLabel}</strong>
            </div>
            <div className="stat-item">
              <span>Vienna housing cost for 18-34</span>
              <strong>{formatEuro(housingCostRow?.mean ?? null, 0)}</strong>
            </div>
          </div>

          <div className="mini-panel">
            <strong>Young adults in Vienna</strong>
            <p>
              In the Mikrozensus, 18 to 34 year-olds report {formatPercent(tenureRow?.shares.privateRent ?? null, 0)} private
              rent, {formatPercent(tenureRow?.shares.municipal ?? null, 0)} municipal housing, and a median housing cost of{' '}
              {formatEuro(housingCostRow?.quantiles.median ?? null, 0)}.
            </p>
            <strong>Contract duration</strong>
            <p>
              Vienna&apos;s main rent segment shows a median contract duration of {durationRow?.durationStats.median ?? '–'} years
              with {formatPercent(durationRow?.fixedTermShare ?? null, 0)} fixed-term leases.
            </p>
          </div>

          <div className="district-rank-list">
            <div className="mini-section-heading">Most expensive districts</div>
            {rankedDistricts.slice(0, 5).map((district, index) => (
              <button
                key={district.id}
                type="button"
                className={selectedDistrictData?.name === district.name ? 'district-row active' : 'district-row'}
                onClick={() => setSelectedDistrict(district.name)}
              >
                <span>{index + 1}. {district.name}</span>
                <strong>{formatEuro(getDistrictRentForYear(district, selectedHousingYear), 2)}</strong>
              </button>
            ))}

            <div className="mini-section-heading">Lowest rents</div>
            {bottomDistricts.slice(0, 5).map((district, index) => (
              <button
                key={district.id}
                type="button"
                className={selectedDistrictData?.name === district.name ? 'district-row active' : 'district-row'}
                onClick={() => setSelectedDistrict(district.name)}
              >
                <span>{index + 1}. {district.name}</span>
                <strong>{formatEuro(getDistrictRentForYear(district, selectedHousingYear), 2)}</strong>
              </button>
            ))}
          </div>
        </div>
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
