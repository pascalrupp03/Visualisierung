# Änderungsprotokoll / Changelog

## Task 1: Direct Volume Rendering (Raycasting mit MIP)

### Neue Dateien

| Datei | Beschreibung |
|-------|--------------|
| `shaders/raycaster_vert.essl` | Vertex Shader: transformiert Vertices in World-Space und übergibt `vWorldPosition` an den Fragment Shader. |
| `shaders/raycaster_frag.essl` | Fragment Shader: Implementiert Single-Pass Raycasting mit branchless Slab-Method (Ray/AABB Intersection) und Maximum Intensity Projection (MIP). |
| `js/raycasterShader.js` | Shader-Klasse (erbt von `Shader`): setzt Uniforms `uVolumeTexture` (3D Textur) und `uVolumeSize` (Volumen-Dimensionen). |

### Modifizierte Dateien

| Datei | Änderung |
|-------|----------|
| `js/visvu.js` | Test-Shader durch Raycaster ersetzt: erstellt `THREE.Data3DTexture` aus Volume-Daten, initialisiert `RaycasterShader`, rendert Bounding-Box-Geometrie. |
| `index.html` | `<script src="js/raycasterShader.js">` hinzugefügt. |

### Technische Details

- **Methode**: Single-Pass Raycasting (Box-Geometrie als Proxy)
- **Ray/AABB Intersection**: Branchless Slab Method nach Tavian Barnes (precomputed inverse direction, nur min/max, keine Branches/Divisions)
- **Compositing**: MIP — maximaler Dichtewert entlang des Strahls bestimmt Fragmentfarbe
- **Sampling Rate**: `diagonal / (2 * maxDimension)` ≈ 1 Sample pro Voxel
- **Texturkoordinaten**: World-Position → [0,1]³ via `(pos + size*0.5) / size`
- **D3.js**: Nicht verwendet (nicht relevant für GPU-Rendering)

---

## Task 2: Density Histogram

*(noch nicht implementiert)*

## Task 3: First-Hit Compositing

*(noch nicht implementiert)*

## Task 4: Gradients and Shading

*(noch nicht implementiert)*

## Task 5: Interactive Editor

*(noch nicht implementiert)*

## Task 6: Transfer Function

*(noch nicht implementiert)*
