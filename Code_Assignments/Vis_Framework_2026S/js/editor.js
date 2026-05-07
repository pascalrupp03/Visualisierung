/**
 * Interactive editor for controlling the volume renderer.
 * Lets the user pick iso-value (by dragging on the histogram),
 * surface color (from a palette of 20 colors), and compositing mode.
 * Built entirely with d3.js (v7 event API).
 */
class Editor {
    constructor(containerSelector, onIsoValueChange, onColorChange, onModeChange) {
        this.container = containerSelector;
        this.onIsoValueChange = onIsoValueChange;
        this.onColorChange = onColorChange;
        this.onModeChange = onModeChange;

        this.isoValue = 0.3;
        // remember current color so we can re-apply it when dataset changes
        this.currentColor = { r: 1.0, g: 1.0, b: 1.0 };
        this.currentMode = 1; // First-Hit

        this._buildModeSelector();
        this._buildColorPicker();
    }

    /**
     * Set reference to histogram so we can draw the iso-line on it.
     */
    setHistogram(histogram) {
        this.histogram = histogram;
        this._drawIsoLine();
    }

    /**
     * Compositing mode dropdown.
     */
    _buildModeSelector() {
        const div = d3.select(this.container)
            .append("div")
            .attr("class", "editor-section");

        div.append("label")
            .text("Compositing Mode: ");

        const select = div.append("select")
            .attr("id", "editorModeSelect");

        select.append("option").attr("value", "0").text("MIP");
        select.append("option").attr("value", "1").attr("selected", true).text("First-Hit");

        select.on("change", (event) => {
            this.currentMode = parseInt(event.target.value);
            this.onModeChange(this.currentMode);
        });
    }

    /**
     * Color palette with 20 systematically chosen colors.
     * 18 hues evenly spaced + white + gray.
     */
    _buildColorPicker() {
        const div = d3.select(this.container)
            .append("div")
            .attr("class", "editor-section color-picker");

        div.append("label")
            .text("Surface Color:");

        // Generate 20 colors: 18 hues (HSL, s=100%, l=50%) + white + light gray
        const colors = [];
        for (let i = 0; i < 18; i++) {
            const hue = (i / 18) * 360;
            colors.push(d3.hsl(hue, 1, 0.5));
        }
        colors.push(d3.rgb(255, 255, 255)); // white
        colors.push(d3.rgb(180, 180, 180)); // light gray

        const swatchContainer = div.append("div")
            .attr("class", "swatch-container");

        const self = this;
        swatchContainer.selectAll("div.swatch")
            .data(colors)
            .join("div")
            .attr("class", "swatch")
            .style("background-color", d => d.formatRgb())
            .style("width", "22px")
            .style("height", "22px")
            .style("display", "inline-block")
            .style("margin", "2px")
            .style("cursor", "pointer")
            .style("border", "2px solid transparent")
            .style("border-radius", "3px")
            .on("click", function(event, d) {
                swatchContainer.selectAll("div.swatch")
                    .style("border", "2px solid transparent");
                d3.select(this)
                    .style("border", "2px solid white");
                const rgb = d3.rgb(d);
                self.currentColor = { r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255 };
                self.onColorChange(self.currentColor.r, self.currentColor.g, self.currentColor.b);
            });

        // Select white by default (second to last)
        swatchContainer.selectAll("div.swatch")
            .filter((d, i) => i === 18)
            .style("border", "2px solid white");
    }

    /**
     * Draws a draggable iso-value indicator (line + handle) on the histogram.
     * Dragging it left/right changes the iso-value in real-time.
     */
    _drawIsoLine() {
        if (!this.histogram) return;

        const svg = this.histogram.svg;
        const xScale = this.histogram.xScale;
        const height = this.histogram.height;
        const self = this;

        // Iso-value line group
        const isoGroup = svg.append("g")
            .attr("class", "iso-indicator");

        // Vertical line
        isoGroup.append("line")
            .attr("class", "iso-line")
            .attr("x1", xScale(this.isoValue))
            .attr("x2", xScale(this.isoValue))
            .attr("y1", 0)
            .attr("y2", height)
            .attr("stroke", "white")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "4,2");

        // Draggable circle handle at the top
        isoGroup.append("circle")
            .attr("class", "iso-handle")
            .attr("cx", xScale(this.isoValue))
            .attr("cy", 0)
            .attr("r", 8)
            .attr("fill", "white")
            .attr("stroke", "gray")
            .attr("stroke-width", 1)
            .style("cursor", "ew-resize");

        // Iso-value label
        isoGroup.append("text")
            .attr("class", "iso-label")
            .attr("x", xScale(this.isoValue))
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .attr("font-size", "11px")
            .text(this.isoValue.toFixed(2));

        // Drag behavior using d3.drag() (d3 v6+ event API)
        const drag = d3.drag()
            .on("drag", function(event) {
                // Clamp x position to histogram width
                const x = Math.max(0, Math.min(event.x, xScale.range()[1]));
                const newIso = xScale.invert(x);

                self.isoValue = newIso;

                // Update visual position
                isoGroup.select(".iso-line")
                    .attr("x1", x)
                    .attr("x2", x);
                isoGroup.select(".iso-handle")
                    .attr("cx", x);
                isoGroup.select(".iso-label")
                    .attr("x", x)
                    .text(newIso.toFixed(2));

                // Notify callback
                self.onIsoValueChange(newIso);
            });

        // Apply drag to the line and handle (larger hit area)
        isoGroup.call(drag);
        isoGroup.style("cursor", "ew-resize");
    }

    /**
     * Move the iso-line to a given value (used for external sync).
     */
    updateIsoLine(value) {
        if (!this.histogram) return;
        this.isoValue = value;
        const xScale = this.histogram.xScale;
        const x = xScale(value);

        const svg = this.histogram.svg;
        svg.select(".iso-line").attr("x1", x).attr("x2", x);
        svg.select(".iso-handle").attr("cx", x);
        svg.select(".iso-label").attr("x", x).text(value.toFixed(2));
    }
}
