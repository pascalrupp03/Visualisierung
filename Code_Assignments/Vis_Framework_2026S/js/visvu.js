/**
 * Vis 1 Task 1 Framework
 * Copyright (C) TU Wien
 *   Institute of Visual Computing and Human-Centered Technology
 *   Research Unit of Computer Graphics
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are not permitted.
 *
 * Main script for VisVU exercise. Loads the volume, initializes the scene, and contains the paint function.
 *
 * @author Manuela Waldner
 * @author Laura Luidolt
 * @author Diana Schalko
 */
let renderer, camera, scene, orbitCamera;
let container, fileInput, volume;
let shader = null;
let mesh = null;
let canvasWidth, canvasHeight;
let compositingMode = "mip";
let fpsLabel = null;
let fpsFrames = 0;
let fpsLastUpdate = performance.now();
let histogramSvg = null;
let histogramX = null;
let histogramY = null;
let histogramHeight = 220;
let histogramWidth = 340;

const colorPalette = [
    "#f4a261", "#e76f51", "#e63946", "#d62828", "#f77f00",
    "#ffb703", "#84a98c", "#2a9d8f", "#43aa8b", "#4d908e",
    "#277da1", "#577590", "#4361ee", "#3a0ca3", "#6d597a",
    "#b56576", "#f72585", "#b5179e", "#7209b7", "#4895ef"
];

const editorState = {
    stepSize: 0.75,
    isoValue: 0.3,
    surfaceColor: "#f4a261",
    surfaces: []
};

/**
 * Initialize the volume rendering framework.
 * Sets up WebGL renderer, camera, scene, and file input listener.
 */
function init() {
    container = document.getElementById("viewContainer");
    canvasWidth = window.innerWidth * 0.7;
    canvasHeight = window.innerHeight * 0.7;

    // Create WebGL renderer
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.debug.checkShaderErrors = true;
    renderer.setSize(canvasWidth, canvasHeight);
    renderer.setClearColor(0x000000);
    container.appendChild(renderer.domElement);
    createFpsOverlay();

    // File loader
    fileInput = document.getElementById("upload");
    fileInput.addEventListener("change", loadVolume);

    // Compositing mode buttons
    const btnMIP = document.getElementById("btnMIP");
    const btnFirstHit = document.getElementById("btnFirstHit");

    btnMIP.addEventListener("click", () => {
        setCompositingMode("mip");
        btnMIP.classList.add("active");
        btnFirstHit.classList.remove("active");
    });

    btnFirstHit.addEventListener("click", () => {
        setCompositingMode("firsthit");
        btnFirstHit.classList.add("active");
        btnMIP.classList.remove("active");
    });

    buildEditorSkeleton();

    // Start animation loop
    requestAnimationFrame(render);
}

/**
 * Load and parse a volume dataset from a .dat file.
 * @param {Event} event - File input change event
 */
async function loadVolume(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    const reader = new FileReader();

    reader.onload = async (e) => {
        const data = e.target.result;
        volume = new Volume(data);

        console.log("Volume loaded:", volume.width, "×", volume.height, "×", volume.depth);

        editorState.isoValue = 0.3;
        editorState.stepSize = 0.75;
        editorState.surfaceColor = colorPalette[0];
        editorState.surfaces = [];

        renderHistogram(volume.voxels);
        syncEditorWidgets();

        // Setup scene
        await setupScene();
    };

    reader.readAsArrayBuffer(file);
}

/**
 * Setup or update the 3D scene with volume rendering mesh.
 * Creates scene, camera, shader, and OrbitCamera controls.
 */
async function setupScene() {
    // Clear old scene
    if (scene) {
        scene.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        });
    }

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, canvasWidth / canvasHeight, 0.1, 1000);

    // Create volume shader
    shader = new VolumeShader(volume);
    await shader.load();
    shader.setCompositingMode(compositingMode);
    shader.setStepSize(editorState.stepSize);
    shader.setIsoValue(editorState.isoValue);
    shader.setSurfaceColor(hexToVector3(editorState.surfaceColor));
    shader.setSurfaceList(editorState.surfaces);

    // Create mesh with ACTUAL shader dimensions (considers downsampling)
    const geom = new THREE.BoxGeometry(shader.dimX, shader.dimY, shader.dimZ);
    mesh = new THREE.Mesh(geom, shader.material);
    scene.add(mesh);

    // Setup camera with actual dimensions
    const maxDim = Math.max(shader.dimX, shader.dimY, shader.dimZ);
    orbitCamera = new OrbitCamera(camera, new THREE.Vector3(0, 0, 0), 2.5 * maxDim, renderer.domElement);

    renderer.compile(scene, camera);
    logShaderDiagnostics();
    console.log("Shader compile check completed (see browser console for diagnostics).");
    console.log("Scene setup complete");
}

/**
 * Main animation loop - updates camera and renders the scene.
 * Called continuously via requestAnimationFrame.
 */
function render() {
    requestAnimationFrame(render);

    if (volume && shader && orbitCamera) {
        // Update camera
        orbitCamera.update();
        shader.updateCamera(camera.position);

        // Render
        renderer.render(scene, camera);

        fpsFrames++;
        const now = performance.now();
        if (now - fpsLastUpdate > 500.0) {
            const fps = (fpsFrames * 1000.0) / (now - fpsLastUpdate);
            if (fpsLabel) {
                fpsLabel.textContent = "FPS: " + fps.toFixed(1);
            }
            fpsFrames = 0;
            fpsLastUpdate = now;
        }
    }
}

/**
 * Switch between compositing modes (MIP vs First-Hit).
 * @param {string} mode - 'mip' (Maximum Intensity Projection) or 'firsthit' (First-Hit Compositing)
 */
function setCompositingMode(mode) {
    if (mode === "mip" || mode === "firsthit") {
        compositingMode = mode;
        if (shader) {
            shader.setCompositingMode(mode);
            console.log(`Switched to ${mode.toUpperCase()} compositing mode`);
        }

        const firstHitControls = document.getElementById("firstHitControls");
        if (firstHitControls) {
            firstHitControls.style.display = mode === "firsthit" ? "block" : "none";
        }
    }
}

function createFpsOverlay() {
    fpsLabel = document.createElement("div");
    fpsLabel.id = "fpsCounter";
    fpsLabel.style.position = "absolute";
    fpsLabel.style.left = "12px";
    fpsLabel.style.top = "12px";
    fpsLabel.style.padding = "4px 8px";
    fpsLabel.style.fontFamily = "monospace";
    fpsLabel.style.fontSize = "12px";
    fpsLabel.style.background = "rgba(0,0,0,0.55)";
    fpsLabel.style.color = "#f2f2f2";
    fpsLabel.style.border = "1px solid #666";
    fpsLabel.style.borderRadius = "4px";
    fpsLabel.textContent = "FPS: --";

    const parent = document.getElementById("viewContainer");
    parent.style.position = "relative";
    parent.appendChild(fpsLabel);
}

function buildEditorSkeleton() {
    const tf = d3.select("#tfContainer");
    tf.selectAll("*").remove();

    tf.append("h3").text("Volume Controls");

    const controls = tf.append("div").attr("id", "controlPanel");
    controls.append("label").attr("for", "stepSizeInput").text("Sampling Step Size");
    controls.append("input")
        .attr("id", "stepSizeInput")
        .attr("type", "range")
        .attr("min", 0.2)
        .attr("max", 2.0)
        .attr("step", 0.05)
        .on("input", (event) => {
            editorState.stepSize = Number(event.target.value);
            d3.select("#stepSizeValue").text(editorState.stepSize.toFixed(2));
            if (shader) {
                shader.setStepSize(editorState.stepSize);
            }
        });
    controls.append("span").attr("id", "stepSizeValue");

    controls.append("label").attr("for", "isoInput").text("Iso Value");
    controls.append("input")
        .attr("id", "isoInput")
        .attr("type", "range")
        .attr("min", 0.0)
        .attr("max", 1.0)
        .attr("step", 0.001)
        .on("input", (event) => {
            editorState.isoValue = Number(event.target.value);
            d3.select("#isoValueText").text(editorState.isoValue.toFixed(3));
            updateIsoMarker();
            if (shader) {
                shader.setIsoValue(editorState.isoValue);
            }
        });
    controls.append("span").attr("id", "isoValueText");

    const firstHitControls = tf.append("div").attr("id", "firstHitControls");
    firstHitControls.append("label").text("Surface Color");
    const colorPicker = firstHitControls.append("select")
        .attr("id", "surfaceColorSelect")
        .on("change", (event) => {
            editorState.surfaceColor = event.target.value;
            if (shader) {
                shader.setSurfaceColor(hexToVector3(editorState.surfaceColor));
            }
        });

    colorPalette.forEach((hex, idx) => {
        colorPicker.append("option")
            .attr("value", hex)
            .text("Color " + (idx + 1) + " (" + hex + ")");
    });

    firstHitControls.append("label").text("Transfer Function Surfaces");
    firstHitControls.append("button")
        .attr("id", "addSurfaceBtn")
        .text("Add Surface")
        .on("click", () => {
            if (editorState.surfaces.length >= 20) {
                return;
            }
            editorState.surfaces.push({
                iso: editorState.isoValue,
                color: editorState.surfaceColor,
                opacity: 1.0
            });
            refreshSurfaceListUI();
            if (shader) {
                shader.setSurfaceList(editorState.surfaces);
            }
        });

    firstHitControls.append("div").attr("id", "surfaceList");

    tf.append("h3").text("Density Histogram");
    histogramSvg = tf.append("svg")
        .attr("id", "histogramSvg")
        .attr("width", histogramWidth)
        .attr("height", histogramHeight);

    const margin = { top: 10, right: 10, bottom: 28, left: 44 };
    histogramX = d3.scaleLinear().domain([0, 1]).range([margin.left, histogramWidth - margin.right]);
    histogramY = d3.scaleLinear().domain([0, 1]).range([histogramHeight - margin.bottom, margin.top]);

    histogramSvg.append("g").attr("id", "bars");
    histogramSvg.append("g")
        .attr("id", "xAxis")
        .attr("transform", "translate(0," + (histogramHeight - margin.bottom) + ")");
    histogramSvg.append("g")
        .attr("id", "yAxis")
        .attr("transform", "translate(" + margin.left + ",0)");

    histogramSvg.append("line")
        .attr("id", "isoMarker")
        .attr("y1", margin.top)
        .attr("y2", histogramHeight - margin.bottom)
        .attr("stroke", "#f72585")
        .attr("stroke-width", 2.0);

    histogramSvg.append("text")
        .attr("id", "isoMarkerLabel")
        .attr("y", margin.top + 12)
        .attr("fill", "#f72585")
        .attr("font-size", "11px")
        .attr("text-anchor", "middle")
        .text("iso");

    setCompositingMode(compositingMode);
    syncEditorWidgets();
}

function syncEditorWidgets() {
    const stepInput = d3.select("#stepSizeInput");
    if (!stepInput.empty()) {
        stepInput.property("value", editorState.stepSize);
        d3.select("#stepSizeValue").text(editorState.stepSize.toFixed(2));
    }

    const isoInput = d3.select("#isoInput");
    if (!isoInput.empty()) {
        isoInput.property("value", editorState.isoValue);
        d3.select("#isoValueText").text(editorState.isoValue.toFixed(3));
    }

    const colorSelect = d3.select("#surfaceColorSelect");
    if (!colorSelect.empty()) {
        colorSelect.property("value", editorState.surfaceColor);
    }

    refreshSurfaceListUI();
    updateIsoMarker();
}

function refreshSurfaceListUI() {
    const surfaceList = d3.select("#surfaceList");
    if (surfaceList.empty()) {
        return;
    }

    surfaceList.selectAll("*").remove();

    editorState.surfaces.forEach((surface, idx) => {
        const row = surfaceList.append("div").attr("class", "surfaceRow");
        row.append("span").attr("class", "surfaceLabel").text("#" + (idx + 1));

        row.append("input")
            .attr("type", "range")
            .attr("min", 0.0)
            .attr("max", 1.0)
            .attr("step", 0.001)
            .attr("value", surface.iso)
            .on("input", (event) => {
                editorState.surfaces[idx].iso = Number(event.target.value);
                if (shader) {
                    shader.setSurfaceList(editorState.surfaces);
                }
            });

        row.append("select")
            .on("change", (event) => {
                editorState.surfaces[idx].color = event.target.value;
                if (shader) {
                    shader.setSurfaceList(editorState.surfaces);
                }
            })
            .selectAll("option")
            .data(colorPalette)
            .enter()
            .append("option")
            .attr("value", d => d)
            .property("selected", d => d === surface.color)
            .text(d => d);

        row.append("input")
            .attr("type", "range")
            .attr("min", 0.05)
            .attr("max", 1.0)
            .attr("step", 0.05)
            .attr("value", surface.opacity)
            .on("input", (event) => {
                editorState.surfaces[idx].opacity = Number(event.target.value);
                if (shader) {
                    shader.setSurfaceList(editorState.surfaces);
                }
            });

        row.append("button")
            .attr("class", "surfaceRemove")
            .text("Remove")
            .on("click", () => {
                editorState.surfaces.splice(idx, 1);
                refreshSurfaceListUI();
                if (shader) {
                    shader.setSurfaceList(editorState.surfaces);
                }
            });
    });
}

function renderHistogram(voxels) {
    if (!histogramSvg || !voxels) {
        return;
    }

    const margin = { top: 10, right: 10, bottom: 28, left: 44 };
    const values = Array.from(voxels);
    const minV = d3.min(values);
    const maxV = d3.max(values);
    const histMin = Number.isFinite(minV) ? minV : 0.0;
    const histMax = Number.isFinite(maxV) ? maxV : 1.0;
    const xMax = histMax > histMin ? histMax : histMin + 1.0;

    histogramX.domain([histMin, xMax]);

    const histogram = d3.bin()
        .domain([histMin, xMax])
        .thresholds(64);
    const bins = histogram(values);

    const maxCount = d3.max(bins, d => d.length) || 1;
    histogramY.domain([0, maxCount]);

    histogramSvg.select("#xAxis")
        .transition()
        .duration(450)
        .call(d3.axisBottom(histogramX).ticks(6));

    histogramSvg.select("#yAxis")
        .transition()
        .duration(450)
        .call(d3.axisLeft(histogramY).ticks(6).tickFormat(d3.format("~s")));

    const bars = histogramSvg.select("#bars")
        .selectAll("rect")
        .data(bins);

    bars.exit()
        .transition()
        .duration(250)
        .attr("y", histogramHeight - margin.bottom)
        .attr("height", 0)
        .remove();

    bars.enter()
        .append("rect")
        .attr("x", d => histogramX(d.x0))
        .attr("width", d => Math.max(1.0, histogramX(d.x1) - histogramX(d.x0) - 1.0))
        .attr("y", histogramHeight - margin.bottom)
        .attr("height", 0)
        .attr("fill", "#4ea8de")
        .merge(bars)
        .transition()
        .duration(550)
        .attr("x", d => histogramX(d.x0))
        .attr("width", d => Math.max(1.0, histogramX(d.x1) - histogramX(d.x0) - 1.0))
        .attr("y", d => histogramY(d.length))
        .attr("height", d => Math.max(0.0, histogramHeight - margin.bottom - histogramY(d.length)));

    updateIsoMarker();
}

function updateIsoMarker() {
    if (!histogramSvg || !histogramX) {
        return;
    }
    const x = histogramX(editorState.isoValue);
    histogramSvg.select("#isoMarker")
        .transition()
        .duration(200)
        .attr("x1", x)
        .attr("x2", x);

    histogramSvg.select("#isoMarkerLabel")
        .transition()
        .duration(200)
        .attr("x", x)
        .text("iso " + editorState.isoValue.toFixed(3));
}

function hexToVector3(hex) {
    const color = new THREE.Color(hex);
    return new THREE.Vector3(color.r, color.g, color.b);
}

function logShaderDiagnostics() {
    if (!renderer || !renderer.info || !renderer.info.programs) {
        return;
    }

    renderer.info.programs.forEach((programInfo, idx) => {
        if (programInfo && programInfo.diagnostics) {
            const diagnostics = programInfo.diagnostics;
            if (diagnostics.runnable === false) {
                console.error("Shader program", idx, "failed.");
                if (diagnostics.vertexShader && diagnostics.vertexShader.log) {
                    console.error("Vertex shader log:\n" + diagnostics.vertexShader.log);
                }
                if (diagnostics.fragmentShader && diagnostics.fragmentShader.log) {
                    console.error("Fragment shader log:\n" + diagnostics.fragmentShader.log);
                }
            }
        }
    });
}

/**
 * Volume shader class - proper implementation with size limiting
 */
class VolumeShader extends Shader {
    /**
     * Create a volume rendering shader with automatic GPU memory management.
     * Downsamples volume to 128³ max if needed. Supports both MIP and First-Hit compositing.
     * @param {Volume} volume - Volume object with voxels, width, height, depth
     */
    constructor(volume) {
        super("volume_vert", "volume_frag");
        this.volume = volume;

        // Downsample if volume is too large for GPU
        const maxDim = 128;
        let voxels = volume.voxels;
        let w = volume.width, h = volume.height, d = volume.depth;

        if (w > maxDim || h > maxDim || d > maxDim) {
            const scale = Math.ceil(Math.max(w, h, d) / maxDim);
            const nw = Math.ceil(w / scale);
            const nh = Math.ceil(h / scale);
            const nd = Math.ceil(d / scale);
            const downsampled = new Float32Array(nw * nh * nd);

            for (let z = 0; z < nd; z++) {
                for (let y = 0; y < nh; y++) {
                    for (let x = 0; x < nw; x++) {
                        const oz = Math.min(z * scale, d - 1);
                        const oy = Math.min(y * scale, h - 1);
                        const ox = Math.min(x * scale, w - 1);
                        const idx = oz * h * w + oy * w + ox;
                        downsampled[z * nh * nw + y * nw + x] = voxels[idx];
                    }
                }
            }
            voxels = downsampled;
            w = nw; h = nh; d = nd;
        }

        // Store final dimensions for mesh creation
        this.dimX = w;
        this.dimY = h;
        this.dimZ = d;

        // Create 3D texture with downsampled data
        const texture = new THREE.Data3DTexture(voxels, w, h, d);
        texture.format = THREE.RedFormat;
        texture.type = THREE.FloatType;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.unpackAlignment = 1;
        texture.needsUpdate = true;

        this.texture = texture;
        this.boxMin = new THREE.Vector3(-w / 2, -h / 2, -d / 2);
        this.boxMax = new THREE.Vector3(w / 2, h / 2, d / 2);
    }

    async load() {
        await super.load();

        this.material.side = THREE.BackSide;
        this.material.depthWrite = false;
        this.material.transparent = true;

        this.setUniform("volumeData", this.texture);
        this.setUniform("boxMin", this.boxMin.clone());
        this.setUniform("boxMax", this.boxMax.clone());
        this.setUniform("cameraPos", new THREE.Vector3(0, 0, 0));
        this.setUniform("stepSize", 0.75);
        this.setUniform("compositingMode", 0.0);
        this.setUniform("isoValue", 0.3);
        this.setUniform("surfaceColor", new THREE.Vector3(0.956, 0.635, 0.380));
        this.setUniform("texelSize", new THREE.Vector3(1.0 / this.dimX, 1.0 / this.dimY, 1.0 / this.dimZ));
        this.setUniform("lightDir", new THREE.Vector3(0.6, 0.6, 1.0).normalize());
        this.setUniform("ambientStrength", 0.25);
        this.setUniform("diffuseStrength", 0.75);
        this.setUniform("specularStrength", 0.20);
        this.setUniform("shininess", 28.0);
        this.setUniform("surfaceCount", 0);

        const isoArray = new Float32Array(20);
        const colorArray = [];
        for (let i = 0; i < 20; i++) {
            colorArray.push(new THREE.Vector4(0, 0, 0, 0));
        }
        this.material.uniforms.surfaceIsoValues = new THREE.Uniform(isoArray);
        this.material.uniforms.surfaceColors = new THREE.Uniform(colorArray);
    }

    setCompositingMode(mode) {
        this.material.uniforms.compositingMode.value = mode === "mip" ? 0.0 : 1.0;
    }

    setStepSize(stepSize) {
        this.material.uniforms.stepSize.value = Math.max(0.05, stepSize);
    }

    setIsoValue(value) {
        this.material.uniforms.isoValue.value = Math.min(1.0, Math.max(0.0, value));
    }

    setSurfaceColor(color) {
        this.material.uniforms.surfaceColor.value.copy(color);
    }

    setSurfaceList(surfaces) {
        const count = Math.min(20, surfaces.length);
        this.material.uniforms.surfaceCount.value = count;

        const isoValues = this.material.uniforms.surfaceIsoValues.value;
        const colors = this.material.uniforms.surfaceColors.value;

        for (let i = 0; i < 20; i++) {
            if (i < count) {
                const surface = surfaces[i];
                isoValues[i] = surface.iso;
                const c = new THREE.Color(surface.color);
                colors[i].set(c.r, c.g, c.b, surface.opacity);
            } else {
                isoValues[i] = 0.0;
                colors[i].set(0.0, 0.0, 0.0, 0.0);
            }
        }

        this.material.uniforms.surfaceIsoValues.needsUpdate = true;
        this.material.uniforms.surfaceColors.needsUpdate = true;
    }

    /**
     * Update the camera position uniform in the shader.
     * Called each frame by the render loop.
     * @param {THREE.Vector3} pos - Camera world position
     */
    updateCamera(pos) {
        if (this.material && this.material.uniforms.cameraPos) {
            this.material.uniforms.cameraPos.value.copy(pos);
        }
    }
}

