import { useEffect, useRef, useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { motion } from 'framer-motion';
import * as d3 from 'd3';
import data from '../data/data.json';
import SharedControls from './SharedControls';
import type { AppData, VpiRecord } from '../types/data';

const chartData = data as unknown as AppData;

const categories = [
  { id: '04 WOHNUNG, WASSER, STROM, GAS UND ANDERE BRENNSTOFFE', label: 'Housing', color: 'var(--primary)' },
  { id: '01 NAHRUNGSMITTEL UND ALKOHOLFREIE GETRÄNKE', label: 'Food', color: '#f59e0b' },
  { id: '07 VERKEHR', label: 'Transport', color: '#10b981' },
  { id: '11 GASTRONOMIE- UND BEHERBERGUNGSDIENSTLEISTUNGEN', label: 'Leisure', color: '#ef4444' },
  { id: '13 ANDERE WAREN UND DIENSTLEISTUNGEN', label: 'Other', color: '#6366f1' }
] as const;

type CategoryId = (typeof categories)[number]['id'];

const PersonalOverviewView = () => {
  const { userData, selectedYear, showAverage } = useAppState();
  const chartRef = useRef<SVGSVGElement>(null);
  const costChartRef = useRef<SVGSVGElement>(null);
  const [activeCategories, setActiveCategories] = useState<CategoryId[]>([categories[0].id]);

  useEffect(() => {
    if (!chartRef.current) return;

    const svg = d3.select(chartRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 40, right: 100, bottom: 50, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
      .domain(d3.extent(chartData.vpi, d => d.year) as [number, number])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([80, 180])
      .range([height, 0]);

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    g.append("g")
      .call(d3.axisLeft(y));

    const activeCategoryIds = activeCategories.length > 0 ? activeCategories : categories.map(cat => cat.id);
    const meanValue = d3.mean(chartData.vpi, row => {
      return activeCategoryIds.reduce((sum, categoryId) => sum + row[categoryId], 0) / activeCategoryIds.length;
    }) ?? 0;

    if (showAverage) {
      g.append("path")
        .attr("fill", "none")
        .attr("stroke", "#111827")
        .attr("stroke-width", 2.5)
        .attr("stroke-dasharray", "6,4")
        .attr("d", `M 0 ${y(meanValue)} L ${width} ${y(meanValue)}`);

      g.append("text")
        .attr("x", width - 8)
        .attr("y", y(meanValue) - 8)
        .attr("text-anchor", "end")
        .attr("fill", "#111827")
        .style("font-size", "12px")
        .style("font-weight", "700")
        .text(`Mean of active categories (${activeCategoryIds.length})`);
    }

    // Areas for each active category
    categories.forEach(cat => {
      if (!activeCategories.includes(cat.id)) return;

      const area = d3.area<VpiRecord>()
        .x(d => x(d.year))
        .y0(height)
        .y1(d => y(d[cat.id]));

      const line = d3.line<VpiRecord>()
        .x(d => x(d.year))
        .y(d => y(d[cat.id]));

      // Add the area
      g.append("path")
        .datum(chartData.vpi)
        .attr("fill", cat.color)
        .attr("fill-opacity", 0.2)
        .attr("d", area);

      // Add the line on top
      g.append("path")
        .datum(chartData.vpi)
        .attr("fill", "none")
        .attr("stroke", cat.color)
        .attr("stroke-width", 2)
        .attr("d", line);
      
      // Point for selected year
      const selectedYearData = chartData.vpi.find(v => v.year === selectedYear) ?? chartData.vpi[0];
      const yVal = selectedYearData[cat.id];
      g.append("circle")
        .attr("cx", x(selectedYear))
        .attr("cy", y(yVal))
        .attr("r", 4)
        .attr("fill", cat.color);
    });

    // Year line
    g.append("line")
      .attr("x1", x(selectedYear))
      .attr("x2", x(selectedYear))
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "#ccc")
      .attr("stroke-dasharray", "4");

    // Labels
    g.append("text")
      .attr("x", width / 2)
      .attr("y", height + 40)
      .attr("text-anchor", "middle")
      .text("Year");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -45)
      .attr("x", -height / 2)
      .attr("text-anchor", "middle")
      .text("VPI Index (Base 2015 = 100)");

  }, [userData, selectedYear, showAverage, activeCategories]);

  useEffect(() => {
    if (!costChartRef.current) return;

    const svg = d3.select(costChartRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 60, right: 250, bottom: 40, left: 100 };
    const width = 900 - margin.left - margin.right;
    const height = 550 - margin.top - margin.bottom;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const yearData = chartData.vpi.find(v => v.year === selectedYear) || chartData.vpi[0];
    const keys = Object.keys(chartData.cost_distribution);
    const vpiKeys: Record<string, string> = {
      housing: '04 WOHNUNG, WASSER, STROM, GAS UND ANDERE BRENNSTOFFE',
      food: '01 NAHRUNGSMITTEL UND ALKOHOLFREIE GETRÄNKE',
      transport: '07 VERKEHR',
      energy: '04 WOHNUNG, WASSER, STROM, GAS UND ANDERE BRENNSTOFFE',
      other: '13 ANDERE WAREN UND DIENSTLEISTUNGEN'
    };

    const adjustedDistribution = keys.map(key => {
      const vpiKey = vpiKeys[key];
      const factor = vpiKey ? yearData[vpiKey] / 100 : 1;
      return {
        category: key,
        value: chartData.cost_distribution[key] * factor
      };
    });

    const totalRaw = d3.sum(adjustedDistribution, d => d.value);
    const normalized = adjustedDistribution.map(d => ({
      ...d,
      euro: (d.value / totalRaw) * userData.salary,
      percentage: (d.value / totalRaw) * 100
    }));

    const y = d3.scaleLinear()
      .domain([0, userData.salary])
      .range([height, 0]);

    const color = d3.scaleOrdinal<string, string>()
      .domain(keys)
      .range(['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6']);

    let currentY = 0;
    const barWidth = width * 0.8;

    normalized.forEach(d => {
      const barHeight = height - y(d.euro);

      g.append('rect')
        .attr('x', (width - barWidth) / 2)
        .attr('y', y(currentY + d.euro))
        .attr('width', barWidth)
        .attr('height', barHeight)
        .attr('fill', color(d.category) as string)
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .style('opacity', 0.9);

      if (barHeight > 20) {
        g.append('text')
          .attr('x', width / 2)
          .attr('y', y(currentY + d.euro) + barHeight / 2 + 5)
          .attr('text-anchor', 'middle')
          .attr('fill', 'white')
          .style('font-size', '14px')
          .style('font-weight', 'bold')
          .style('pointer-events', 'none')
          .text(`${d.percentage.toFixed(0)}%`);
      }

      currentY += d.euro;
    });

    const legend = g.append('g')
      .attr('transform', `translate(${width + 40}, 0)`);

    normalized.forEach((d, i) => {
      const lg = legend.append('g')
        .attr('transform', `translate(0, ${i * 35})`);

      lg.append('rect')
        .attr('width', 20)
        .attr('height', 20)
        .attr('rx', 4)
        .attr('fill', color(d.category) as string);

      lg.append('text')
        .attr('x', 30)
        .attr('y', 15)
        .text(`${d.category.charAt(0).toUpperCase() + d.category.slice(1)}`)
        .style('font-size', '14px')
        .style('font-weight', '500');

      lg.append('text')
        .attr('x', 30)
        .attr('y', 30)
        .text(`€${d.euro.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`)
        .style('font-size', '12px')
        .style('fill', '#666');
    });

    if (showAverage) {
      const avgSalary = 2800;
      g.append('line')
        .attr('x1', (width - barWidth) / 2 - 20)
        .attr('x2', (width + barWidth) / 2 + 20)
        .attr('y1', y(avgSalary))
        .attr('y2', y(avgSalary))
        .attr('stroke', '#000')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5');

      g.append('text')
        .attr('x', (width - barWidth) / 2 - 25)
        .attr('y', y(avgSalary) + 5)
        .attr('text-anchor', 'end')
        .text('Austria Avg. Gross Salary')
        .style('font-size', '12px')
        .style('font-weight', '600');
    }

    g.append('g')
      .call(d3.axisLeft(y).ticks(10).tickFormat(d => `€${d.toLocaleString()}`));

  }, [userData, selectedYear, showAverage]);

  return (
    <motion.div 
      className="view-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <h2>Inflation Trends Comparison</h2>
      <p>Compare how different cost categories have evolved relative to each other. The dashed line shows the mean value across the currently active categories over time.</p>
      
      <SharedControls />

      <div className="card" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1rem' }}>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategories(prev => 
              prev.includes(cat.id) ? prev.filter(c => c !== cat.id) : [...prev, cat.id]
            )}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              border: `2px solid ${cat.color}`,
              background: activeCategories.includes(cat.id) ? cat.color : 'transparent',
              color: activeCategories.includes(cat.id) ? 'white' : cat.color,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="chart-container">
          <svg ref={chartRef} width="100%" height="400" viewBox="0 0 800 400"></svg>
        </div>
      </div>

      <h2>Monthly Expense Breakdown</h2>
      <p>Estimated distribution of your €{userData.salary.toLocaleString()} monthly salary in {selectedYear}.</p>

      <div className="card" style={{ display: 'flex', justifyContent: 'center' }}>
        <svg ref={costChartRef} width="100%" height="550" viewBox="0 0 900 550"></svg>
      </div>
    </motion.div>
  );
};

export default PersonalOverviewView;
