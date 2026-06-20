import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useAppState } from '../hooks/useAppState';
import SharedControls from './SharedControls';
import {
  ageIncomeRows,
  districtRents,
  formatEuro,
  getAffordabilityShare,
  getAverageDistrictRentSeries,
  getComparisonDataset,
  getDistrictRentSeries,
  getReferenceIncomeYear,
  graduateSalaryBenchmark2023,
  incomeTrend,
  occupationIncomeRows,
  realIncomeTrend,
  type ComparisonMode,
} from '../data/storyData';

const comparisonConfig: Record<ComparisonMode, { label: string; description: string }> = {
  age: {
    label: 'Age groups',
    description: 'Median income by age group. Thin marker = full-time median.',
  },
  education: {
    label: 'Education levels',
    description: 'Median income by education level. Dots show women and men.',
  },
  occupation: {
    label: 'Occupation groups',
    description: 'Median income by occupation group. Markers show the quartile range.',
  },
};

const chartBox = { width: 980, height: 500, margin: { top: 40, right: 30, bottom: 52, left: 72 } };

const PersonalOverviewView = () => {
  const {
    userData,
    selectedIncomeYear,
    setSelectedIncomeYear,
    selectedDistrict,
    rentOverlayMode,
    setRentOverlayMode,
  } = useAppState();

  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('age');
  const trendRef = useRef<SVGSVGElement>(null);
  const comparisonRef = useRef<SVGSVGElement>(null);
  const comparisonRows = useMemo(() => getComparisonDataset(comparisonMode), [comparisonMode]);
  const comparisonHeight = Math.max(420, comparisonRows.length * 78 + 72);

  const rentSeries = useMemo(() => {
    if (rentOverlayMode === 'average') {
      return getAverageDistrictRentSeries(userData.apartmentSize).map((point) => ({
        year: point.year,
        annual: point.monthlyRent * 12,
      }));
    }

    const district = districtRents.find((item) => item.name === selectedDistrict) ?? districtRents[0];
    return getDistrictRentSeries(userData.apartmentSize, district).map((point) => ({
      year: point.year,
      annual: point.monthlyRent * 12,
    }));
  }, [rentOverlayMode, selectedDistrict, userData.apartmentSize]);

  const incomeContext = useMemo(() => {
    const referenceYear = getReferenceIncomeYear(selectedIncomeYear);
    const currentIncome = incomeTrend.find((point) => point.year === referenceYear) ?? incomeTrend[0];
    const realIncome = realIncomeTrend.find((point) => point.year === referenceYear) ?? realIncomeTrend[0];
    const monthlyIncome = currentIncome?.overall ? currentIncome.overall / 12 : 0;
    const realMonthlyIncome = realIncome?.overall ? realIncome.overall / 12 : 0;
    const graduateMonthlyGross = graduateSalaryBenchmark2023?.monthlyGross ?? 0;
    const rentPoint = rentSeries.find((point) => point.year === referenceYear) ?? rentSeries[rentSeries.length - 1];
    const monthlyRent = rentPoint ? rentPoint.annual / 12 : 0;

    return {
      referenceYear,
      monthlyIncome,
      realMonthlyIncome,
      graduateMonthlyGross,
      monthlyRent,
      rentShare: getAffordabilityShare(monthlyRent, monthlyIncome),
      graduateGap: getAffordabilityShare(monthlyRent, graduateMonthlyGross),
    };
  }, [selectedIncomeYear, rentSeries]);

  useEffect(() => {
    if (!trendRef.current) return;

    const svg = d3.select(trendRef.current);
    const { width: boxWidth, height: boxHeight, margin } = chartBox;
    const width = boxWidth - margin.left - margin.right;
    const height = boxHeight - margin.top - margin.bottom;

    const incomeSeries = incomeTrend.map((point) => ({
      year: point.year,
      nominal: point.overall ?? 0,
      real: realIncomeTrend.find((entry) => entry.year === point.year)?.overall ?? 0,
    }));

    const yMax = d3.max([
      d3.max(incomeSeries, (point) => Math.max(point.nominal, point.real)) ?? 0,
      d3.max(rentSeries, (point) => point.annual) ?? 0,
      graduateSalaryBenchmark2023?.annualGross ?? 0,
      userData.salary * 12,
    ]) ?? 1;

    const x = d3.scaleLinear()
      .domain(d3.extent(incomeSeries, (point) => point.year) as [number, number])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, yMax])
      .nice()
      .range([height, 0]);

    const lineNominal = d3.line<typeof incomeSeries[number]>()
      .x((point) => x(point.year))
      .y((point) => y(point.nominal))
      .curve(d3.curveMonotoneX);

    const lineReal = d3.line<typeof incomeSeries[number]>()
      .x((point) => x(point.year))
      .y((point) => y(point.real))
      .curve(d3.curveMonotoneX);

    const lineRent = d3.line<typeof rentSeries[number]>()
      .x((point) => x(point.year))
      .y((point) => y(point.annual))
      .curve(d3.curveMonotoneX);

    const root = svg.selectAll<SVGGElement, unknown>('g.chart-root')
      .data([null])
      .join('g')
      .attr('class', 'chart-root')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    root.selectAll<SVGGElement, unknown>('g.x-axis')
      .data([null])
      .join('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format('d')));

    root.selectAll<SVGGElement, unknown>('g.y-axis')
      .data([null])
      .join('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(y).tickFormat((tick) => formatEuro(Number(tick), 0)));

    root.selectAll<SVGPathElement, typeof incomeSeries>('path.income-real')
      .data([incomeSeries])
      .join('path')
      .attr('class', 'income-real')
      .attr('fill', 'none')
      .attr('stroke', 'rgba(15, 23, 42, 0.45)')
      .attr('stroke-width', 2.5)
      .attr('stroke-dasharray', '6,6')
      .transition()
      .duration(300)
      .attr('d', lineReal);

    root.selectAll<SVGPathElement, typeof incomeSeries>('path.income-nominal')
      .data([incomeSeries])
      .join('path')
      .attr('class', 'income-nominal')
      .attr('fill', 'none')
      .attr('stroke', 'var(--chart-income-nominal)')
      .attr('stroke-width', 3.2)
      .transition()
      .duration(300)
      .attr('d', lineNominal);

    root.selectAll<SVGPathElement, typeof rentSeries>('path.rent-overlay')
      .data([rentSeries])
      .join('path')
      .attr('class', 'rent-overlay')
      .attr('fill', 'none')
      .attr('stroke', 'var(--chart-rent)')
      .attr('stroke-width', 2.4)
      .attr('stroke-dasharray', '8,6')
      .transition()
      .duration(300)
      .attr('d', lineRent);

    const userAnnual = userData.salary * 12;
    root.selectAll<SVGLineElement, number>('line.user-income')
      .data(userAnnual > 0 ? [userAnnual] : [])
      .join('line')
      .attr('class', 'user-income')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('stroke', 'var(--chart-income-user)')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .transition()
      .duration(300)
      .attr('y1', (value) => y(value))
      .attr('y2', (value) => y(value));

    root.selectAll<SVGLineElement, number>('line.year-marker')
      .data([incomeContext.referenceYear])
      .join('line')
      .attr('class', 'year-marker')
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', 'rgba(71, 85, 105, 0.45)')
      .attr('stroke-dasharray', '4,4')
      .transition()
      .duration(300)
      .attr('x1', (year) => x(year))
      .attr('x2', (year) => x(year));

    root.selectAll<SVGLineElement, number>('line.graduate-line')
      .data([graduateSalaryBenchmark2023?.annualGross ?? 0])
      .join('line')
      .attr('class', 'graduate-line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('stroke', 'var(--chart-income-graduate)')
      .attr('stroke-width', 1.75)
      .attr('stroke-dasharray', '7,6')
      .transition()
      .duration(300)
      .attr('y1', (value) => y(value))
      .attr('y2', (value) => y(value));
  }, [incomeContext.referenceYear, rentSeries, userData.salary]);

  useEffect(() => {
    if (!comparisonRef.current) return;

    const svg = d3.select(comparisonRef.current);
    svg.selectAll('*').remove();

    const rows = comparisonRows;
    const margin = { top: 22, right: 24, bottom: 28, left: comparisonMode === 'education' ? 390 : 330 };
    const rowHeight = comparisonMode === 'education' ? 82 : 72;
    const totalWidth = 980 - margin.left - margin.right;
    const valueColumnWidth = comparisonMode === 'education' ? 140 : 110;
    const width = totalWidth - valueColumnWidth;
    const height = Math.max(comparisonMode === 'education' ? 470 : 360, rows.length * rowHeight);
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3.scaleLinear()
      .domain([0, d3.max(rows, (row) => Math.max(row.value, row.secondaryValue ?? 0, row.tertiaryValue ?? 0)) ?? 1])
      .nice()
      .range([0, width]);

    const y = d3.scaleBand<string>()
      .domain(rows.map((row) => row.label))
      .range([0, innerHeight])
      .padding(0.3);

    const chart = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    chart.append('g')
      .call(d3.axisLeft(y).tickSize(0))
      .call((group) => group.selectAll('text').attr('fill', '#0f172a').style('font-size', '11px').style('font-weight', '600'))
      .call((group) => group.select('.domain').remove());

    chart.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat((value) => formatEuro(Number(value), 0)))
      .call((group) => group.select('.domain').attr('stroke', 'rgba(148, 163, 184, 0.5)'));

    const row = chart.selectAll('.comparison-row')
      .data(rows)
      .enter()
      .append('g')
      .attr('class', 'comparison-row')
      .attr('transform', (item) => `translate(0, ${y(item.label) ?? 0})`);

    row.append('rect')
      .attr('height', y.bandwidth())
      .attr('width', (item) => x(item.value))
      .attr('rx', 10)
      .attr('fill', '#4f46e5')
      .attr('opacity', 0.9);

    row.append('text')
      .attr('x', width + 12)
      .attr('y', y.bandwidth() / 2 + 4)
      .attr('fill', '#0f172a')
      .style('font-size', '11px')
      .style('font-weight', '700')
      .attr('text-anchor', 'start')
      .text((item) => formatEuro(item.value, 0));

    if (comparisonMode === 'education') {
      row.filter((item) => typeof item.secondaryValue === 'number')
        .append('circle')
        .attr('cx', (item) => x(item.secondaryValue ?? 0))
        .attr('cy', y.bandwidth() / 2)
        .attr('r', 5)
        .attr('fill', '#0f172a');

      row.filter((item) => typeof item.tertiaryValue === 'number')
        .append('circle')
        .attr('cx', (item) => x(item.tertiaryValue ?? 0))
        .attr('cy', y.bandwidth() / 2)
        .attr('r', 5)
        .attr('fill', '#f59e0b');
    } else {
      row.filter((item) => typeof item.secondaryValue === 'number')
        .append('line')
        .attr('x1', (item) => x(item.secondaryValue ?? 0))
        .attr('x2', (item) => x(item.secondaryValue ?? 0))
        .attr('y1', 6)
        .attr('y2', y.bandwidth() - 6)
        .attr('stroke', '#0f172a')
        .attr('stroke-width', 2);

      row.filter((item) => typeof item.tertiaryValue === 'number')
        .append('line')
        .attr('x1', (item) => x(item.tertiaryValue ?? 0))
        .attr('x2', (item) => x(item.tertiaryValue ?? 0))
        .attr('y1', 6)
        .attr('y2', y.bandwidth() - 6)
        .attr('stroke', '#f59e0b')
        .attr('stroke-width', 2);
    }
  }, [comparisonRows, comparisonMode]);

  const age20to29 = ageIncomeRows.find((row) => row.label === '20 bis 29 Jahre');
  const universityIncome = occupationIncomeRows.find((row) => row.label === 'Akademische Berufe');
  const rentShare = getAffordabilityShare(incomeContext.monthlyRent, incomeContext.monthlyIncome);

  const comparisonHint = comparisonMode === 'education'
    ? 'Black dots = women. Orange dots = men.'
    : comparisonMode === 'age'
      ? 'Black line = full-time median.'
      : 'Black line = 1st quartile. Yellow line = 3rd quartile.';

  return (
    <section className="view-container">
      <div className="section-header">
        <p className="eyebrow">Income pressure</p>
        <h2>Income growth versus housing costs</h2>
        <p>
          Overlay rent data on the income trend to make the affordability gap visible.
        </p>
      </div>

      <SharedControls
        minYear={1998}
        maxYear={2025}
        note="Income timeline: 1998-2025. Housing timeline: 2005-2025."
        value={selectedIncomeYear}
        onChange={setSelectedIncomeYear}
        rentOverlayMode={rentOverlayMode}
        onRentOverlayChange={setRentOverlayMode}
        selectedDistrict={selectedDistrict}
      />

      <div className="content-grid two-column">
        <div className="card chart-card">
          <div className="card-heading">
            <div>
              <h3>Income trend with rent overlay</h3>
              <p>
                Blue = nominal income, dashed dark = inflation-adjusted income, red dashed = rent trend.
              </p>
            </div>
            <div className="chart-badges wrap">
              <span>Selected year {incomeContext.referenceYear}</span>
              <span>{rentOverlayMode === 'average' ? 'Rent source: Vienna average' : `Rent source: ${selectedDistrict}`}</span>
            </div>
          </div>
          <svg ref={trendRef} className="responsive-chart" viewBox="0 0 980 500" />
        </div>

        <div className="card summary-card">
          <h3>Current affordability snapshot</h3>
          <div className="stat-stack">
            <div className="stat-item">
              <span>Your annual income</span>
              <strong>{formatEuro(userData.salary ? userData.salary * 12 : null, 0)}</strong>
            </div>
            <div className="stat-item">
              <span>Monthly income proxy</span>
              <strong>{formatEuro(incomeContext.monthlyIncome, 0)}</strong>
            </div>
            <div className="stat-item">
              <span>Real monthly income (1998 prices)</span>
              <strong>{formatEuro(incomeContext.realMonthlyIncome, 0)}</strong>
            </div>
            <div className="stat-item">
              <span>Monthly rent for {userData.apartmentSize} m²</span>
              <strong>{formatEuro(incomeContext.monthlyRent, 0)}</strong>
            </div>
            <div className="stat-item">
              <span>Rent share of nominal income</span>
              <strong>{rentShare.toFixed(0)}%</strong>
            </div>
            <div className="stat-item">
              <span>Rent share of graduate benchmark</span>
              <strong>{incomeContext.graduateGap.toFixed(0)}%</strong>
            </div>
          </div>
          <div className="mini-panel">
            <strong>Young adult benchmark</strong>
            <p>
              For ages 20 to 29, median gross income is {formatEuro(age20to29?.income.all.median ?? null, 0)}.
            </p>
            <strong>University-level benchmark</strong>
            <p>
              Academic occupations reach {formatEuro(universityIncome?.income.median ?? null, 0)} annually.
            </p>
          </div>
        </div>
      </div>

      <div className="card chart-card">
        <div className="card-heading">
          <div>
            <h3>2023 comparison view</h3>
            <p>{comparisonConfig[comparisonMode].description}</p>
          </div>
          <div className="segmented-control">
            {(Object.keys(comparisonConfig) as ComparisonMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={comparisonMode === mode ? 'segment active' : 'segment'}
                onClick={() => setComparisonMode(mode)}
              >
                {comparisonConfig[mode].label}
              </button>
            ))}
          </div>
        </div>
        <p className="chart-note">{comparisonHint}</p>
        <div className="comparison-legend">
          {comparisonMode === 'education' ? (
            <>
              <span><i className="legend-mark-dot women" /> Women</span>
              <span><i className="legend-mark-dot men" /> Men</span>
            </>
          ) : comparisonMode === 'age' ? (
            <>
              <span><i className="legend-mark-line black" /> Full-time median</span>
            </>
          ) : (
            <>
              <span><i className="legend-mark-line black" /> 1st quartile</span>
              <span><i className="legend-mark-line yellow" /> 3rd quartile</span>
            </>
          )}
        </div>
        <svg ref={comparisonRef} className="responsive-chart comparison-chart" viewBox={`0 0 980 ${comparisonHeight}`} />
      </div>
    </section>
  );
};

export default PersonalOverviewView;
