// Density histogram (d3) - shows voxel intensity distribution.
// Redraws with animation when a new volume is loaded.

class Histogram {
    constructor(containerSelector) {
        this.container = containerSelector;

        this.margin = { top: 20, right: 20, bottom: 40, left: 50 };
        this.width = 400 - this.margin.left - this.margin.right;
        this.height = 300 - this.margin.top - this.margin.bottom;

        this.svg = d3.select(this.container)
            .append("svg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        // x = density [0,1], y = frequency (sqrt so small bins are still visible)
        this.xScale = d3.scaleLinear().domain([0, 1]).range([0, this.width]);
        this.yScale = d3.scaleSqrt().range([this.height, 0]); // sqrt makes low-count bins readable

        // axes
        this.svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${this.height})`)
            .call(d3.axisBottom(this.xScale).ticks(10));

        this.svg.append("text")
            .attr("x", this.width / 2).attr("y", this.height + this.margin.bottom - 5)
            .attr("text-anchor", "middle").attr("fill", "white")
            .text("density");

        this.svg.append("g").attr("class", "y-axis");

        this.svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -this.height / 2).attr("y", -this.margin.left + 12)
            .attr("text-anchor", "middle").attr("fill", "white")
            .text("frequency");

        this.svg.append("g").attr("class", "bars");
    }

    // recompute bins and redraw bars (called on new volume load)
    update(volume) {
        const bins = d3.bin().domain([0, 1]).thresholds(150)(volume.voxels);

        // skip first bin for y-domain (background/air dominates otherwise)
        const maxCount = d3.max(bins.slice(1), d => d.length);
        // const maxCount = d3.max(bins, d => d.length); // For all 
        this.yScale.domain([0, maxCount]);

        this.svg.select(".y-axis")
            .transition().duration(750)
            .call(d3.axisLeft(this.yScale).ticks(5));

        const bars = this.svg.select(".bars").selectAll("rect").data(bins);

        bars.join(
            enter => enter.append("rect")
                .attr("x", d => this.xScale(d.x0) + 1)
                .attr("y", this.height)
                .attr("width", d => Math.max(0, this.xScale(d.x1) - this.xScale(d.x0) - 1))
                .attr("height", 0)
                .attr("fill", "steelblue")
                .call(enter => enter.transition().duration(750)
                    .attr("y", d => this.yScale(d.length))
                    .attr("height", d => this.height - this.yScale(d.length))
                ),
            update => update.call(update => update.transition().duration(750)
                .attr("x", d => this.xScale(d.x0) + 1)
                .attr("width", d => Math.max(0, this.xScale(d.x1) - this.xScale(d.x0) - 1))
                .attr("y", d => this.yScale(d.length))
                .attr("height", d => this.height - this.yScale(d.length))
            ),
            exit => exit.call(exit => exit.transition().duration(750)
                .attr("y", this.height).attr("height", 0).remove()
            )
        );
    }
}
