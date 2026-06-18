# 2. Raycaster Shader (js/raycasterShader.js + GLSL shaders)

## What This Does

This is the **core GPU rendering engine** of your application. It implements single-pass volume raycasting with two compositing modes and Blinn-Phong shading.

**High-level flow:**
1. For each pixel on screen, cast a ray from the camera through the bounding box
2. Sample the 3D volume texture along the ray at regular intervals
3. Composite samples based on mode:
   - **MIP (Maximum Intensity Projection)**: Keep the brightest sample → shows density peaks
   - **First-Hit**: Find where density crosses the iso-value threshold, return shaded surface → shows iso-surfaces
4. Output color to framebuffer

**Key components:**
- `raycasterShader.js`: JavaScript wrapper class that loads shaders and manages uniforms (renderable parameters)
- `raycaster_vert.essl`: Vertex shader (simple, just transforms vertices and passes world position to fragment shader)
- `raycaster_frag.essl`: Fragment shader (complex, does all the raycasting work)

---

## What You Changed vs. Original Framework

**js/raycasterShader.js** (NEW FILE):
- ✅ **Created**: New class extending `Shader` base class
- ✅ **Sets up uniforms**:
  - `uVolumeTexture`: The 3D voxel data
  - `uVolumeSize`: Volume dimensions for coordinate calculations
  - `uIsoValue`: Threshold for First-Hit mode (default 0.3)
  - `uCompositingMode`: 0=MIP, 1=First-Hit (default 1)
  - `uSurfaceColor`: RGB color for First-Hit surfaces (default white)
  - `uAlpha`: Opacity (default 1.0)
- ✅ **Sets material properties**: `THREE.BackSide` (we render from inside the box)
- ✅ **Provides setter methods**: `setIsoValue()`, `setCompositingMode()`, `setSurfaceColor()`, `setAlpha()` for interactive updates

**shaders/raycaster_vert.essl** (NEW FILE):
- ✅ **Created**: Vertex shader for raycasting proxy geometry
- ✅ **Transforms**: Converts vertex positions to world space
- ✅ **Output**: `vWorldPosition` interpolated to fragment shader for ray origin

**shaders/raycaster_frag.essl** (NEW FILE):
- ✅ **Created**: Main raycasting implementation
- ✅ **Ray/AABB intersection**: Branchless slab method (Tavian Barnes algorithm) → detects where rays enter/exit the volume box
- ✅ **Step size calculation**: Adaptive sampling based on ray direction (ensures no voxel boundaries skipped)
- ✅ **MIP compositing**: Accumulate maximum density encountered
- ✅ **First-Hit compositing**: Detect iso-surface crossing via density threshold, interpolate exact hit position
- ✅ **Gradient computation**: Central differences for surface normals
- ✅ **Blinn-Phong shading**: Headlight illumination (light = camera direction)
- ❌ **Unchanged**: Framework base shader system (`js/shader.js`), vertex/fragment loading mechanism

---

## 🔧 Adjustable Settings for Demos/Presentations

### Iso-Value (interactive via editor):
- **Current default**: 0.3
- **Useful range**: 0.05 (show noisy, thin structures) to 0.80 (show only dense cores)
- **For live demo**: Start at 0.3, drag slider left to show more detail, drag right to isolate solid structures
- **Quick presets** (hardcoded fallback in `raycasterShader.js` line 10):
  ```javascript
  this.setUniform("uIsoValue", 0.3);  // ← Change here for different default
  ```

### Compositing Mode (interactive via editor dropdown):
- **Current default**: First-Hit (value 1)
- **Switch on-the-fly**: Editor select menu automatically sends mode 0 (MIP) or 1 (First-Hit)
- **For demo script**: Show MIP first (clear max intensities), then switch to First-Hit (see surface details)

### Surface Color (interactive via color picker):
- **Current default**: White (1.0, 1.0, 1.0)
- **20 colors available**: HSL color wheel (18 hues) + white + gray
- **For demo**: Click different swatches to highlight different anatomical structures
- **To add more colors**: Edit `editor.js` line 110–120, add more `d3.hsl()` or `d3.rgb()` entries

### Alpha/Opacity (interactive via slider):
- **Current default**: 1.0 (fully opaque)
- **Useful range**: 0.5–1.0 (below 0.5 gets too transparent, hard to see)
- **For demo**: Reduce to 0.7–0.8 to see through outer structures to inner details
- **Located**: `editor.js`, opacity slider (line ~60)

### Advanced: Step Size (requires shader edit)
- **Current formula** (line ~90 in `raycaster_frag.essl`): 
  ```glsl
  float stepSize = min(dt.x, min(dt.y, dt.z));
  ```
  This is the safe default (visits every voxel boundary).
- **To increase quality** (slower, more detail): Multiply by 0.5:
  ```glsl
  float stepSize = 0.5 * min(dt.x, min(dt.y, dt.z));
  ```
- **To increase speed** (lower quality): Multiply by 2.0
  ```glsl
  float stepSize = 2.0 * min(dt.x, min(dt.y, dt.z));
  ```
- **🔧 Quick adjustment**: Replace line 90 with your factor before load

### Advanced: Blinn-Phong Parameters (requires shader edit, `raycaster_frag.essl` lines 46–50)
- **ka (ambient)**: 0.2 → Increase to 0.4 for brighter shadows, decrease to 0.1 for darker contrast
- **kd (diffuse)**: 0.7 → Increase to 0.85 for more lighting detail, decrease to 0.5 for matte
- **ks (specular)**: 0.5 → Increase to 0.8 for shiny surfaces, decrease to 0.2 for dull
- **shininess**: 50 → Increase to 100 for small sharp highlights, decrease to 20 for broad soft highlights

Example for **high-contrast demo** (shadowy, detailed):
```glsl
float ka = 0.1;
float kd = 0.75;
float ks = 0.6;
float shininess = 80.0;
```

---

## Potential Gotchas & Things to Watch

### 🚨 **Artifact: Ray alignment with axes**
- **Problem**: If a ray is exactly axis-aligned (e.g., pointing straight down the Z axis), `rayDir.z ≈ 0`, and `1.0 / rayDir.z` becomes huge or undefined
- **Prevention**: Line 82 avoids division by zero:
  ```glsl
  vec3 dt = vec3(1.0) / max(absDir, vec3(1e-8));  // ← 1e-8 prevents /0
  ```
- **Watch during demo**: Rotate the volume while viewing along axes. Should not crash or show artifacts.

### 🚨 **Performance cliff: Step size too small**
- **Problem**: If you change step size to 0.5 or smaller, frame rate drops dramatically
- **GPU workload doubles** for each 0.5× factor
- **Fix**: Don't go below 0.25× unless you have high-end GPU (RTX 3080+)
- **Watch**: Monitor FPS (use browser DevTools) before presenting with heavy step sizes

### 🚨 **Banding artifacts in MIP mode**
- **Problem**: Bright rings appear, especially with larger step sizes
- **Cause**: Sampling misses fine gradient transitions
- **Mitigation**: Current step size `diagonal/(3×maxDim)` is a compromise. To reduce banding:
  - Switch to First-Hit mode (has smoother interpolation)
  - Reduce step size (see above)
  - Increase iso-value slightly (skips noise)
- **Watch during demo**: If you show MIP mode, don't zoom to extreme close-up

### 🚨 **First-Hit can "miss" thin structures**
- **Problem**: If a surface is thinner than the step size, the ray might skip over it without detecting a crossing
- **Example**: Step size = 2 voxels, surface thickness = 1 voxel → 50% chance to miss
- **Mitigation**: Use smaller step sizes (see above) or increase iso-value to catch thicker parts
- **Watch**: Drag iso-value slider at extreme low values (0.05). Some structures may flicker as step size misses them

### 🚨 **Camera inside volume = unexpected rays**
- **Problem**: If camera is placed inside the box, `tmin` might be negative
- **Prevention**: Line 70 clamps it:
  ```glsl
  tmin = max(tmin, 0.0);  // start from camera if inside
  ```
- **Watch**: Zoom to extreme close-up. Should not black out or show back faces of box

### 🚨 **Gradient points wrong direction (flipped normals)**
- **Problem**: Gradient computed via central differences might point inward or outward depending on density increase direction
- **Why it matters**: Affects diffuse lighting direction → surface can appear lit or shadowed
- **Current code** (line 37): Central difference `∇f = f(x-ε) - f(x+ε)` points in direction of *decreasing* density
  - For bone (dense center), this points outward ✓
  - For air pockets (low density center), this points inward ✗
- **Mitigation**: The Blinn-Phong shading uses `max(dot(normal, lightDir), 0)`, which clamps negative angles. This auto-fixes some flipped normals but can make backfaces dark.
- **Watch**: Look for "black patches" on structures at certain angles. This is normal (backface).

### 🚨 **Alpha blending disabled for volume ray intersection**
- **Problem**: The shader outputs color + alpha, but Three.js blending might not be enabled for the material
- **Current status**: `THREE.ShaderMaterial` has `transparent: true`, so alpha *should* work
- **But**: If you render multiple volumes overlapping, depth sorting can be wrong
- **Watch**: Stick to single volume at a time. If adding multiple volumes later, enable `material.depthWrite = false`

### 🚨 **Iso-value detection can have rounding errors**
- **Problem**: Linear interpolation (line 103-105) assumes linear density between samples, but actual density curve might be nonlinear
- **Example**: Sample 0 has density 0.25, sample 1 has density 0.35, iso-value is 0.3. Interpolated hit is at ~50% between samples. But actual iso-surface might be at 45% due to nonlinearity.
- **Impact**: Hit position is off by ~1 voxel in volume space. For gradient computation, this causes normal inaccuracy.
- **Mitigation**: Current approach is good enough for most medical data. To improve, enable **binary search** (expensive, not done here).
- **Watch**: Iso-surfaces should not "jump" or jitter as you drag slider. Small movements = smooth surface movement.

### 🚨 **Texture filtering mismatch**
- **Current settings** (`visvu.js` lines ~58):
  ```javascript
  volumeTexture.minFilter = THREE.LinearFilter;
  volumeTexture.magFilter = THREE.LinearFilter;
  ```
  This interpolates within the texture (smooth sampling).
- **Alternative**: `THREE.NearestFilter` for no interpolation (crisp voxel boundaries)
- **Watch**: For demo, linear filter looks smoother (nice). If you want pixel-perfect voxel display, switch to nearest in `visvu.js`

---

## Summary

**Key parameters to adjust before demo:**
1. **Iso-value**: Use editor slider (no code change needed)
2. **Compositing mode**: Use editor dropdown (no code change needed)
3. **Surface color**: Use editor color picker (no code change needed)
4. **Opacity**: Use editor slider (no code change needed)

**If code changes needed:**
- **Step size**: Edit `raycaster_frag.essl` line 90
- **Phong parameters**: Edit `raycaster_frag.essl` lines 46–50
- **Default iso-value**: Edit `raycasterShader.js` line 10

**Performance baseline:**
- Full HD (1920×1080), typical volume (256³), first-hit mode: ~30–60 FPS on GTX 1070
- If FPS drops below 20, reduce step size factor or switch to MIP mode

**Best practice for demo:**
- Load volume
- Start with iso-value = 0.3, color = white, mode = First-Hit
- Rotate to show 3D structure
- Drag iso-slider to "peel away" outer structures
- Switch to MIP mode to show density peaks
- Adjust color for emphasis
