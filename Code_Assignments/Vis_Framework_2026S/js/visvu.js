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
let debugMode = false;
let compositingMode = 'mip'; // 'mip' or 'firsthit'

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
    renderer.setSize(canvasWidth, canvasHeight);
    renderer.setClearColor(0x000000);
    container.appendChild(renderer.domElement);

    // File loader
    fileInput = document.getElementById("upload");
    fileInput.addEventListener('change', loadVolume);

    // Compositing mode buttons
    const btnMIP = document.getElementById("btnMIP");
    const btnFirstHit = document.getElementById("btnFirstHit");
    
    btnMIP.addEventListener('click', () => {
        setCompositingMode('mip');
        btnMIP.classList.add('active');
        btnFirstHit.classList.remove('active');
    });
    
    btnFirstHit.addEventListener('click', () => {
        setCompositingMode('firsthit');
        btnFirstHit.classList.add('active');
        btnMIP.classList.remove('active');
    });

    // Start animation loop
    requestAnimationFrame(render);
}

/**
 * Load and parse a volume dataset from a .dat file.
 * @param {Event} event - File input change event
 */
async function loadVolume(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        const data = new Uint16Array(e.target.result);
        volume = new Volume(data);
        
        console.log("Volume loaded:", volume.width, "×", volume.height, "×", volume.depth);
        
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

    // Create mesh with ACTUAL shader dimensions (considers downsampling)
    const geom = new THREE.BoxGeometry(shader.dimX, shader.dimY, shader.dimZ);
    mesh = new THREE.Mesh(geom, shader.material);
    scene.add(mesh);

    // Setup camera with actual dimensions
    const maxDim = Math.max(shader.dimX, shader.dimY, shader.dimZ);
    orbitCamera = new OrbitCamera(camera, new THREE.Vector3(0, 0, 0), 2.5 * maxDim, renderer.domElement);
    
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
    }
}

/**
 * Switch between compositing modes (MIP vs First-Hit).
 * @param {string} mode - 'mip' (Maximum Intensity Projection) or 'firsthit' (First-Hit Compositing)
 */
function setCompositingMode(mode) {
    if (mode === 'mip' || mode === 'firsthit') {
        compositingMode = mode;
        if (shader && shader.material) {
            shader.material.uniforms.compositingMode.value = mode === 'mip' ? 0.0 : 1.0;
            console.log(`Switched to ${mode.toUpperCase()} compositing mode`);
        }
    }
}

/**
 * Volume shader class - proper implementation with size limiting
 */
class VolumeShader {
    /**
     * Create a volume rendering shader with automatic GPU memory management.
     * Downsamples volume to 128³ max if needed. Supports both MIP and First-Hit compositing.
     * @param {Volume} volume - Volume object with voxels, width, height, depth
     */
    constructor(volume) {
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
        texture.needsUpdate = true;
        
        this.vertexShaderCode = `
out vec3 vWorldPos;
void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
}`;
        
        this.fragmentShaderCode = `
precision mediump float;
uniform mediump sampler3D volumeData;
uniform vec3 boxMin;
uniform vec3 boxMax;
uniform vec3 cameraPos;
uniform float stepSize;
uniform float compositingMode;
in vec3 vWorldPos;

bool intersectBox(vec3 rayOrigin, vec3 rayDir, out float tMin, out float tMax) {
    vec3 invDir = 1.0 / rayDir;
    vec3 t1 = (boxMin - rayOrigin) * invDir;
    vec3 t2 = (boxMax - rayOrigin) * invDir;
    vec3 tMin3 = min(t1, t2);
    vec3 tMax3 = max(t1, t2);
    tMin = max(tMin3.x, max(tMin3.y, tMin3.z));
    tMax = min(tMax3.x, min(tMax3.y, tMax3.z));
    return tMax >= tMin && tMin < 10000.0;
}

float sampleVolume(vec3 worldPos) {
    vec3 uv = (worldPos - boxMin) / (boxMax - boxMin);
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0 || uv.z < 0.0 || uv.z > 1.0) return 0.0;
    return texture(volumeData, uv).r;
}

void main() {
    vec3 rayDir = normalize(vWorldPos - cameraPos);
    float tMin, tMax;
    if (!intersectBox(cameraPos, rayDir, tMin, tMax)) discard;
    
    tMin = max(tMin, 0.001);
    float resultIntensity = 0.0;
    
    if (compositingMode < 0.5) {
        // MIP: Maximum Intensity Projection
        for (int i = 0; i < 256; i++) {
            float t = tMin + float(i) * 1.0;
            if (t >= tMax) break;
            vec3 samplePos = cameraPos + rayDir * t;
            resultIntensity = max(resultIntensity, sampleVolume(samplePos));
        }
    } else {
        // First-Hit: Use first non-zero intensity
        for (int i = 0; i < 256; i++) {
            float t = tMin + float(i) * 1.0;
            if (t >= tMax) break;
            vec3 samplePos = cameraPos + rayDir * t;
            float intensity = sampleVolume(samplePos);
            if (intensity > 0.001) {
                resultIntensity = intensity;
                break;
            }
        }
    }
    gl_FragColor = vec4(vec3(resultIntensity), 1.0);
}`;
        
        this.material = new THREE.ShaderMaterial({
            vertexShader: this.vertexShaderCode,
            fragmentShader: this.fragmentShaderCode,
            uniforms: {
                volumeData: new THREE.Uniform(texture),
                boxMin: new THREE.Uniform(new THREE.Vector3(-w/2, -h/2, -d/2)),
                boxMax: new THREE.Uniform(new THREE.Vector3(w/2, h/2, d/2)),
                cameraPos: new THREE.Uniform(new THREE.Vector3(0, 0, 0)),
                stepSize: new THREE.Uniform(1.0),
                compositingMode: new THREE.Uniform(0.0)
            },
            transparent: true,
            side: THREE.BackSide,
            depthWrite: false
        });
    }
    
    /**
     * Asynchronous load placeholder for future async texture operations.
     */
    async load() {}

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

