import { useEffect, useRef } from 'react';
import { useAppState } from '../hooks/useAppState';
import { motion } from 'framer-motion';
import * as d3 from 'd3';
import data from '../data/data.json';
import SharedControls from './SharedControls';

const CostOfLivingView = () => {
  const { userData, selectedYear, showAverage } = useAppState();
  const chartRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const svg = d3.select(chartRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 60, right: 250, bottom: 40, left: 100 };
    const width = 900 - margin.left - margin.right;
    const height = 550 - margin.top - margin.bottom;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const yearData = data.vpi.find(v => v.year === selectedYear) || data.vpi[0];
    
    const keys = Object.keys(data.cost_distribution);
    const vpiKeys: Record<string, string> = {
      "housing": "04 WOHNUNG, WASSER, STROM, GAS UND ANDERE BRENNSTOFFE",
      "food": "01 NAHRUNGSMITTEL UND ALKOHOLFREIE GETRÄNKE",
      "transport": "07 VERKEHR",
      "energy": "04 WOHNUNG, WASSER, STROM, GAS UND ANDERE BRENNSTOFFE",
      "other": "13 ANDERE WAREN UND DIENSTLEISTUNGEN"
    };

    const yearVpi = yearData as Record<string, number>;
    const costDistribution = data.cost_distribution as Record<string, number>;

    const adjustedDistribution = keys.map(key => {
      const vpiKey = vpiKeys[key];
      const factor = vpiKey ? yearVpi[vpiKey] / 100 : 1;
      return {
        category: key,
        value: costDistribution[key] * factor
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

    const color = d3.scaleOrdinal()
      .domain(keys)
      .range(["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"]);

    // Stack
    let currentY = 0;
    const barWidth = width * 0.8;
    normalized.forEach((d) => {
      const barHeight = height - y(d.euro);
      
      g.append("rect")
        .attr("x", (width - barWidth) / 2)
        .attr("y", y(currentY + d.euro))
        .attr("width", barWidth)
        .attr("height", barHeight)
        .attr("fill", color(d.category) as string)
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .style("opacity", 0.9);

      // Label inside bar if big enough
      if (barHeight > 20) {
        g.append("text")
          .attr("x", width / 2)
          .attr("y", y(currentY + d.euro) + barHeight / 2 + 5)
          .attr("text-anchor", "middle")
          .attr("fill", "white")
          .style("font-size", "14px")
          .style("font-weight", "bold")
          .style("pointer-events", "none")
          .text(`${d.percentage.toFixed(0)}%`);
      }

      currentY += d.euro;
    });

    // Legend
    const legend = g.append("g")
      .attr("transform", `translate(${width + 40}, 0)`);

    normalized.forEach((d, i) => {
      const lg = legend.append("g")
        .attr("transform", `translate(0, ${i * 35})`);
      
      lg.append("rect")
        .attr("width", 20)
        .attr("height", 20)
        .attr("rx", 4)
        .attr("fill", color(d.category) as string);
      
      lg.append("text")
        .attr("x", 30)
        .attr("y", 15)
        .text(`${d.category.charAt(0).toUpperCase() + d.category.slice(1)}`)
        .style("font-size", "14px")
        .style("font-weight", "500");

      lg.append("text")
        .attr("x", 30)
        .attr("y", 30)
        .text(`€${d.euro.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`)
        .style("font-size", "12px")
        .style("fill", "#666");
    });

    // AT Average if toggled
    if (showAverage) {
      const avgSalary = 2800;
      g.append("line")
        .attr("x1", (width - barWidth) / 2 - 20)
        .attr("x2", (width + barWidth) / 2 + 20)
        .attr("y1", y(avgSalary))
        .attr("y2", y(avgSalary))
        .attr("stroke", "#000")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");

      g.append("text")
        .attr("x", (width - barWidth) / 2 - 25)
        .attr("y", y(avgSalary) + 5)
        .attr("text-anchor", "end")
        .text("AT Avg. Gross")
        .style("font-size", "12px")
        .style("font-weight", "600");
    }

    g.append("g")
      .call(d3.axisLeft(y).ticks(10).tickFormat(d => `€${d.toLocaleString()}`));

  }, [userData, selectedYear, showAverage]);

  return (
    <motion.div 
      className="view-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <h2>Monthly Expense Breakdown</h2>
      <p>Estimated distribution of your €{userData.salary.toLocaleString()} monthly salary in {selectedYear}.</p>

      <SharedControls />

      <div className="card" style={{ display: 'flex', justifyContent: 'center' }}>
        <svg ref={chartRef} width="100%" height="550" viewBox="0 0 900 550"></svg>
      </div>
    </motion.div>
  );
};

export default CostOfLivingView;
