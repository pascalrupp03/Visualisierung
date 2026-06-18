# 5. Supporting Classes (volume.js, camera.js, shader.js, testShader.js)

## Overview

These files provide infrastructure that you **typically don't need to modify**. They were part of the original framework, and you've integrated them into your custom pipeline.

---

## 5A. Volume Data Handler (js/volume.js)

### What It Does
Loads volume data from binary `.dat` files and converts it to normalized float arrays for GPU texture creation.

**Input format:**
- First 3 uint16 values: width, height, depth (dimensions)
- Remaining uint16 values: voxel intensities (0–4095, representing 12-bit data)

**Output:**
- `volume.voxels`: Float32Array with normalized values [0, 1]
- `volume.width`, `volume.height`, `volume.depth`: Dimensions
- `volume.max`: Largest dimension (used for orbit camera radius)

### Code Walkthrough
```javascript
class Volume {
    constructor(uint16Array) {
        // Parse header
        this.width = uint16Array[0];
        this.height = uint16Array[1];
        this.depth = uint16Array[2];
        
        // Normalize: uint16 [0, 4095] → float [0, 1]
        let floatArray = [];
        uint16Array.slice(3).forEach(function(voxel){
            floatArray.push(voxel / 4095.0);  // ← The 4095 is important (12-bit max)
        });
        this.voxels = Float32Array.from(floatArray);
    }
}
```

### 🔧 Adjustable
- **Normalization factor** (line 16): `4095.0` assumes 12-bit input
  - If your data is 8-bit: Change to `255.0`
  - If your data is 16-bit: Change to `65535.0`
  - **Current**: Assumes 12-bit (standard for medical imaging)

### Gotchas
- **Endianness**: `Uint16Array` assumes little-endian (x86/ARM standard). If data is big-endian, voxels will be byte-swapped (incorrect)
- **File format**: Assumes binary uint16 header + voxel data. Any other format will parse garbage.
- **Watch**: Load a test file and check console: `console.log(volume.voxels.length + " voxels loaded - [" + volume.width + ", " + volume.height + ", " + volume.depth + "]")` should show correct dimensions

---

## 5B. Orbit Camera (js/camera.js)

### What It Does
Provides intuitive mouse-controlled camera that orbits around the volume center, with zoom via scroll wheel.

**Controls:**
- **Left-mouse drag**: Rotate around center (phi/theta spherical coordinates)
- **Scroll wheel**: Zoom in/out (increase/decrease radius)

**Features:**
- Smooth radius clamping (minRadius = `initialRadius / 2`, maxRadius = `initialRadius * 2`)
- Theta (vertical angle) clamping to ±π/2 (prevents flipping upside down)
- Camera always looks at center (0, 0, 0)

### Code Structure
```javascript
class OrbitCamera {
    constructor(camera, targetPos, radius, domElement) {
        // Store camera, set target, set initial radius
        // Register mouse/wheel event listeners
        this.phi = 0;      // horizontal angle
        this.theta = 0;    // vertical angle
        this.radius = radius;
    }
    
    #updateCamera(dx, dy, dz) {
        // Update phi/theta/radius based on mouse delta
        // Clamp theta to [-π/2, π/2]
        // Update camera position using spherical coordinates
        // Request repaint
    }
}
```

### 🔧 Adjustable
- **Initial zoom radius** (visvu.js, line 107):
  ```javascript
  orbitCamera = new OrbitCamera(camera, new THREE.Vector3(0,0,0), 2*volume.max, renderer.domElement);
  ```
  - Change `2*volume.max` to `3*volume.max` for more distant initial view
  - Or to `1.5*volume.max` for closer initial view
  - 🔧 **For demo**: Increase to `2.5*volume.max` if you want to show overall structure before zooming in

- **Min/max zoom limits** (camera.js, lines 25–26):
  ```javascript
  this.minRadius = radius / 2;
  this.maxRadius = radius * 2;
  ```
  - Change to `/3` and `* 3` for wider zoom range
  - Change to `/1.5` and `* 1.5` for tighter zoom
  - 🔧 **For demo**: Keep as-is (2× zoom range is comfortable)

- **Vertical angle limits** (camera.js, line 41):
  ```javascript
  this.theta = clamp(this.theta, -Math.PI / 2.0, Math.PI / 2.0);
  ```
  - This prevents camera from going upside down (theta ±90°)
  - Don't change unless you want weird camera flips

- **Drag sensitivity** (camera.js, lines 36–37):
  ```javascript
  this.phi += dx / 100.0;
  this.theta += dy / 100.0;
  ```
  - Divide by 100.0: Smaller = more sensitive, larger = less sensitive
  - 🔧 **For demo**: Change to `/150.0` for slower, more deliberate rotations (great for presentations, easier to show specific angles)
  - Or `/50.0` for snappier, faster rotations

- **Zoom sensitivity** (camera.js, line 38):
  ```javascript
  this.radius += dz / 10.0;
  ```
  - Smaller divisor = more zoom per wheel tick
  - 🔧 **For demo**: Change to `/20.0` for gentler zoom (easier to hold structure in frame)

### Gotchas
- **Camera up vector** (camera.js, line 33): `this.camera.up.set(0, 0, -1)`
  - This sets the up direction to -Z (unusual!)
  - Normal would be (0, 1, 0), but this framework uses -Z as "up"
  - Don't change unless you want inverted viewpoint
- **Event listener cleanup**: No cleanup function. If you create multiple OrbitCameras, old listeners stay active (minor memory leak, not critical for single-volume app)
- **Touch support**: Only pointer events (mouse + pen + touch). Should work on tablets automatically

---

## 5C. Base Shader Class (js/shader.js)

### What It Does
Provides a **base class for custom shaders** that loads `.essl` files and manages uniforms.

**Features:**
- Async shader file loading via d3 (from `shaders/` folder)
- Uniform getter/setter with type support
- Three.js ShaderMaterial wrapper

### Code Structure
```javascript
class Shader {
    constructor(vertexProgram, fragmentProgram) {
        // Store names (e.g., "raycaster_vert", "raycaster_frag")
        // Create ShaderMaterial with GLSL3, transparent enabled
    }
    
    async load() {
        // Load vertex shader from shaders/[name].essl
        // Load fragment shader from shaders/[name].essl
        // Assign to material.vertexShader and material.fragmentShader
    }
    
    setUniform(key, value, type) {
        // If type provided: create uniform with explicit type (e.g., "v3v" for Vector3 array)
        // Otherwise: use THREE.Uniform wrapper
    }
}
```

### 🔧 Adjustable
- **GLSL version** (line 8): `THREE.GLSL3` (OpenGL 3.3 ES)
  - Don't change; required for modern WebGL
- **Shader folder path** (line 26): `"shaders/" + name + ".essl"`
  - Change "shaders/" if you move shader files elsewhere (not recommended)

### Gotchas
- **Async load required**: You must call `await shader.load()` before using the shader (see visvu.js line 95)
  - If you forget, the shader strings will be empty and rendering will fail silently
- **No hot-reload**: Changing `.essl` files requires page refresh (browser caches files)
- **Private method**: `#loadShader()` is private (JavaScript `#` syntax). Can't call from outside class.

---

## 5D. Test Shader (js/testShader.js)

### What It Does
**Example/template shader** showing how to create a custom shader class. Renders the bounding box as a solid color.

**Purpose**: Educational—demonstrates the pattern for custom shaders. **Not used in your final implementation.**

### Code Structure
```javascript
class TestShader extends Shader {
    constructor(color) {
        super("color_vert", "color_frag");  // Load color shaders
        
        // Send color as RGB and BGR variants
        this.setUniform("color", 
            [new THREE.Vector3(color[0], color[1], color[2]),    // RGB
             new THREE.Vector3(color[2], color[1], color[0])],   // BGR
            "v3v");  // Type: Vector3 array
        
        // Index 0 = use RGB, 1 = use BGR
        this.setUniform("colorIdx", 0);
    }
}
```

### Why It's Not Used
- **Limited functionality**: Just renders solid color (no volumetric rendering)
- **Replaced by RaycasterShader**: Your custom implementation does actual raycasting
- **Kept in project**: As reference/documentation for future shader patterns

### If You Need It
- Shows how to pass array uniforms (the `"v3v"` type parameter)
- Shows how to create a custom shader class extending `Shader`
- Good example if you want to add more rendering modes later

### Gotchas
- The shaders it loads (`color_vert.essl`, `color_frag.essl`) are minimal and won't work for complex rendering
- If you accidentally include `testShader.js` in index.html but don't use it, no harm (unused code)

---

## How These Files Integrate Together

```
user loads .dat file
    ↓
readFile() in visvu.js
    ↓
Volume constructor parses data → volume object
    ↓
resetVis() creates 3D texture + RaycasterShader
    ↓
Shader.load() loads raycaster_vert/frag from shaders/ folder
    ↓
Three.js renders box with raycaster material
    ↓
OrbitCamera listens for mouse input → updates camera position
    ↓
Editor listens for UI input → calls callbacks → RaycasterShader.setUniform()
    ↓
Paint loop calls renderer.render() with updated uniforms
    ↓
GPU executes raycaster fragment shader → volume rendering
```

---

## Summary Table

| File | Purpose | Unchanged? | When to Modify |
|------|---------|-----------|-----------------|
| **volume.js** | Parse binary data | ✅ Yes | If data format changes (different bit depth) |
| **camera.js** | Mouse orbit camera | ✅ Yes | If you want different interaction (e.g., pan, different sensitivity) |
| **shader.js** | Base shader class | ✅ Yes | Never (framework requirement) |
| **testShader.js** | Example shader | ✅ Yes | Never (not used; kept for reference) |

---

## Potential Gotchas (Global)

### 🚨 **Global variables not cleaned up**
- Problem: `renderer`, `scene`, `camera`, `orbitCamera`, `volume`, `raycasterShader`, `histogram`, `editor` are all global
- If you reload volume multiple times, old objects aren't garbage collected (minor memory leak)
- Won't crash, but watch in DevTools if you load >50 volumes in one session
- Not critical for normal demo (probably load 2–3 volumes max)

### 🚨 **No error handling in file reader**
- Problem: `readFile()` in visvu.js (line 76) has no try/catch
- If file is corrupt, `Uint16Array` constructor might fail silently
- Watch: Test with an actual valid `.dat` file before demo

### 🚨 **Camera initialization order matters**
- Problem: `OrbitCamera` sets up event listeners on `renderer.domElement` (line 107 in visvu.js)
- Must happen AFTER `renderer` is added to DOM (line 34)
- Current code order is correct, but if you refactor, watch this dependency

---

## Best Practices

1. **Don't modify these files** unless you're debugging a specific issue
2. **Use as reference**: These show good patterns (async loading, callback architecture)
3. **Test file loading**: Always test with actual `.dat` files from the assignment before demo
4. **Monitor console**: Open browser DevTools > Console to see any shader loading errors
