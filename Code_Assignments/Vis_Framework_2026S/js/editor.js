// Editor: UI controls for iso-value, color, mode, opacity.
// Uses d3 for DOM manipulation and drag interaction.

class Editor {
    constructor(containerSelector, onIsoValueChange, onColorChange, onModeChange, onAlphaChange) {
        this.container = containerSelector;
        this.onIsoValueChange = onIsoValueChange;
        this.onColorChange = onColorChange;
        this.onModeChange = onModeChange;
        this.onAlphaChange = onAlphaChange;

        this.isoValue = 0.3;
        this.currentColor = { r: 1.0, g: 1.0, b: 1.0 };
        this.currentMode = 1; // 0=MIP, 1=First-Hit
        this.currentAlpha = 1.0;

        this._buildModeSelector();
        this._buildAlphaSlider();
        this._buildColorPicker();
    }

    setHistogram(histogram) {
        this.histogram = histogram;
        this._drawIsoLine();
    }

    // mode dropdown (MIP / First-Hit)
    _buildModeSelector() {
        const div = d3.select(this.container)
            .append("div")
            .attr("class", "editor-section");

        div.append("label").text("Compositing Mode: ");

        const select = div.append("select")
            .attr("id", "editorModeSelect");

        select.append("option").attr("value", "0").text("MIP");
        select.append("option").attr("value", "1").attr("selected", true).text("First-Hit");

        select.on("change", (event) => {
            this.currentMode = parseInt(event.target.value);
            this.onModeChange(this.currentMode);
        });
    }

    // opacity slider [0..1]
    _buildAlphaSlider() {
        const div = d3.select(this.container)
            .append("div")
            .attr("class", "editor-section");

        div.append("label").text("Opacity: ");

        const valueLabel = div.append("span")
            .attr("id", "editorAlphaValue")
            .text("1.00");

        const self = this;
        div.append("input")
            .attr("type", "range")
            .attr("id", "editorAlphaSlider")
            .attr("min", "0").attr("max", "1").attr("step", "0.01")
            .attr("value", "1")
            .style("width", "100%")
            .on("input", function() {
                self.currentAlpha = parseFloat(this.value);
                valueLabel.text(self.currentAlpha.toFixed(2));
                self.onAlphaChange(self.currentAlpha);
            });
    }

    // 20 color swatches: 18 evenly spaced hues + white + gray
    _buildColorPicker() {
        const div = d3.select(this.container)
            .append("div")
            .attr("class", "editor-section color-picker");

        div.append("label").text("Surface Color:");

        const colors = [];
        for (let i = 0; i < 18; i++) {
            colors.push(d3.hsl((i / 18) * 360, 1, 0.5));
        }
        colors.push(d3.rgb(255, 255, 255));
        colors.push(d3.rgb(180, 180, 180));

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
                d3.select(this).style("border", "2px solid white");

                const rgb = d3.rgb(d);
                self.currentColor = { r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255 };
                self.onColorChange(self.currentColor.r, self.currentColor.g, self.currentColor.b);
            });

        // white selected by default
        swatchContainer.selectAll("div.swatch")
            .filter((d, i) => i === 18)
            .style("border", "2px solid white");
    }

    // draggable iso-value line on the histogram
    _drawIsoLine() {
        if (!this.histogram) return;

        const svg = this.histogram.svg;
        const xScale = this.histogram.xScale;
        const height = this.histogram.height;
        const self = this;

        const isoGroup = svg.append("g")
            .attr("class", "iso-indicator");

        // dashed vertical line
        isoGroup.append("line")
            .attr("class", "iso-line")
            .attr("x1", xScale(this.isoValue))
            .attr("x2", xScale(this.isoValue))
            .attr("y1", 0).attr("y2", height)
            .attr("stroke", "white")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "4,2");

        // drag handle
        isoGroup.append("circle")
            .attr("class", "iso-handle")
            .attr("cx", xScale(this.isoValue))
            .attr("cy", 0).attr("r", 8)
            .attr("fill", "white")
            .attr("stroke", "gray")
            .attr("stroke-width", 1)
            .style("cursor", "ew-resize");

        // value label above the handle
        isoGroup.append("text")
            .attr("class", "iso-label")
            .attr("x", xScale(this.isoValue))
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .attr("font-size", "11px")
            .text(this.isoValue.toFixed(2));

        // d3 drag
        const drag = d3.drag()
            .on("drag", function(event) {
                const x = Math.max(0, Math.min(event.x, xScale.range()[1]));
                const newIso = xScale.invert(x);
                self.isoValue = newIso;

                isoGroup.select(".iso-line").attr("x1", x).attr("x2", x);
                isoGroup.select(".iso-handle").attr("cx", x);
                isoGroup.select(".iso-label").attr("x", x).text(newIso.toFixed(2));

                self.onIsoValueChange(newIso);
            });

        isoGroup.call(drag);
        isoGroup.style("cursor", "ew-resize");
    }

    // external update of the iso-line position
    updateIsoLine(value) {
        if (!this.histogram) return;
        this.isoValue = value;
        const x = this.histogram.xScale(value);

        const svg = this.histogram.svg;
        svg.select(".iso-line").attr("x1", x).attr("x2", x);
        svg.select(".iso-handle").attr("cx", x);
        svg.select(".iso-label").attr("x", x).text(value.toFixed(2));
    }
}
