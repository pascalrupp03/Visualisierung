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
let container = null;
let fileInput = null;
let volume = null;
let volumeShader = null;
let mesh = null;
let histogram = null;
let canvasWidth, canvasHeight = 0;
let compositingMode = "mip";
let isPaintLoopRunning = false;
let renderSettings = { isoValue: 0.3, stepSize: 0.75 };
let isoInput = null;
let isoValueReadout = null;
let densityInput = null;
let densityReadout = null;

/**
 * Load all data and initialize UI here.
 */
function init() {
    container = document.getElementById("viewContainer");
    canvasWidth = window.innerWidth * 0.68;
    canvasHeight = window.innerHeight * 0.72;

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(canvasWidth, canvasHeight);
    renderer.setClearColor(0x000000);
    container.appendChild(renderer.domElement);

    fileInput = document.getElementById("upload");
    fileInput.addEventListener("change", readFile);

    histogram = new Histogram("tfContainer");
    histogram.setIsoChangeHandler((isoValue) => {
        renderSettings.isoValue = isoValue;
        if (isoInput) {
            isoInput.value = isoValue.toFixed(2);
        }
        if (isoValueReadout) {
            isoValueReadout.textContent = isoValue.toFixed(2);
        }
        applyRenderSettings();
    });
    histogram.setIsoValue(renderSettings.isoValue);
    createRenderControls();

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

    window.addEventListener("resize", onResize);
}

/**
 * Handles the file reader.
 */
function readFile() {
    const reader = new FileReader();
    reader.onloadend = function () {
        volume = new Volume(reader.result);
        histogram.update(volume.voxels);
        resetVis();
    };
    reader.readAsArrayBuffer(fileInput.files[0]);
}

/**
 * Construct the THREE.js scene when a new volume is loaded by the user.
 */
async function resetVis() {
    if (scene) {
        scene.traverse((obj) => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        });
    }

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, canvasWidth / canvasHeight, 0.1, 1000);

    volumeShader = new VolumeRenderShader(volume);
    await volumeShader.load();
    volumeShader.setCompositingMode(compositingMode);
    applyRenderSettings();

    mesh = new THREE.Mesh(
        new THREE.BoxGeometry(volumeShader.dimX, volumeShader.dimY, volumeShader.dimZ),
        volumeShader.material
    );
    scene.add(mesh);

    const maxDim = Math.max(volumeShader.dimX, volumeShader.dimY, volumeShader.dimZ);
    orbitCamera = new OrbitCamera(camera, new THREE.Vector3(0, 0, 0), 2.5 * maxDim, renderer.domElement);

    if (!isPaintLoopRunning) {
        isPaintLoopRunning = true;
        requestAnimationFrame(paint);
    }
}

/**
 * Render the scene and update all necessary shader information.
 */
function paint() {
    if (volume && scene && camera && orbitCamera && volumeShader) {
        orbitCamera.update();
        volumeShader.updateCamera(camera.position);
        renderer.render(scene, camera);
    }
    requestAnimationFrame(paint);
}

function setCompositingMode(mode) {
    compositingMode = mode;
    if (volumeShader) {
        volumeShader.setCompositingMode(mode);
        applyRenderSettings();
    }
}

function onResize() {
    canvasWidth = window.innerWidth * 0.68;
    canvasHeight = window.innerHeight * 0.72;
    renderer.setSize(canvasWidth, canvasHeight);
    if (camera) {
        camera.aspect = canvasWidth / canvasHeight;
        camera.updateProjectionMatrix();
    }
}

function createRenderControls() {
    const tfContainer = document.getElementById("tfContainer");
    const controls = document.createElement("div");
    controls.id = "renderControls";
    tfContainer.appendChild(controls);

    const isoRow = document.createElement("div");
    isoRow.className = "controlRow";
    const isoLabel = document.createElement("label");
    isoLabel.textContent = "Iso Value";
    isoInput = document.createElement("input");
    isoInput.type = "range";
    isoInput.min = "0";
    isoInput.max = "1";
    isoInput.step = "0.01";
    isoInput.value = renderSettings.isoValue.toFixed(2);
    isoValueReadout = document.createElement("span");
    isoValueReadout.textContent = renderSettings.isoValue.toFixed(2);
    isoInput.addEventListener("input", (event) => {
        const value = Number(event.target.value);
        renderSettings.isoValue = value;
        isoValueReadout.textContent = value.toFixed(2);
        histogram.setIsoValue(value);
        applyRenderSettings();
    });
    isoRow.appendChild(isoLabel);
    isoRow.appendChild(isoInput);
    isoRow.appendChild(isoValueReadout);
    controls.appendChild(isoRow);

    const densityRow = document.createElement("div");
    densityRow.className = "controlRow";
    const densityLabel = document.createElement("label");
    densityLabel.textContent = "Density";
    densityInput = document.createElement("input");
    densityInput.type = "range";
    densityInput.min = "0.2";
    densityInput.max = "2.0";
    densityInput.step = "0.05";
    densityInput.value = renderSettings.stepSize.toFixed(2);
    densityReadout = document.createElement("span");
    densityReadout.textContent = renderSettings.stepSize.toFixed(2);
    densityInput.addEventListener("input", (event) => {
        const value = Number(event.target.value);
        renderSettings.stepSize = value;
        densityReadout.textContent = value.toFixed(2);
        applyRenderSettings();
    });
    densityRow.appendChild(densityLabel);
    densityRow.appendChild(densityInput);
    densityRow.appendChild(densityReadout);
    controls.appendChild(densityRow);
}

function applyRenderSettings() {
    if (!volumeShader) {
        return;
    }
    volumeShader.setIsoValue(renderSettings.isoValue);

    let effectiveStepSize = renderSettings.stepSize;
    if (compositingMode === "mip") {
        const mipBoost = 0.35 + (1.0 - renderSettings.isoValue) * 1.3;
        effectiveStepSize = renderSettings.stepSize * mipBoost;
    }
    volumeShader.setStepSize(effectiveStepSize);
}

class VolumeRenderShader extends Shader {
    constructor(volumeData) {
        super("volume_vert", "volume_frag");

        const { voxels, width, height, depth } = downsampleVolume(volumeData, 128);
        this.dimX = width;
        this.dimY = height;
        this.dimZ = depth;

        const texture = new THREE.Data3DTexture(voxels, width, height, depth);
        texture.format = THREE.RedFormat;
        texture.type = THREE.FloatType;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.unpackAlignment = 1;
        texture.needsUpdate = true;

        this.material.side = THREE.BackSide;
        this.material.depthWrite = false;

        this.setUniform("volumeData", texture);
        this.setUniform("boxMin", new THREE.Vector3(-width / 2, -height / 2, -depth / 2));
        this.setUniform("boxMax", new THREE.Vector3(width / 2, height / 2, depth / 2));
        this.setUniform("cameraPos", new THREE.Vector3(0, 0, 0));
        this.setUniform("stepSize", renderSettings.stepSize);
        this.setUniform("compositingMode", 0.0);
        this.setUniform("isoValue", 0.3);
        this.setUniform("surfaceColor", new THREE.Vector3(0.96, 0.64, 0.35));
        this.setUniform("texelSize", new THREE.Vector3(1 / width, 1 / height, 1 / depth));
        this.setUniform("lightDir", new THREE.Vector3(0.5, 0.8, 1.0).normalize());
        this.setUniform("ambientStrength", 0.2);
        this.setUniform("diffuseStrength", 0.85);
        this.setUniform("specularStrength", 0.35);
        this.setUniform("shininess", 24.0);
        this.setUniform("surfaceCount", 0);
        this.setUniform("surfaceIsoValues", new Float32Array(20));
        this.setUniform("surfaceColors", Array.from({ length: 20 }, () => new THREE.Vector4(1, 1, 1, 1)));
    }

    setCompositingMode(mode) {
        this.material.uniforms.compositingMode.value = mode === "mip" ? 0.0 : 1.0;
    }

    setIsoValue(value) {
        this.material.uniforms.isoValue.value = Math.max(0.0, Math.min(1.0, value));
    }

    setStepSize(value) {
        this.material.uniforms.stepSize.value = Math.max(0.05, value);
    }

    updateCamera(pos) {
        this.material.uniforms.cameraPos.value.copy(pos);
    }
}

function downsampleVolume(volumeData, maxDim) {
    let w = volumeData.width;
    let h = volumeData.height;
    let d = volumeData.depth;
    let voxels = volumeData.voxels;

    if (w <= maxDim && h <= maxDim && d <= maxDim) {
        return { voxels, width: w, height: h, depth: d };
    }

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
                downsampled[z * nh * nw + y * nw + x] = voxels[oz * h * w + oy * w + ox];
            }
        }
    }

    return { voxels: downsampled, width: nw, height: nh, depth: nd };
}
