# 8. Project Architecture & Quick Reference (OVERVIEW)

## One-Sentence Summary

**A web-based GPU-accelerated volume renderer with real-time interactive controls (iso-value slider, color picker, opacity control) and a D3-based histogram for understanding voxel distribution.**

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     WEB BROWSER                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────┐         ┌──────────────────┐    │
│  │   HTML/CSS Layer     │         │  JavaScript DOM  │    │
│  ├──────────────────────┤         ├──────────────────┤    │
│  │ index.html           │         │ D3.js Library    │    │
│  │ style.css            │         │ editor.js        │    │
│  │ (layout, colors)     │         │ histogram.js     │    │
│  │                      │         │ (UI elements)    │    │
│  └──────────────────────┘         └──────────────────┘    │
│           │                              │                │
│           └──────────────┬───────────────┘                │
│                          │                                │
│                    ┌─────▼──────────┐                     │
│                    │  Three.js Scene│                     │
│                    ├────────────────┤                     │
│                    │ scene, camera  │                     │
│                    │ renderer       │                     │
│                    │ mesh (box)     │                     │
│                    └─────┬──────────┘                     │
│                          │                                │
│                    ┌─────▼──────────────┐                 │
│                    │  ShaderMaterial    │                 │
│                    ├────────────────────┤                 │
│                    │ uniforms:          │                 │
│                    │ • uVolumeTexture   │                 │
│                    │ • uVolumeSize      │                 │
│                    │ • uIsoValue        │                 │
│                    │ • uCompositingMode │                 │
│                    │ • uSurfaceColor    │                 │
│                    │ • uAlpha           │                 │
│                    └─────┬──────────────┘                 │
│                          │                                │
│  ┌───────────────────────▼──────────────────────┐        │
│  │              GPU / WebGL                      │        │
│  ├───────────────────────┬──────────────────────┤        │
│  │                       │                       │        │
│  │  ┌──────────────────┐ │ ┌─────────────────┐ │        │
│  │  │ Vertex Shader    │ │ │Fragment Shader  │ │        │
│  │  ├──────────────────┤ │ ├─────────────────┤ │        │
│  │  │ raycaster_vert   │ │ │raycaster_frag   │ │        │
│  │  │ (transforms      │ │ │(ray marching)   │ │        │
│  │  │  vertices)       │ │ │(compositing)    │ │        │
│  │  │                  │ │ │(shading)        │ │        │
│  │  └──────────────────┘ │ └─────────────────┘ │        │
│  │                       │                       │        │
│  │  ┌──────────────────┐                        │        │
│  │  │  3D Texture      │                        │        │
│  │  ├──────────────────┤                        │        │
│  │  │ uVolumeTexture   │                        │        │
│  │  │ (voxel data)     │                        │        │
│  │  │ 256×256×256 px   │                        │        │
│  │  │ float [0,1]      │                        │        │
│  │  └──────────────────┘                        │        │
│  │                                               │        │
│  └───────────────────────────────────────────────┘        │
│                          │                                │
│                    ┌─────▼──────────┐                     │
│                    │ Framebuffer    │                     │
│                    │ (rendered      │                     │
│                    │  image)        │                     │
│                    └────────────────┘                     │
│                          │                                │
│                    ┌─────▼──────────┐                     │
│                    │  Display on    │                     │
│                    │  Screen        │                     │
│                    └────────────────┘                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### File Load → Render (One-Time Setup)
```
User selects .dat file
    ↓
FileReader.readAsArrayBuffer()
    ↓
Uint16Array parsed (header: width, height, depth)
    ↓
Volume constructor normalizes voxels [0,4095] → [0,1]
    ↓
resetVis() called (async)
    ├─ Create THREE.Data3DTexture from voxels
    ├─ Load raycaster_vert.essl and raycaster_frag.essl from shaders/ folder
    ├─ Create RaycasterShader with uniforms
    ├─ Create mesh (BOX) with shader material
    ├─ Add mesh to scene
    ├─ histogram.update(volume) → compute bins, animate bars
    └─ requestAnimationFrame(paint)
    ↓
paint() called every ~16ms
    ↓
renderer.render(scene, camera)
    ↓
GPU:
    ├─ Vertex shader: transform box vertices to world space
    ├─ Rasterize: generate fragments covering screen
    ├─ Fragment shader for each pixel:
    │  ├─ Ray-AABB intersection (compute tmin, tmax)
    │  ├─ Ray marching loop:
    │  │  └─ For each step:
    │  │     ├─ Sample density from 3D texture
    │  │     ├─ If MIP: max(density)
    │  │     ├─ If First-Hit: check iso-crossing
    │  │     │  └─ Compute gradient (normal)
    │  │     │  └─ Blinn-Phong shading
    │  │     │  └─ Return color
    │  └─ Output vec4(color, alpha)
    ↓
Render result displayed on screen
```

### Interactive Update (Real-Time)
```
User moves mouse / scrolls / clicks UI
    ↓
Event listener fires (D3 or browser native)
    ↓
If mouse: OrbitCamera updates phi/theta/radius → requestAnimationFrame(paint)
If UI:    Editor callback fires → raycasterShader.setUniform() → requestAnimationFrame(paint)
    ↓
paint() called
    ↓
renderer.render() with new camera position / shader uniforms
    ↓
GPU renders new frame with updated parameters
    ↓
Display updated image
```

---

## File Organization

```
Vis_Framework_2026S/
│
├─ index.html                    (Page structure, script includes)
├─ style.css                     (Layout: flexbox, colors, interactive elements)
├─ README.md                     (Usage guide)
├─ CHANGELOG.md                  (Task-by-task changes)
│
├─ three.js/
│  └─ build/three.js             (Three.js library — do not modify)
│
├─ d3.js/
│  └─ d3.v7.js                   (D3.js library — do not modify)
│
├─ shaders/
│  ├─ raycaster_vert.essl        (Vertex shader — YOU CREATED)
│  ├─ raycaster_frag.essl        (Fragment shader, main raycasting — YOU CREATED)
│  ├─ color_vert.essl            (Test shader — not used)
│  └─ color_frag.essl            (Test shader — not used)
│
└─ js/
   ├─ visvu.js                   (Main orchestrator — YOU MODIFIED)
   ├─ raycasterShader.js         (Shader wrapper — YOU CREATED)
   ├─ histogram.js               (D3 histogram — YOU CREATED)
   ├─ editor.js                  (Interactive controls — YOU CREATED)
   │
   ├─ volume.js                  (Volume data loader — framework, unchanged)
   ├─ camera.js                  (Orbit camera — framework, unchanged)
   ├─ shader.js                  (Base shader class — framework, unchanged)
   └─ testShader.js              (Example shader — not used)
```

---

## Key Classes & Methods

### visvu.js
```javascript
init()              // Called on page load
readFile()          // Load .dat file → parse → Volume
resetVis()          // Async: build scene, load shaders, init UI
paint()             // Render loop (called every frame)
```

### RaycasterShader (raycasterShader.js)
```javascript
constructor(volumeTexture, volumeSize)
setIsoValue(value)
setCompositingMode(mode)
setSurfaceColor(r, g, b)
setAlpha(value)
```

### Histogram (histogram.js)
```javascript
constructor(containerSelector)
update(volume)      // Recompute bins, animate bars
```

### Editor (editor.js)
```javascript
constructor(containerSelector, onIsoValueChange, onColorChange, onModeChange, onAlphaChange)
setHistogram(histogram)
updateIsoLine(value)  // External update
```

### Volume (volume.js)
```javascript
constructor(uint16Array)
// Properties: width, height, depth, voxels (Float32Array), max
```

### OrbitCamera (camera.js)
```javascript
constructor(camera, targetPos, radius, domElement)
update()            // Called for auto-rotation (if enabled)
// Private: #updateCamera, #onMouseDown, #onMouseUp, #onMouseMove, #onMouseWheel
```

---

## Shader Interface (GPU-side)

### Vertex Shader (raycaster_vert.essl)
**Input:** Standard Three.js attributes (position, normal, uv, etc.)
**Output:** `vWorldPosition` (interpolated to fragment shader)
**Purpose:** Transform vertices from model space to world space

### Fragment Shader (raycaster_frag.essl)
**Uniforms:**
```glsl
uniform vec3 uVolumeSize;           // Volume dimensions (width, height, depth)
uniform sampler3D uVolumeTexture;   // 3D voxel data
uniform float uIsoValue;            // Density threshold (0–1)
uniform int uCompositingMode;       // 0=MIP, 1=First-Hit
uniform vec3 uSurfaceColor;         // RGB color (0–1)
uniform float uAlpha;               // Opacity (0–1)
```

**Main operations:**
1. Ray-box intersection (slab method)
2. Step along ray through volume
3. Sample density at each step
4. Composite based on mode
5. If First-Hit: compute gradient + Blinn-Phong shading
6. Output final color + alpha

---

## Adjustable Parameters (Quick Reference)

| Where | Parameter | Default | Range | Effect |
|-------|-----------|---------|-------|--------|
| **Editor UI** | Iso-Value | 0.3 | 0.05–0.80 | Density threshold for First-Hit |
| **Editor UI** | Color | White | 20 swatches | Surface color |
| **Editor UI** | Opacity | 1.0 | 0.0–1.0 | Surface transparency |
| **Editor UI** | Mode | First-Hit | MIP / First-Hit | Rendering algorithm |
| **Shader** | ka (ambient) | 0.2 | 0.05–0.30 | Shadow brightness |
| **Shader** | kd (diffuse) | 0.7 | 0.50–0.90 | Surface form visibility |
| **Shader** | ks (specular) | 0.5 | 0.10–0.70 | Gloss amount |
| **Shader** | shininess | 50 | 10–100 | Highlight sharpness |
| **Shader** | step size | diag/(3N) | diag/(2N)–diag/(5N) | Ray marching granularity |

---

## Potential Issues During Demo & Quick Fixes

| Issue | Symptom | Cause | Fix |
|-------|---------|-------|-----|
| Nothing renders | Black screen | Volume not loaded OR shader didn't load | Upload a .dat file; check console for errors |
| Iso-slider doesn't work | Dragging doesn't change image | First-Hit mode not selected | Click "Compositing Mode" dropdown, select "First-Hit" |
| Colors washed out | Image very dim | Opacity set to 0.1 | Increase opacity slider to 1.0 |
| Histogram completely flat | Bar chart invisible | First bin dominates y-scale | This is normal; histogram still works (slider uses it) |
| Very low FPS | Stutters, laggy | Step size too small OR old GPU | Try: switch to MIP mode, or reduce step size divisor in shader |
| Colors don't update | Picker swatches visible but no effect | Editor not connected to shader | Check console for errors; may need to reload page |
| Camera stuck | Can't rotate/zoom | Mouse events not firing | Try: click on canvas first to focus it |

---

## Testing Checklist

Before presenting:
- [ ] Load a test `.dat` file → verify histogram shows distribution
- [ ] Drag iso-slider → volume should update in real-time
- [ ] Click color swatches → colors should change instantly
- [ ] Switch MIP/First-Hit → two different rendering modes
- [ ] Drag mouse → camera rotates smoothly
- [ ] Scroll wheel → zoom in/out works
- [ ] Opacity slider → see-through effect works
- [ ] Load different volume → histogram redraws with animation
- [ ] Check DevTools console → no errors
- [ ] Test on demo machine (screen resolution might affect canvas size)

---

## Performance Notes

**GPU Work (90%+ of time):**
- Fragment shader: ray marching, 100–200 samples per pixel
- Full HD: ~400M ray steps per frame
- Bottleneck: GPU memory bandwidth (texture lookups)

**CPU Work (negligible):**
- Uniform updates: < 1ms
- D3 DOM updates: < 5ms (only on mode/color change)
- Histogram animation: smooth, driven by browser

**Optimization potential:**
- Reduce step size for faster rendering (quality trade-off)
- Switch to MIP mode (fewer branches in shader)
- Lower resolution (reduce pixel count)
- Smaller volume (fewer samples per ray)

---

## Known Limitations

1. **Single volume only**: Can't render multiple volumes simultaneously
2. **No transfer function**: All iso-surfaces same color (Task 6 not done)
3. **No gradient smooth-step filter**: Artifacts at very low iso-values
4. **No adaptive step size**: Fixed step size for all rays (isotropic sampling)
5. **No early ray termination**: Always ray-march to exit, even after first hit
6. **Headlight only**: No static light sources (always face camera)

---

## Future Enhancements (Beyond Current Scope)

1. **Transfer function** (Task 6): Density → color mapping
2. **Multiple volumes**: Overlay/blend several datasets
3. **Clipping planes**: Cut away parts for inspection
4. **Acceleration structures**: Better performance on huge volumes
5. **Advanced shading**: Multiple lights, shadows, ambient occlusion
6. **Volume slicing**: 2D cross-sections alongside 3D view
7. **Animation**: Time-series volume rendering

---

## Recommended Demo Flow

**For 5-minute presentation:**

1. **(0:00–0:30)** Overview slide: "GPU volume rendering, interactive controls, real-time shading"
2. **(0:30–1:00)** Load volume, show histogram, explain distribution
3. **(1:00–2:00)** Switch modes (MIP ↔ First-Hit), explain difference
4. **(2:00–3:00)** Drag iso-slider, show peel-away effect (low to high iso-value)
5. **(3:00–4:00)** Show color selection, rotate 3D volume, adjust opacity
6. **(4:00–4:45)** Mention: Blinn-Phong shading, ray marching, ~30–60 FPS performance
7. **(4:45–5:00)** Closing: "Complete volume rendering pipeline in WebGL"

**For 15-minute deep-dive:**

- Same as above, but expand each section:
  - Explain ray-AABB intersection algorithm
  - Show gradient computation (central differences)
  - Discuss Blinn-Phong coefficients (why ka=0.2, kd=0.7, etc.)
  - Demonstrate performance on different step sizes
  - Explain D3 histogram binning strategy
  - Show code snippets for key algorithms

---

## Useful Debug Commands (Browser Console)

```javascript
// Check if volume loaded
console.log(volume.voxels.length + " voxels");

// Check shader uniforms
console.log(raycasterShader.material.uniforms);

// Set iso-value programmatically
raycasterShader.setIsoValue(0.5);

// Force repaint
requestAnimationFrame(paint);

// Check FPS (rough estimate)
// Open DevTools > Performance tab, record, look at frame times
```

---

## Contact/Questions

If something breaks:
1. **Check console**: DevTools > Console for errors
2. **Reload page**: `Ctrl+Shift+R` (hard reload, clears cache)
3. **Check shader logs**: WebGL compilation errors appear in console
4. **Verify data format**: Make sure `.dat` file is valid binary (uint16 header + voxels)
5. **Test on different browser**: Chrome, Firefox, Safari (all support WebGL2)

---

## Summary

**What you built:**
- GPU-accelerated volume raycasting (single-pass, two modes)
- Interactive histogram visualization (D3.js)
- Real-time parameter controls (iso-value, color, opacity)
- Smooth surface shading (Blinn-Phong with headlight)

**What works:**
- Load `.dat` volumes
- Render with MIP or First-Hit
- Rotate/zoom camera
- Adjust rendering parameters on-the-fly
- View 3D structure with shading

**What you've learned:**
- GPU raycasting fundamentals
- GLSL fragment shader programming
- Three.js scene setup & materials
- D3.js DOM manipulation & data visualization
- Real-time interactive graphics architecture

**Complexity:** Medium (well-structured, modular, extensible)
**Performance:** Good (30–60 FPS typical)
**Code quality:** Clean (clear separation of concerns, documented)
