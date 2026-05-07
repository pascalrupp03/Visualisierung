/**
 * Density histogram using d3.
 * Shows the distribution of voxel values for the loaded dataset.
 * Recalculates and animates when a new file is loaded.
 */
class Histogram {
    constructor(containerSelector) {
        this.container = containerSelector;

        // dimensions
        this.margin = { top: 20, right: 20, bottom: 40, left: 50 };
        this.width = 400 - this.margin.left - this.margin.right;
        this.height = 300 - this.margin.top - this.margin.bottom;

        // svg setup
        this.svg = d3.select(this.container)
            .append("svg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        // x: density [0,1], y: frequency (sqrt scale so small bins are readable)
        this.xScale = d3.scaleLinear()
            .domain([0, 1])
            .range([0, this.width]);

        this.yScale = d3.scaleSqrt()
            .range([this.height, 0]);

        // X axis
        this.svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${this.height})`)
            .call(d3.axisBottom(this.xScale).ticks(10));

        // X axis label
        this.svg.append("text")
            .attr("class", "x-label")
            .attr("x", this.width / 2)
            .attr("y", this.height + this.margin.bottom - 5)
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .text("density");

        // Y axis group (updated with data)
        this.svg.append("g")
            .attr("class", "y-axis");

        // Y axis label
        this.svg.append("text")
            .attr("class", "y-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -this.height / 2)
            .attr("y", -this.margin.left + 12)
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .text("frequency");

        // Bars group
        this.svg.append("g")
            .attr("class", "bars");
    }

    /**
     * (Re)compute histogram bins and update the bars.
     * Called whenever a new volume is loaded.
     */
    update(volume) {
        // 150 bins is a good middle ground: smoother than 50/100, but less noisy than 200
        const binGenerator = d3.bin()
            .domain([0, 1])
            .thresholds(150);

        const bins = binGenerator(volume.voxels);

        // ignore first bin for Y scale (usually huge background count)
        const maxCount = d3.max(bins.slice(1), d => d.length);
        this.yScale.domain([0, maxCount]);

        // Update Y axis with transition
        this.svg.select(".y-axis")
            .transition()
            .duration(750)
            .call(d3.axisLeft(this.yScale).ticks(5));

        // Data join for bars
        const bars = this.svg.select(".bars")
            .selectAll("rect")
            .data(bins);

        // Enter + Update using .join() (d3 v6+ pattern)
        bars.join(
            enter => enter.append("rect")
                .attr("x", d => this.xScale(d.x0) + 1)
                .attr("y", this.height)
                .attr("width", d => Math.max(0, this.xScale(d.x1) - this.xScale(d.x0) - 1))
                .attr("height", 0)
                .attr("fill", "steelblue")
                .call(enter => enter.transition()
                    .duration(750)
                    .attr("y", d => this.yScale(d.length))
                    .attr("height", d => this.height - this.yScale(d.length))
                ),
            update => update
                .call(update => update.transition()
                    .duration(750)
                    .attr("x", d => this.xScale(d.x0) + 1)
                    .attr("width", d => Math.max(0, this.xScale(d.x1) - this.xScale(d.x0) - 1))
                    .attr("y", d => this.yScale(d.length))
                    .attr("height", d => this.height - this.yScale(d.length))
                ),
            exit => exit
                .call(exit => exit.transition()
                    .duration(750)
                    .attr("y", this.height)
                    .attr("height", 0)
                    .remove()
                )
        );
    }
}
