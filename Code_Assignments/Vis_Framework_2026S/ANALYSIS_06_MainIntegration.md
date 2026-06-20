# 6. Main Integration & Control Flow (js/visvu.js)

## What This Does

`visvu.js` is the **main orchestrator** that:
1. **Initializes the app** (`init()` function)
2. **Loads volume data** (`readFile()` function)
3. **Builds the 3D scene** (`resetVis()` function)
4. **Renders the scene** (`paint()` function)

It's the "glue" that connects all the pieces: Three.js renderer, raycaster shader, histogram, editor, and orbit camera.

---

## Key Sections

### `init()` - App Startup (lines 25–57)

**What happens:**
1. Create canvas and add to page
2. Set up WebGL renderer
3. Register file upload listener
4. Create histogram and editor
5. Set up editor callbacks

**Critical lines:**
```javascript
// Canvas sizing: fit to 70% width, 68% height of window
const maxWidth = window.innerWidth * 0.70;
const maxHeight = window.innerHeight * 0.68;

// Create Three.js renderer
renderer = new THREE.WebGLRenderer();
renderer.setSize(canvasWidth, canvasHeight);

// Listen for file input
fileInput.addEventListener('change', readFile);

// Create UI elements
histogram = new Histogram("#tfContainer");
editor = new Editor("#tfContainer", 
    function(val) { /* iso-value changed */ },
    function(r, g, b) { /* color changed */ },
    function(mode) { /* mode changed */ },
    function(alpha) { /* opacity changed */ }
);
editor.setHistogram(histogram);
```

### `readFile()` - File Loading (lines 65–76)

**What happens:**
1. Read uploaded `.dat` file as binary buffer
2. Parse into Uint16Array
3. Create Volume object (normalizes to float [0, 1])
4. Call `resetVis()` to build scene

**Note:** This is an **async operation** (file reading is non-blocking).

```javascript
function readFile(){
    let reader = new FileReader();
    reader.onloadend = function () {
        let data = new Uint16Array(reader.result);
        volume = new Volume(data);
        resetVis();  // Build scene with new volume
    };
    reader.readAsArrayBuffer(fileInput.files[0]);
}
```

### `resetVis()` - Scene Setup (lines 83–116)

**What happens:**
1. Create empty Three.js scene + camera
2. Create 3D texture from volume data
3. Load and initialize RaycasterShader (this is async!)
4. Restore editor state (so you don't lose color/iso-value)
5. Create bounding box mesh with raycaster material
6. Set up orbit camera
7. Update histogram
8. Start render loop

**Critical code:**
```javascript
async function resetVis(){
    // New scene and camera
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, canvasWidth / canvasHeight, 0.1, 1000);
    
    // Create 3D texture from voxels
    const volumeTexture = new THREE.Data3DTexture(volume.voxels, volume.width, volume.height, volume.depth);
    volumeTexture.format = THREE.RedFormat;        // Single channel (density)
    volumeTexture.type = THREE.FloatType;          // 32-bit float
    volumeTexture.minFilter = THREE.LinearFilter;  // Interpolate between voxels
    volumeTexture.magFilter = THREE.LinearFilter;
    volumeTexture.wrapS = THREE.ClampToEdgeWrapping;  // Don't tile
    volumeTexture.wrapT = THREE.ClampToEdgeWrapping;
    volumeTexture.wrapR = THREE.ClampToEdgeWrapping;
    volumeTexture.needsUpdate = true;
    
    // Load shader and set uniforms
    const volumeSize = new THREE.Vector3(volume.width, volume.height, volume.depth);
    raycasterShader = new RaycasterShader(volumeTexture, volumeSize);
    await raycasterShader.load();  // ← ASYNC! Must wait
    
    // Restore editor state from previous volume (important!)
    raycasterShader.setIsoValue(editor.isoValue);
    raycasterShader.setSurfaceColor(editor.currentColor.r, editor.currentColor.g, editor.currentColor.b);
    raycasterShader.setCompositingMode(editor.currentMode);
    raycasterShader.setAlpha(editor.currentAlpha);
    
    // Create bounding box mesh
    const boxGeometry = new THREE.BoxGeometry(volume.width, volume.height, volume.depth);
    const mesh = new THREE.Mesh(boxGeometry, raycasterShader.material);
    scene.add(mesh);
    
    // Set up camera orbiting
    orbitCamera = new OrbitCamera(camera, new THREE.Vector3(0,0,0), 2*volume.max, renderer.domElement);
    
    // Update histogram
    histogram.update(volume);
    
    // Start paint loop
    requestAnimationFrame(paint);
}
```

### `paint()` - Render Loop (lines 118–124)

**What happens:**
1. Called every frame (~60 FPS on most displays)
2. Renders the scene with current camera
3. Recursively schedules itself for next frame

**Code:**
```javascript
function paint(){
    if (volume) {  // Only render if volume is loaded
        renderer.render(scene, camera);
    }
}
```

**Note:** The camera updates itself (via `OrbitCamera.#updateCamera()` which calls `requestAnimationFrame(paint)`), so the paint loop is driven by mouse interaction + scroll wheel.

---

## Data Flow Diagram

```
User uploads .dat file
    ↓
<input type="file"> change event
    ↓
readFile() triggered
    ↓
FileReader reads binary data → Uint16Array
    ↓
Volume constructor normalizes data
    ↓
resetVis() called
    ├─ Create Three.js scene
    ├─ Create 3D texture from volume.voxels
    ├─ Load raycaster shader (async)
    ├─ Restore editor state
    ├─ Create mesh + material
    ├─ Set up orbit camera
    └─ requestAnimationFrame(paint)
    ↓
paint() called every ~16ms (60 FPS)
    ↓
renderer.render(scene, camera)
    ↓
GPU executes raycaster fragment shader
    ↓
Display on screen
    ↓
User moves mouse / scroll wheel
    ↓
OrbitCamera event listener fires
    ↓
OrbitCamera.#updateCamera() updates camera position
    ↓
Calls requestAnimationFrame(paint) → loop repeats
```

---

## 🔧 Adjustable Settings for Demos/Presentations

### Canvas Sizing:
- **Current** (lines 28–31):
  ```javascript
  const maxWidth = window.innerWidth * 0.70;
  const maxHeight = window.innerHeight * 0.68;
  canvasWidth = Math.min(maxWidth, maxHeight * 1.3);
  canvasHeight = Math.min(maxHeight, canvasWidth / 1.3);
  ```
  - 70% of window width, 68% of window height
  - Aspect ratio locked to 1.3:1 (landscape bias)

- **For full-screen viewer** (hide controls):
  ```javascript
  canvasWidth = window.innerWidth * 0.95;   // 95% of screen
  canvasHeight = window.innerHeight * 0.85; // 85% (leave room for title)
  ```
  - Great for dramatic demo on projector

- **For controls-focused demo**:
  ```javascript
  canvasWidth = window.innerWidth * 0.55;   // Smaller viewer
  canvasHeight = window.innerHeight * 0.65;
  ```
  - Emphasizes control panel and histogram

### Initial Camera Radius:
- **Current** (line 107):
  ```javascript
  orbitCamera = new OrbitCamera(camera, new THREE.Vector3(0,0,0), 2*volume.max, renderer.domElement);
  ```
  - `2*volume.max` = initial distance from center

- **To zoom in initially**:
  ```javascript
  orbitCamera = new OrbitCamera(camera, new THREE.Vector3(0,0,0), 1.5*volume.max, renderer.domElement);
  ```
  - Closer initial view, more detail visible

- **To zoom out initially**:
  ```javascript
  orbitCamera = new OrbitCamera(camera, new THREE.Vector3(0,0,0), 3*volume.max, renderer.domElement);
  ```
  - Broader context view

- **For demo**: Start at 2.5*volume.max if you want to show overall structure first, then zoom in interactively

### Camera Clipping Planes:
- **Current** (line 85):
  ```javascript
  camera = new THREE.PerspectiveCamera(75, canvasWidth / canvasHeight, 0.1, 1000);
  ```
  - Near plane: 0.1, far plane: 1000
  - Prevents clipping for typical volumes

- **For extreme zoom (close-up inspection)**:
  ```javascript
  camera = new THREE.PerspectiveCamera(75, canvasWidth / canvasHeight, 0.001, 10000);
  ```
  - Allows closer approach

- **For normal demo**: Keep 0.1 and 1000 (standard)

### Texture Filtering (visual quality):
- **Current** (lines 96–99):
  ```javascript
  volumeTexture.minFilter = THREE.LinearFilter;
  volumeTexture.magFilter = THREE.LinearFilter;
  ```
  - Linear interpolation (smooth sampling)

- **For pixel-perfect voxel display**:
  ```javascript
  volumeTexture.minFilter = THREE.NearestFilter;
  volumeTexture.magFilter = THREE.NearestFilter;
  ```
  - No interpolation, crisp boundaries (slower, blockier)

- **For demo**: Linear filter looks smoother and more professional

### Perspective Field of View:
- **Current** (line 85): FOV = 75°
  - Standard wide angle

- **To zoom in perceptually** (without changing camera):
  ```javascript
  camera = new THREE.PerspectiveCamera(45, canvasWidth / canvasHeight, 0.1, 1000);
  ```
  - Smaller FOV = narrower field, zoomed-in feeling

- **To zoom out perceptually**:
  ```javascript
  camera = new THREE.PerspectiveCamera(100, canvasWidth / canvasHeight, 0.1, 1000);
  ```

- **For demo**: 75° is standard. Only change if you want extreme "telescope" or "wide-angle" effect

---

## Potential Gotchas & Things to Watch

### 🚨 **Async shader loading not awaited properly**
- **Problem** (line 95):
  ```javascript
  async function resetVis(){
      ...
      await raycasterShader.load();  // ← Must wait for this
      ...
  }
  ```
  - If you forget the `await`, shader strings might still be loading when rendering starts
  - Rendering fails silently (black screen or blank texture)

- **Watch**: Always use `async`/`await` for `resetVis()`. If you see black screen after loading file, check console for shader loading errors.

### 🚨 **Multiple volume loads in quick succession**
- **Problem**: If user loads 3 files rapidly (click upload → click again → click again), multiple `resetVis()` calls might queue up
- **Current Three.js behavior**: Handles this gracefully (overwrites previous scene)
- **But**: Old textures aren't freed immediately (GPU memory leak over many loads)
- **Watch**: In demo, load volumes one at a time with pauses. Don't rapid-fire load tests.
- **Optional fix**: Explicitly dispose old resources:
  ```javascript
  if (raycasterShader && raycasterShader.material) {
      raycasterShader.material.dispose();
  }
  ```

### 🚨 **Editor state restored but callbacks might not fire**
- **Problem** (lines 101–104):
  ```javascript
  raycasterShader.setIsoValue(editor.isoValue);
  raycasterShader.setSurfaceColor(editor.currentColor.r, editor.currentColor.g, editor.currentColor.b);
  raycasterShader.setCompositingMode(editor.currentMode);
  raycasterShader.setAlpha(editor.currentAlpha);
  ```
  - These are direct setter calls, not through editor callbacks
  - Uniforms are set ✓, but no repaint is triggered
  - Shader has new uniforms but screen hasn't updated yet

- **Fix** (line 114): `requestAnimationFrame(paint)` is called right after, so it's painted
- **Watch**: Color/iso-value/mode should instantly apply when loading new volume. If not, first frame doesn't paint.

### 🚨 **Volume center assumed at (0,0,0)**
- **Problem** (line 107):
  ```javascript
  orbitCamera = new OrbitCamera(camera, new THREE.Vector3(0,0,0), ...);
  ```
  - Camera always orbits around origin
  - Mesh geometry is centered at origin (Three.js default)
  - Raycaster box is also centered at origin (shader logic)
- **If data is off-center**: Everything misaligns
- **Watch**: Assume your `.dat` volumes are centered. If you add non-centered data, need to offset mesh position.

### 🚨 **Render loop doesn't check for errors**
- **Problem** (lines 118–124):
  ```javascript
  function paint(){
      if (volume) {
          renderer.render(scene, camera);
      }
  }
  ```
  - No error handling if renderer fails
  - If shader has syntax error, GPU just stops rendering silently
- **Watch**: Open browser DevTools > Console to see WebGL errors. If screen goes black, check console for "WebGL Error: Shader compilation failed"

### 🚨 **No double-buffering or vsync control**
- **Problem**: `renderer.render()` renders immediately (no vsync)
- **On 60 Hz monitor**: Should see 60 FPS
- **On 120 Hz monitor**: Might render faster, causing tearing (visual artifact)
- **Not a real issue**: Modern browsers handle this, but FPS might vary

### 🚨 **Camera.lookAt() recalculates every frame**
- **Problem**: `OrbitCamera` calls `camera.lookAt()` in every `#updateCamera()` (line 47 in camera.js)
- **Small overhead**: Inverse matrix calculation
- **Not noticeable**: Unless rendering 1000+ objects
- **Watch**: Performance is fine for single volume

### 🚨 **File reader only accepts files from input element**
- **Problem** (lines 74–78):
  ```javascript
  fileInput = document.getElementById("upload");
  fileInput.addEventListener('change', readFile);
  reader.readAsArrayBuffer(fileInput.files[0]);
  ```
  - Can't programmatically set file (security restriction)
  - Can't load files from URL or drag-drop (not implemented)
- **For demo**: Only use the file input to load volumes. Can't automate file loading.

### 🚨 **No safeguard against huge files**
- **Problem**: If someone uploads a 1GB file, app tries to allocate 1GB GPU memory
  - Freezes browser, might crash
- **Typical volume**: 256³ × 2 bytes = ~33 MB (safe)
- **But**: 1024³ × 2 bytes = ~2 GB (will crash)
- **Watch**: Demo volumes should be 256³ to 512³ max
- **Optional safeguard**:
  ```javascript
  if (volume.width > 512 || volume.height > 512 || volume.depth > 512) {
      alert("Volume too large! Max 512³");
      return;
  }
  ```

---

## Integration Checklist (Before Demo)

- [ ] Test file loading with actual `.dat` file
- [ ] Check canvas size on demo monitor/projector
- [ ] Verify camera zoom is comfortable (can see whole volume + details)
- [ ] Check that editor state is restored when loading new volume
- [ ] Open DevTools console to confirm no errors
- [ ] Test on actual presentation hardware (screen size might change sizing calculations)
- [ ] Confirm paint loop is running (no black screen, no stutter)

---

## Summary

**Key entry points:**
- `init()`: Called on page load, sets up UI
- `readFile()`: Called on file upload, loads volume data
- `resetVis()`: Called after volume loads, builds 3D scene (this is where heavy lifting happens)
- `paint()`: Called every frame, renders scene

**Most likely things to adjust for demo:**
1. Canvas sizing (lines 28–31) — show more/less of the volume viewer
2. Initial camera distance (line 107) — zoom in/out initially
3. Add startup console logging (lines 66–67) to confirm volume loads

**You've modified:**
- Called histogram.update() after loading (line 104)
- Connected editor callbacks (lines 45–55)
- Restored editor state on new volume (lines 101–104)

**Framework provides:**
- File I/O, Three.js setup, scene graph, camera, render loop
- You added: Raycasting shader, interactive controls, histogram visualization
