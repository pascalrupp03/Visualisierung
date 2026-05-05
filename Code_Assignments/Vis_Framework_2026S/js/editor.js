/**
 * Vis 1 Task 5 - Interactive Editor
 *
 * Provides interactive controls for iso-value and surface color using d3.js.
 * Features:
 * - Draggable iso-value indicator coupled with the density histogram
 * - Color picker with 20 systematically selectable colors (HSL + white)
 * - Mode selector for MIP / First-Hit
 *
 * Uses d3-selection event handling (d3 v6+ API) and d3-color.
 */
class Editor {
    constructor(containerSelector, onIsoValueChange, onColorChange, onModeChange) {
        this.container = containerSelector;
        this.onIsoValueChange = onIsoValueChange;
        this.onColorChange = onColorChange;
        this.onModeChange = onModeChange;

        this.isoValue = 0.3;

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
     * Build mode selector (MIP / First-Hit) using d3.
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
            const mode = parseInt(event.target.value);
            this.onModeChange(mode);
        });
    }

    /**
     * Build color picker with 20 systematically chosen colors using d3-color.
     * 18 hues evenly spaced in HSL + white + black = 20 colors.
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
                // Remove highlight from all swatches
                swatchContainer.selectAll("div.swatch")
                    .style("border", "2px solid transparent");
                // Highlight selected
                d3.select(this)
                    .style("border", "2px solid white");
                // Convert to RGB [0,1] and notify
                const rgb = d3.rgb(d);
                self.onColorChange(rgb.r / 255, rgb.g / 255, rgb.b / 255);
            });

        // Select white by default (second to last)
        swatchContainer.selectAll("div.swatch")
            .filter((d, i) => i === 18)
            .style("border", "2px solid white");
    }

    /**
     * Draw the iso-value indicator line on the histogram.
     * Adds a draggable vertical line and circle that updates the iso-value.
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
     * Update the iso-value indicator position (e.g., when set externally).
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
