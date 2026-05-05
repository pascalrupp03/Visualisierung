class Histogram {
    constructor(containerId) {
        console.log("[Histogram] Initializing for container:", containerId);

        this.margin = { top: 30, right: 30, bottom: 50, left: 60 };
        this.W = 400;
        this.H = 300;
        this.w = this.W - this.margin.left - this.margin.right;
        this.h = this.H - this.margin.top - this.margin.bottom;

        this.onIsoChange = null;
        this.currentIsoValue = 0.3;

        const container = document.getElementById(containerId);
        if (!container) {
            console.error("[Histogram] Container not found:", containerId);
            return;
        }

        // Ensure container has visibility and size
        container.style.display = "block";
        container.style.minWidth = "300px";
        container.style.minHeight = "300px";

        // Remove any existing SVG
        d3.select(container).selectAll("svg").remove();

        this.svg = d3.select(container)
            .append("svg")
            .attr("viewBox", `0 0 ${this.W} ${this.H}`)
            .attr("width", "100%")
            .attr("height", "100%")
            .style("display", "block");

        this.g = this.svg.append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        this.xScale = d3.scaleLinear().domain([0, 1]).range([0, this.w]);
        this.yScale = d3.scaleLinear().domain([0, 1]).range([this.h, 0]);

        // Axes
        this.xAxisG = this.g.append("g")
            .attr("class", "hist-axis hist-axis-x")
            .attr("transform", `translate(0,${this.h})`);

        this.yAxisG = this.g.append("g")
            .attr("class", "hist-axis hist-axis-y");

        this.xAxisG.call(d3.axisBottom(this.xScale).ticks(5));
        this.yAxisG.call(d3.axisLeft(this.yScale).ticks(5));

        // Axis Labels
        this.g.append("text")
            .attr("x", this.w)
            .attr("y", this.h + 40)
            .attr("text-anchor", "end")
            .attr("font-size", "12px")
            .attr("fill", "#8fa1bc")
            .text("density");

        this.g.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", 0)
            .attr("y", -45)
            .attr("text-anchor", "end")
            .attr("font-size", "12px")
            .attr("fill", "#8fa1bc")
            .text("intensity");

        // Area Path
        this.histPath = this.g.append("path")
            .attr("class", "hist-area")
            .attr("fill", "rgba(90, 160, 255, 0.3)")
            .attr("stroke", "#5aa0ff")
            .attr("stroke-width", 1.5);

        // Iso Indicator
        this.isoGroup = this.g.append("g")
            .attr("class", "iso-indicator")
            .style("cursor", "ew-resize");

        this.isoLine = this.isoGroup.append("line")
            .attr("class", "hist-iso-line")
            .attr("stroke", "#ff6b6b")
            .attr("stroke-width", 2)
            .attr("y1", 0)
            .attr("y2", this.h);

        this.isoCircle = this.isoGroup.append("circle")
            .attr("r", 6)
            .attr("fill", "#fff")
            .attr("stroke", "#ff6b6b")
            .attr("stroke-width", 2);

        this.isoLabel = this.isoGroup.append("text")
            .attr("class", "hist-iso-label")
            .attr("text-anchor", "middle")
            .attr("y", -15)
            .attr("fill", "#ff6b6b")
            .style("font-weight", "bold");

        // Interaction
        const self = this;
        const drag = d3.drag()
            .on("drag", function(event) {
                const x = Math.max(0, Math.min(self.w, event.x));
                const val = self.xScale.invert(x);
                self.setIsoValue(val);
                if (self.onIsoChange) self.onIsoChange(val);
            });

        this.isoGroup.call(drag);

        this.svg.on("click", function(event) {
            if (event.defaultPrevented) return;
            const [mx, my] = d3.pointer(event, self.g.node());
            if (mx >= 0 && mx <= self.w) {
                const val = self.xScale.invert(mx);
                self.setIsoValue(val);
                if (self.onIsoChange) self.onIsoChange(val);
            }
        });

        this.setIsoValue(this.currentIsoValue);
    }

    update(voxelData, numBins = 128) {
        console.log("[Histogram] Updating with", voxelData ? voxelData.length : 0, "voxels");
        if (!voxelData || voxelData.length === 0) return;

        const bins = new Float32Array(numBins);
        for (let i = 0; i < voxelData.length; i++) {
            const val = voxelData[i];
            const binIdx = Math.min(numBins - 1, Math.floor(val * numBins));
            bins[binIdx]++;
        }

        const maxCount = d3.max(bins) || 1;
        const binnedData = Array.from(bins).map((count, i) => ({
            x: i / (numBins - 1),
            y: count / maxCount
        }));

        const area = d3.area()
            .x(d => this.xScale(d.x))
            .y0(this.h)
            .y1(d => this.h - (this.h * d.y))
            .curve(d3.curveMonotoneX);

        this.histPath
            .transition().duration(800)
            .attr("d", area(binnedData));
    }

    setIsoValue(v) {
        this.currentIsoValue = Math.max(0, Math.min(1, v));
        const x = this.xScale(this.currentIsoValue);
        this.isoGroup.attr("transform", `translate(${x}, 0)`);
        this.isoLabel.text(`Iso: ${this.currentIsoValue.toFixed(2)}`);
    }

    setIsoChangeHandler(callback) {
        this.onIsoChange = callback;
    }
}
