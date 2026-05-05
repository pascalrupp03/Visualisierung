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

### Neue Dateien

| Datei | Beschreibung |
|-------|--------------|
| `js/histogram.js` | Histogram-Klasse: berechnet und rendert die Dichteverteilung des Volumens als Balkendiagramm mittels d3.js. |

### Modifizierte Dateien

| Datei | Änderung |
|-------|----------|
| `js/visvu.js` | `histogram`-Variable hinzugefügt, Initialisierung in `init()`, Aufruf von `histogram.update(volume)` in `resetVis()`. |
| `index.html` | `<script src="js/histogram.js">` hinzugefügt. |

### Technische Details

- **d3.bin()**: Berechnet 50 Bins über den Dichtebereich [0, 1] (aus d3-array)
- **d3.scaleSqrt()**: Wurzel-Skalierung für Y-Achse — macht auch kleine Bins gut lesbar bei stark unterschiedlichen Zählungen
- **d3.scaleLinear()**: Lineare X-Achse für Dichtewerte [0, 1]
- **d3.axisBottom() / d3.axisLeft()**: Achsen-Generatoren (aus d3-axis)
- **d3 Data Joins**: `.join(enter, update, exit)` Pattern (d3 v6+) für korrekte Datenbindung
- **Animated Transitions**: `.transition().duration(750)` auf Enter, Update und Exit für animierte Übergänge bei Datenwechsel
- **Skalierung**: Erster Bin (oft Hintergrund/Luft mit sehr hoher Zählung) wird bei Y-Domain übersprungen, damit restliche Bins lesbar bleiben

---

## Task 3: First-Hit Compositing

### Modifizierte Dateien

| Datei | Änderung |
|-------|----------|
| `shaders/raycaster_frag.essl` | First-Hit Compositing hinzugefügt: prüft ob Iso-Wert zwischen zwei aufeinanderfolgenden Samples liegt, lineare Interpolation der Hit-Position. Compositing-Modus über `uCompositingMode` Uniform steuerbar (0=MIP, 1=First-Hit). |
| `js/raycasterShader.js` | Neue Uniforms (`uIsoValue`, `uCompositingMode`, `uSurfaceColor`) und Setter-Methoden hinzugefügt. Default: First-Hit mit Iso=0.3, weiße Oberfläche. |

### Technische Details

- **Iso-Surface Detection**: Prüft bei jedem Schritt ob `prevDensity < isoValue <= density` (oder umgekehrt)
- **Lineare Interpolation**: `interpFactor = (isoValue - prevDensity) / (density - prevDensity)` → exakte Hit-Position zwischen den zwei Sample-Positionen
- **Compositing-Modes**: Beide erhalten (MIP=0, First-Hit=1), umschaltbar über Uniform
- **Surface Color**: Über Uniform `uSurfaceColor` konfigurierbar (vorbereitet für Task 5 Editor)
- **D3.js**: Nicht relevant (reiner Shader-Code)

---

## Task 4: Gradients and Shading

### Modifizierte Dateien

| Datei | Änderung |
|-------|----------|
| `shaders/raycaster_frag.essl` | `computeGradient()` Funktion (zentrale Differenzen) und `phongShading()` (Blinn-Phong) hinzugefügt. First-Hit gibt jetzt beleuchtete Oberfläche aus statt Position-als-Farbe. |

### Technische Details

- **Gradient (Normale)**: Zentrale Differenzen mit ε = 1 Voxel: `∇f = 0.5 * (f(x-ε)-f(x+ε), f(y-ε)-f(y+ε), f(z-ε)-f(z+ε))`
- **Shading**: Blinn-Phong mit Headlight (Licht = Kamerarichtung)
  - Ambient: ka=0.2
  - Diffuse: kd=0.7
  - Specular: ks=0.5, shininess=50
- **Lichtquelle**: Headlight (= View-Richtung), ergibt gleichmäßige Beleuchtung beim Rotieren
- **Surface Color**: Wird als `uSurfaceColor` Uniform an Phong übergeben (default: weiß)
- **Step Size**: `diagonal / (maxDim * 3.0)` — höhere Abtastrate reduziert Ring-/Banding-Artefakte

### Begründung der Parameterwahl

| Parameter | Wert | Begründung |
|-----------|------|------------|
| ka (ambient) | 0.2 | Niedrig genug damit Schattierungen erkennbar bleiben, hoch genug damit keine komplett schwarzen Bereiche entstehen |
| kd (diffuse) | 0.7 | Dominanter Term — sorgt dafür, dass die Oberflächenform klar erkennbar ist (Hauptanforderung laut Angabe) |
| ks (specular) | 0.5 | Mäßiger Glanz — gibt Plastizität ohne die Form zu überstrahlen |
| shininess | 50 | Mittelwert — erzeugt kompakte Highlights die organische Oberflächen (Knochen) gut darstellen |
| Lichtrichtung | Headlight (=View) | Garantiert immer beleuchtete Oberfläche unabhängig vom Kamerawinkel — kein "dunkle Seite" Problem |
| Step Size | diagonal/3N | Kompromiss zwischen Performance und Bildqualität — weniger Banding-Artefakte als diagonal/2N |

---

## Task 5: Interactive Editor

*(noch nicht implementiert)*

## Task 6: Transfer Function

*(noch nicht implementiert)*
