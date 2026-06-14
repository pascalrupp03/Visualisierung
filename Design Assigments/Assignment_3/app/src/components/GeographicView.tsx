import { useEffect, useRef, useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { motion } from 'framer-motion';
import * as d3 from 'd3';
import data from '../data/data.json';
import viennaGeo from '../data/vienna_districts.json';
import SharedControls from './SharedControls';
import type { AppData, DistrictFeature, DistrictFeatureCollection } from '../types/data';

const chartData = data as unknown as AppData;
const districtGeo = viennaGeo as unknown as DistrictFeatureCollection;

const GeographicView = () => {
  const { userData, selectedYear } = useAppState();
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number, y: number, content: string } | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 600;

    const projection = d3.geoMercator()
      .fitSize([width, height], districtGeo);

    const path = d3.geoPath().projection(projection);

    const yearData = chartData.vpi.find(v => v.year === selectedYear) || chartData.vpi[chartData.vpi.length - 1];
    const inflationFactor = yearData["04 WOHNUNG, WASSER, STROM, GAS UND ANDERE BRENNSTOFFE"] / 100;

    const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
      .domain([10, 25]);

    const g = svg.append("g");
    const districtFeatures = districtGeo.features;

    g.selectAll<SVGPathElement, DistrictFeature>("path")
      .data(districtFeatures)
      .enter()
      .append("path")
      .attr("d", feature => path(feature) ?? "")
      .attr("fill", (feature) => {
        const districtName = feature.properties.name;
        const district = chartData.vienna_districts.find(vd => vd.name === districtName);
        if (!district) return "#ccc";
        return colorScale(district.avg_rent_m2 * inflationFactor);
      })
      .attr("stroke", "white")
      .attr("stroke-width", 1)
      .on("mousemove", (event: MouseEvent, feature) => {
        const districtName = feature.properties.name;
        const district = chartData.vienna_districts.find(vd => vd.name === districtName);
        if (!district) return;

        const currentRent = district.avg_rent_m2 * inflationFactor;
        const cost = currentRent * userData.apartmentSize;
        const percentage = (cost / userData.salary) * 100;

        setTooltip({
          x: event.pageX,
          y: event.pageY - 20,
          content: `${districtName}: €${currentRent.toFixed(2)}/m² (${percentage.toFixed(0)}% of income for ${userData.apartmentSize}m²)`
        });
      })
      .on("mouseleave", () => setTooltip(null));

    // Add labels
    g.selectAll<SVGTextElement, DistrictFeature>("text")
      .data(districtFeatures)
      .enter()
      .append("text")
      .attr("transform", feature => `translate(${path.centroid(feature)})`)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "black")
      .attr("pointer-events", "none")
      .text(feature => {
        const district = chartData.vienna_districts.find(vd => vd.name === feature.properties.name);
        return district ? district.id : "";
      });

  }, [userData, selectedYear]);

  return (
    <motion.div 
      className="view-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <h2>Vienna Heatmap ({selectedYear})</h2>
      <p>Interactive Map: Hover to see details for each district.</p>

      <SharedControls showMeanToggle={false} />

      <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
        <svg ref={svgRef} width="100%" height="600" viewBox="0 0 800 600"></svg>
        
        {tooltip && (
          <div style={{
            position: 'fixed',
            left: tooltip.x + 10,
            top: tooltip.y - 10,
            background: 'white',
            padding: '5px 10px',
            borderRadius: '5px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            pointerEvents: 'none',
            zIndex: 1000,
            fontSize: '0.9rem'
          }}>
            {tooltip.content}
          </div>
        )}

        <div style={{ position: 'absolute', bottom: '20px', right: '20px', width: '280px' }}>
          <div style={{ marginBottom: '8px', fontSize: '0.8rem', fontWeight: 700, textAlign: 'center' }}>
            Average Rent per m² (District Level)
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.75rem', fontWeight: 600 }}>
            <span>Lower Rent (€10)</span>
            <span>Higher Rent (€25+)</span>
          </div>
          <div style={{ 
            height: '12px', 
            width: '100%', 
            background: 'linear-gradient(to right, #ffffd4, #fed976, #feb24c, #fd8d3c, #fc4e2a, #e31a1c, #b10026)',
            borderRadius: '6px',
            border: '1px solid rgba(0,0,0,0.1)'
          }} />
          <div style={{ marginTop: '5px', fontSize: '0.65rem', color: '#666', fontStyle: 'italic' }}>
            Colors range from lightest (cheapest) to darkest (most expensive).
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default GeographicView;
