# 3. Density Histogram (js/histogram.js)

## What This Does

The histogram is a **D3.js-based visualization** showing the distribution of voxel intensities (densities) in the loaded volume. It helps you understand:
- What density ranges contain the most voxels
- Where to set the iso-value to isolate certain structures
- How the volume data is skewed (e.g., lots of air/background vs. some bone/tissue)

**Visual layout:**
- X-axis: Density [0, 1] (left = dark/air, right = bright/bone)
- Y-axis: Frequency (how many voxels at each density, using sqrt scale for readability)
- Blue bars: One bin per density range

**Key feature:** The histogram updates with animation (750ms transition) when you load a new volume.

---

## What You Changed vs. Original Framework

**js/histogram.js** (NEW FILE):
- ✅ **Created**: Histogram class (no base class, pure D3 implementation)
- ✅ **Binning**: Uses `d3.bin()` to compute 150 equal-width bins across [0, 1]
- ✅ **Scaling**:
  - X-axis: Linear scale for density
  - Y-axis: Square-root scale (makes small bins visible even with high-count background)
- ✅ **Axes**: Bottom axis (density 0–1, 10 ticks), left axis (frequency, sqrt scale)
- ✅ **Animations**: D3 join pattern (enter/update/exit) with 750ms transitions
- ✅ **Background skip**: First bin (usually contains ~90% air/background) is excluded from y-domain scaling, so other peaks are visible
- ❌ **Unchanged**: D3 library itself, axis styling (white text)

**Integration in visvu.js:**
- ✅ **Added**: Line 27 – `histogram` global variable
- ✅ **Added**: Line 38 – Create histogram: `histogram = new Histogram("#tfContainer")`
- ✅ **Added**: Line 104 – Update on new volume: `histogram.update(volume)`

**style.css:**
- No specific changes needed; histogram uses default white text/axes

---

## 🔧 Adjustable Settings for Demos/Presentations

### Number of Bins (resolution of histogram):
- **Current**: 150 bins across [0, 1]
- **Location**: `histogram.js`, line 41
  ```javascript
  const bins = d3.bin().domain([0, 1]).thresholds(150)(volume.voxels);
  ```
- **To show coarse distribution** (faster load, less detail): Change to 50
  ```javascript
  .thresholds(50)
  ```
- **To show fine detail** (slower, might look noisy): Change to 256
  ```javascript
  .thresholds(256)
  ```
- **For demo**: 150 is good default. Use 50 if you have many volume switches.

### Y-Axis Scale (frequency readability):
- **Current**: `d3.scaleSqrt()` (square-root scale)
- **Location**: `histogram.js`, line 18
  ```javascript
  this.yScale = d3.scaleSqrt().range([this.height, 0]);
  ```
- **To use linear scale** (peak dominates, smaller bins invisible):
  ```javascript
  this.yScale = d3.scaleLinear().range([this.height, 0]);
  ```
- **To use log scale** (emphasizes tiny peaks, might look spiky):
  ```javascript
  this.yScale = d3.scaleLog().range([this.height, 0]);
  ```
- **For demo**: Sqrt scale is best; it balances visibility of both peaks and background noise.

### Skip first bin (background handling):
- **Current**: Yes, first bin is excluded from y-domain (line 50)
  ```javascript
  const maxCount = d3.max(bins.slice(1), d => d.length);
  ```
- **To include all bins** (flattens histogram if background dominates):
  ```javascript
  const maxCount = d3.max(bins, d => d.length);
  ```
- **For demo**: Keep it skipped. Shows detail better.

### Histogram dimensions (size on screen):
- **Current**: 400×300 pixels (with margins)
- **Location**: `histogram.js`, lines 13–15
  ```javascript
  this.width = 400 - this.margin.left - this.margin.right;   // 350 net width
  this.height = 300 - this.margin.top - this.margin.bottom;  // 260 net height
  ```
- **To make histogram taller** (better detail, takes more vertical space):
  ```javascript
  this.height = 400 - this.margin.top - this.margin.bottom;  // 360 net
  ```
- **For demo**: Current size is good. Only enlarge if you have a large projector screen.

### Axis ticks (readability):
- **X-axis** (line 30): `d3.axisBottom(this.xScale).ticks(10)` → 10 ticks (0, 0.1, 0.2, ..., 1.0)
  - Change to `.ticks(5)` for sparser labels (cleaner look)
  - Change to `.ticks(20)` for denser labels (more precise)
- **Y-axis** (line 52): `d3.axisLeft(this.yScale).ticks(5)` → 5 ticks
  - Not critical for most demos
- **For demo**: Keep as-is.

### Bar styling (visual appearance):
- **Bar color**: `attr("fill", "steelblue")` (line 62)
  - Change to red: `"#e74c3c"`, green: `"#27ae60"`, purple: `"#8e44ad"`
  - For demo, steel blue is professional
- **Bar spacing**: `Math.max(0, this.xScale(d.x1) - this.xScale(d.x0) - 1)` (line 64)
  - The `-1` pixel prevents bars from touching. Change to `-2` for more gap, `-0.5` for touching
- **For demo**: Keep colors and spacing as-is.

### Animation duration:
- **Current**: 750ms for all transitions (enter, update, exit)
- **Location**: `histogram.js`, multiple `.transition().duration(750)` calls
- **To speed up** (snappy feel): Change to `300`
  ```javascript
  .transition().duration(300)
  ```
- **To slow down** (dramatic reveal): Change to `1500`
- **For demo**: 750ms is good. Fast enough to feel responsive, slow enough to see change.

---

## Potential Gotchas & Things to Watch

### 🚨 **Background bin dominates (y-axis is flat)**
- **Problem**: Air/background voxels (density ~0) often outnumber everything else by 100×. Without skipping the first bin, all other peaks are invisible.
- **Example**: 1M voxels total, 900k air, 100k tissue → Y-axis range 0–900k, tissue peaks become 1px tall
- **Current fix** (line 50): Skip first bin when computing `maxCount`
  ```javascript
  const maxCount = d3.max(bins.slice(1), d => d.length);
  ```
- **Watch**: If histogram looks completely flat, background data might be unusual. Check console for voxel count.
- **If it happens**: Manually skip more bins: `bins.slice(2)` or use log scale instead of sqrt

### 🚨 **Histogram width conflict with iso-indicator (D3 drag)**
- **Problem**: Iso-value indicator (draggable line) is drawn on top of histogram bars. If bars are too wide, you can't grab the handle.
- **Current workaround**: Small `-1` pixel gap between bars (line 64) leaves room for drag handle
- **Watch**: Bar width depends on number of bins. With 50 bins, bars are ~7px wide (safe). With 256 bins, bars are ~1.5px wide (might miss).
- **For demo**: Keep 150 bins. Avoids both problems (bars visible, handle graspable).

### 🚨 **Volume data with unusual distribution**
- **Problem**: Some volumes have two separate peaks (e.g., air + bone, no soft tissue). Histogram might look bimodal and confusing.
- **Why it matters**: Tells you iso-value slider has two "sweet spots" (low = soft tissue, high = bone)
- **Watch during demo**: Explain the histogram to audience: "This volume has two major tissue types—smooth the slider to pick which one to show"
- **No code fix needed**: Just educational commentary

### 🚨 **Floating-point precision in bin boundaries**
- **Problem**: D3's `bin()` sometimes creates overlapping or missing boundaries due to floating-point math
- **Very rare**: Affects maybe 0.1% of datasets
- **Symptom**: A voxel value of exactly 0.5 might be counted in bin[50] or bin[51] non-deterministically
- **Fix**: Not applicable here; D3 handles it. Just be aware if someone reports "one voxel went missing"

### 🚨 **SVG rendering lag on slow machines**
- **Problem**: Rendering 150 bars with animations + axes + iso-line + label can be slow on old laptops
- **Symptom**: 750ms transition stutters or doesn't complete smoothly
- **Watch during demo**: Test on the actual presentation machine
- **If it happens**: Reduce bins to 50 or animation duration to 300ms (lines 41, 66, etc.)

### 🚨 **Axis labels overlap at narrow widths**
- **Problem**: If you shrink the histogram width (line 14), x-axis labels (0, 0.1, 0.2, ...) might overlap
- **Watch**: If you set width < 200px, text will collide. Increase margin or reduce ticks.
- **Fix**: Change ticks from 10 to 5 (line 30): `.ticks(5)` shows fewer, less crowded labels

### 🚨 **Y-axis domain reset on each update**
- **Problem**: Line 50 recomputes `maxCount` from new volume. If volumes have very different distributions (e.g., first volume has 100k tissue, second has 10k), y-scale jumps
- **Behavior**: Not a bug, it's intentional (auto-scales to each volume). Looks right.
- **Watch**: If you load many volumes quickly, axis changes each time. Smooth during animation (750ms covers it).
- **No fix needed**: It's the right behavior.

---

## Summary

**Key parameters for quick adjustments:**
1. **Appearance**: Number of bins (line 41), Y-scale type (line 18), colors (line 62)
2. **Performance**: Animation duration (750ms → 300ms), skip background bins (line 50)
3. **Layout**: Histogram width/height (lines 14–15)

**For demo presentations:**
- Histogram is mostly automatic; it updates when you load data
- Show audience: "This axis is density (air on left, bone on right). Density distribution tells us where to set the slider."
- Drag iso-value slider left/right to show how histogram highlights different ranges

**Best practice:**
- Keep default settings (150 bins, sqrt scale, skip first bin)
- Only change if you find performance issues or specific demo needs
- Test histogram rendering on your presentation device (iPad/laptop projector can be slow)
