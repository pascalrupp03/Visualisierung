# 4. Interactive Editor (js/editor.js)

## What This Does

The editor provides **real-time interactive controls** for volume rendering parameters:
1. **Compositing Mode Dropdown**: Switch between MIP and First-Hit rendering (2 options)
2. **Opacity Slider**: Adjust surface transparency [0, 1]
3. **Color Picker**: 20 color swatches to change surface appearance
4. **Iso-Value Indicator**: Draggable vertical line on histogram (set density threshold for First-Hit mode)

All controls are **coupled to live shader updates** via callbacks. Change a slider → shader uniform updates → new frame rendered instantly.

**Built with D3.js** for DOM manipulation, event handling, and drag interaction.

---

## What You Changed vs. Original Framework

**js/editor.js** (NEW FILE):
- ✅ **Created**: Editor class with four interactive control groups
- ✅ **Mode selector** (lines 47–66):
  - Dropdown menu (HTML `<select>`)
  - Options: "MIP" (value 0), "First-Hit" (value 1, selected by default)
  - Callback sends mode to shader
- ✅ **Opacity slider** (lines 68–91):
  - HTML `<input type="range">` with min=0, max=1, step=0.01
  - Real-time label showing current value (e.g., "0.85")
  - Callback sends alpha to shader
- ✅ **Color picker** (lines 93–141):
  - 20 color swatches: 18 HSL hues (evenly spaced 0–360°, full saturation, 50% lightness) + white + gray
  - Click swatch → highlight border, convert RGB, send to shader
  - Default selection: white (index 18)
- ✅ **Iso-value indicator** (lines 143–194):
  - Draggable vertical line on histogram (white dashed line)
  - White circle handle at top for drag
  - Text label showing current iso-value
  - Uses `d3.drag()` with clamping to histogram x-range
  - Two-way binding: drag line → updates editor state + calls callback; external update (from slider) → updates line position
- ✅ **State persistence** (visvu.js lines 101–104):
  - When new volume loads, editor state is re-applied to shader (so you don't lose color/mode/iso-value)

**Integration in visvu.js:**
- ✅ **Added**: Line 28 – `editor` global variable
- ✅ **Added**: Lines 40–55 – Create editor with 4 callbacks:
  1. `onIsoValueChange()` → calls `raycasterShader.setIsoValue(val)`
  2. `onColorChange(r,g,b)` → calls `raycasterShader.setSurfaceColor(r,g,b)`
  3. `onModeChange(mode)` → calls `raycasterShader.setCompositingMode(mode)`
  4. `onAlphaChange(alpha)` → calls `raycasterShader.setAlpha(alpha)`
- ✅ **Added**: Line 58 – Link editor to histogram: `editor.setHistogram(histogram)`
- ✅ **Added**: Lines 101–104 – Restore editor state when new volume loads

**style.css:**
- ✅ **Added**: `.editor-section` (line 20–23) – margin/padding for control blocks
- ✅ **Added**: `.color-picker` (line 25–27) – wraps color swatches
- ✅ **Added**: `.swatch-container` (line 29–32) – flex layout for color grid
- ✅ **Added**: `.iso-indicator` (line 34–35) – cursor style for draggable line

---

## 🔧 Adjustable Settings for Demos/Presentations

### Mode Dropdown Options:
- **Current options**: MIP (0), First-Hit (1), First-Hit selected by default
- **Location**: `editor.js`, lines 56–57
  ```javascript
  select.append("option").attr("value", "0").text("MIP");
  select.append("option").attr("value", "1").attr("selected", true).text("First-Hit");
  ```
- **To change default to MIP**: Remove `.attr("selected", true)` from line 57, add to line 56
- **To add more modes** (requires shader changes too): Add more options here
- **For demo**: First-Hit is good default (shows shaded surfaces, more impressive than MIP)

### Opacity Slider Range & Step:
- **Current**: Range [0, 1], step 0.01
- **Location**: `editor.js`, lines 79–80
  ```javascript
  .attr("min", "0").attr("max", "1").attr("step", "0.01")
  ```
- **To coarser steps** (snappier feel): Change `step` to `0.05` or `0.10`
- **To finer steps** (more precision): Change to `0.001` (rarely needed)
- **Default value** (line 81): `.attr("value", "1")` means starts at full opacity
- **For demo**: Keep 0.01 step size. Opacity is nice to adjust on-the-fly to see interior structures.

### Color Swatches (18 hues + white + gray):
- **Current**: 
  - 18 HSL colors: Hue = `(i / 18) * 360°`, Saturation = 100%, Lightness = 50%
  - White: RGB(255, 255, 255)
  - Gray: RGB(180, 180, 180)
- **Location**: `editor.js`, lines 110–122
  ```javascript
  for (let i = 0; i < 18; i++) {
    colors.push(d3.hsl((i / 18) * 360, 1, 0.5));  // ← Change saturation/lightness here
  }
  colors.push(d3.rgb(255, 255, 255));  // white
  colors.push(d3.rgb(180, 180, 180));  // gray
  ```
- **To add more colors**: Add more loop iterations or more `.push()` calls
- **To adjust existing colors**:
  - Change saturation from 1 to 0.7 (more pastel): `d3.hsl((i / 18) * 360, 0.7, 0.5)`
  - Change lightness from 0.5 to 0.6 (brighter): `d3.hsl((i / 18) * 360, 1, 0.6)`
  - Add specific custom colors: `colors.push(d3.rgb(255, 100, 0))` for orange
- **For demo**: Current 20 colors cover full spectrum nicely. Only add more if you want many similar shades.

### Swatch Visual Appearance:
- **Size**: Currently 22px × 22px (lines 134–135)
  ```javascript
  .style("width", "22px")
  .style("height", "22px")
  ```
  - Increase to 30px for easier clicking on large screens
  - Decrease to 18px if you need to fit more colors per row
- **Spacing**: Currently 2px margin (line 136)
  - Increase to 4px for more breathing room
- **Border on selection**: Currently 2px white border (line 138)
  - Change border color from "white" to "yellow" or "lime" if white swatches are hard to see
- **Cursor**: Currently "pointer" (line 139)
  - Change to "crosshair" or "grab" if you want different feedback
- **For demo**: Current styling is clean. Only adjust swatch size if your projector is small (increase for visibility)

### Iso-Value Indicator Visual Style:
- **Line color**: White (line 160)
  ```javascript
  .attr("stroke", "white")
  ```
  - Change to yellow or lime for high contrast if using light background
- **Line width**: 2px (line 161)
  - Increase to 3px for more visibility
- **Line pattern**: Dashed (`"4,2"`) (line 162)
  - Change to `"8,4"` for longer dashes, or remove dashes entirely: `.attr("stroke-dasharray", null)`
- **Handle (circle) size**: Radius 8px (line 168)
  - Increase to 10px for easier dragging
- **Handle color**: White fill, gray stroke (lines 169–170)
  - Change fill to "yellow" for visibility
- **Label font size**: 11px (line 176)
  - Increase to 14px for readability on small screens
- **Label position**: 10px above handle (line 175: `attr("y", -10)`)
  - Increase to -15 if labels collide with axis ticks
- **For demo**: Current styling is good. Only adjust if iso-line is hard to see on your monitor.

### Iso-Value Dragging Behavior:
- **Current**: Clamps to histogram x-range (line 183)
  ```javascript
  const x = Math.max(0, Math.min(event.x, xScale.range()[1]));
  ```
  - This prevents dragging outside the histogram (good)
- **To allow dragging outside**: Remove the `Math.max`/`Math.min` (not recommended)
- **Snap to grid** (optional enhancement): Add rounding
  ```javascript
  const newIso = Math.round(xScale.invert(x) * 100) / 100;  // snap to 0.01
  ```
- **For demo**: Current behavior is intuitive. No changes needed.

### Default Editor State (when app starts):
- **Location**: `editor.js`, constructor lines 14–17
  ```javascript
  this.isoValue = 0.3;
  this.currentColor = { r: 1.0, g: 1.0, b: 1.0 };
  this.currentMode = 1;    // 0=MIP, 1=First-Hit
  this.currentAlpha = 1.0;
  ```
- **To change**: Edit these lines before release
- **For demo**: 0.3 iso-value and white color is a good starting point (shows some structure without being too aggressive)

---

## Potential Gotchas & Things to Watch

### 🚨 **Color precision loss (RGB to HSL and back)**
- **Problem**: When you select a color swatch, the editor converts D3 HSL → RGB → divide by 255 → send to shader
- **Example**: d3.hsl(120, 1, 0.5) → RGB(0, 255, 128) → divide by 255 → (0, 1, 0.502)
- **Floating-point rounding**: Might not be exactly (0, 1, 0.5) due to rounding
- **Impact**: Negligible for display (1% color error invisible to human eye)
- **Watch**: If shader output color looks slightly different from swatch, this is why. Not a bug.

### 🚨 **Swatch border selection visual glitch**
- **Problem**: Line 127 applies white border to selected swatch. If you click a white swatch, the border blends in and it's hard to see selection
- **Current code** (line 127):
  ```javascript
  d3.select(this).style("border", "2px solid white");
  ```
- **Fix**: Use a different border color for white swatch
  ```javascript
  // Before the click handler, detect white swatch and use yellow border:
  if (d.r === 255 && d.g === 255 && d.b === 255) {
    d3.select(this).style("border", "2px solid yellow");
  } else {
    d3.select(this).style("border", "2px solid white");
  }
  ```
- **Watch during demo**: White swatch selection might not be obvious. Click it and look at shader output to confirm it's selected.

### 🚨 **Editor state NOT preserved across page reload**
- **Problem**: If user refreshes the page, all editor values reset to defaults (0.3, white, First-Hit, 1.0)
- **Why**: No localStorage or URL parameters used
- **Impact**: During presentation, if you accidentally refresh, all settings are lost
- **Fix**: Add localStorage persistence (optional enhancement)
  ```javascript
  // In constructor:
  this.isoValue = localStorage.getItem("isoValue") || 0.3;
  // In setters:
  localStorage.setItem("isoValue", value);
  ```
- **Watch for demo**: Don't accidentally refresh the page. If you do, re-set your preferred values.

### 🚨 **Color picker layout overflow on small screens**
- **Problem**: 20 color swatches at 22px each + margins = ~200px width. If `#tfContainer` is < 200px wide, swatches wrap awkwardly
- **Current layout** (`style.css`): `.swatch-container` uses `flex-wrap: wrap`, so overflow is handled gracefully
- **Watch**: On phones or narrow windows, colors will wrap to 2–3 rows. That's fine.
- **For demo**: Don't zoom out browser to <50% (breaks layout). Keep normal zoom (100%).

### 🚨 **Iso-value indicator obscures histogram bars**
- **Problem**: Draggable line is drawn on top of histogram bars. If you drag to a peak, the line obscures the bar
- **Behavior**: Expected and unavoidable (line is meant to be visible)
- **Watch during demo**: When pointing out histogram peaks, move iso-line to the side (drag left or right) so audience can see the peak clearly

### 🚨 **Opacity slider labels can render incorrectly**
- **Problem**: Line 80 sets label text with `.text(self.currentAlpha.toFixed(2))`
- **If currentAlpha = 0.1**: displays "0.10" ✓
- **If currentAlpha = 1**: displays "1.00" ✓
- **Edge case**: currentAlpha = 0.005 → "0.01" after rounding (misleading)
- **Impact**: Negligible (opacity values are always set from slider, which is 0.01 granular)
- **Watch**: Opacity label should always show 2 decimal places. If you add code to set opacity programmatically, use `.toFixed(2)`

### 🚨 **Mode dropdown change doesn't update iso-line visibility**
- **Problem**: Iso-line is only relevant for First-Hit mode. When user switches to MIP, the iso-line is still visible and draggable (doesn't hurt, but confusing)
- **Current behavior**: Line stays visible in both modes
- **Why it's fine**: Switching back to First-Hit remembers the old iso-value (line 58 links editor to histogram)
- **Optional enhancement**: Hide iso-line in MIP mode
  ```javascript
  // In mode selector callback:
  if (mode === 0) {
    svg.select(".iso-indicator").style("opacity", 0.3);  // dim it
  } else {
    svg.select(".iso-indicator").style("opacity", 1.0);  // show it
  }
  ```
- **Watch during demo**: It's fine to leave iso-line visible. Just explain: "Iso-value only applies in First-Hit mode."

### 🚨 **D3 event handling uses new API (might break in old browsers)**
- **Problem**: Lines use `.on("change", event => ...)` and `.on("click", (event, d) => ...)` which are D3 v6+ syntax
- **In older browsers** (IE11): These event handlers might not work
- **Impact**: None for modern development (Chrome, Firefox, Safari from 2020+)
- **Watch**: If demo crashes on old machine, upgrade browser or polyfill D3

### 🚨 **Color precision: RGB 0–255 vs 0–1 mismatch**
- **Problem**: D3's `.rgb()` uses 0–255 scale. Shader expects 0–1.
- **Current code** (line 130):
  ```javascript
  const rgb = d3.rgb(d);
  self.currentColor = { r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255 };
  ```
  - This correctly divides by 255 ✓
- **Watch**: Make sure all color values sent to shader are in [0, 1]. Current code is correct.

---

## Summary

**Key parameters for quick adjustments:**
1. **Color swatches**: Add/remove colors in lines 110–122, adjust size in lines 134–135
2. **Mode dropdown**: Change default in line 57
3. **Opacity slider**: Change range in lines 79–80, default in line 81
4. **Iso-indicator**: Adjust visual style (color, size, position) in lines 160–177, drag behavior in line 183

**For demo presentations:**
- Start with default settings (First-Hit mode, white color, 0.3 iso-value, 1.0 opacity)
- Drag iso-slider left to show more, right to isolate dense structures
- Switch to MIP mode to show density peaks
- Click color swatches to highlight different structures
- Use opacity slider to peek through outer layers
- Don't refresh the page accidentally!

**Best practice:**
- Test editor responsiveness before demo (all controls should update live)
- Test on demo machine/projector to ensure swatches are visible
- If presenting with poor projector contrast, increase swatch size to 30px and iso-line thickness to 3px
