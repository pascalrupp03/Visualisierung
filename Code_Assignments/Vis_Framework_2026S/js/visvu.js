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
let canvasWidth, canvasHeight = 0;
let container = null;
let volume = null;
let fileInput = null;
let raycasterShader = null;
let histogram = null;
let editor = null;

/**
 * Load all data and initialize UI here.
 */
function init() {
    // volume viewer
    container = document.getElementById("viewContainer");
    const maxWidth = window.innerWidth * 0.70;
    const maxHeight = window.innerHeight * 0.68;
    canvasWidth = Math.min(maxWidth, maxHeight * 1.3);
    canvasHeight = Math.min(maxHeight, canvasWidth / 1.3);

    // WebGL renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize( canvasWidth, canvasHeight );
    container.appendChild( renderer.domElement );

    // read and parse volume file
    fileInput = document.getElementById("upload");
    fileInput.addEventListener('change', readFile);

    histogram = new Histogram("#tfContainer");

    editor = new Editor("#tfContainer",
        function(val) {
            if (raycasterShader) { raycasterShader.setIsoValue(val); requestAnimationFrame(paint); }
        },
        function(r, g, b) {
            if (raycasterShader) { raycasterShader.setSurfaceColor(r, g, b); requestAnimationFrame(paint); }
        },
        function(mode) {
            if (raycasterShader) { raycasterShader.setCompositingMode(mode); requestAnimationFrame(paint); }
        },
        function(alpha) {
            if (raycasterShader) { raycasterShader.setAlpha(alpha); requestAnimationFrame(paint); }
        }
    );
    editor.setHistogram(histogram);
}

/**
 * Handles the file reader. No need to change anything here.
 */
function readFile(){
    let reader = new FileReader();
    reader.onloadend = function () {
        console.log("data loaded: ");

        let data = new Uint16Array(reader.result);
        volume = new Volume(data);

        resetVis();
    };
    reader.readAsArrayBuffer(fileInput.files[0]);
}

/**
 * Construct the THREE.js scene and update histogram when a new volume is loaded by the user.
 *
 * Currently renders the bounding box of the volume.
 */
async function resetVis(){
    // create new empty scene and perspective camera
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 75, canvasWidth / canvasHeight, 0.1, 1000 );

    // 3D texture from volume data
    const volumeTexture = new THREE.Data3DTexture(volume.voxels, volume.width, volume.height, volume.depth);
    volumeTexture.format = THREE.RedFormat;
    volumeTexture.type = THREE.FloatType;
    volumeTexture.minFilter = THREE.LinearFilter;
    volumeTexture.magFilter = THREE.LinearFilter;
    volumeTexture.wrapS = THREE.ClampToEdgeWrapping;
    volumeTexture.wrapT = THREE.ClampToEdgeWrapping;
    volumeTexture.wrapR = THREE.ClampToEdgeWrapping;
    volumeTexture.needsUpdate = true;

    // raycaster setup
    const volumeSize = new THREE.Vector3(volume.width, volume.height, volume.depth);
    raycasterShader = new RaycasterShader(volumeTexture, volumeSize);
    await raycasterShader.load();

    // keep editor state when switching datasets
    raycasterShader.setIsoValue(editor.isoValue);
    raycasterShader.setSurfaceColor(editor.currentColor.r, editor.currentColor.g, editor.currentColor.b);
    raycasterShader.setCompositingMode(editor.currentMode);
    raycasterShader.setAlpha(editor.currentAlpha);

    // bounding box as proxy geometry for raycasting
    const boxGeometry = new THREE.BoxGeometry(volume.width, volume.height, volume.depth);
    const mesh = new THREE.Mesh(boxGeometry, raycasterShader.material);
    scene.add(mesh);

    // our camera orbits around an object centered at (0,0,0)
    orbitCamera = new OrbitCamera(camera, new THREE.Vector3(0,0,0), 2*volume.max, renderer.domElement);

    histogram.update(volume);

    // init paint loop
    requestAnimationFrame(paint);
}

/**
 * Render the scene and update all necessary shader information.
 */
function paint(){
    if (volume) {
        renderer.render(scene, camera);
    }
}
