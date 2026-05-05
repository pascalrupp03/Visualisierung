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
    canvasWidth = window.innerWidth * 0.7;
    canvasHeight = window.innerHeight * 0.7;

    // WebGL renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize( canvasWidth, canvasHeight );
    container.appendChild( renderer.domElement );

    // read and parse volume file
    fileInput = document.getElementById("upload");
    fileInput.addEventListener('change', readFile);

    // initialize histogram in the transfer function container
    histogram = new Histogram("#tfContainer");

    // initialize interactive editor with d3
    editor = new Editor("#tfContainer",
        // onIsoValueChange
        function(val) {
            if (raycasterShader) {
                raycasterShader.setIsoValue(val);
                requestAnimationFrame(paint);
            }
        },
        // onColorChange
        function(r, g, b) {
            if (raycasterShader) {
                raycasterShader.setSurfaceColor(r, g, b);
                requestAnimationFrame(paint);
            }
        },
        // onModeChange
        function(mode) {
            if (raycasterShader) {
                raycasterShader.setCompositingMode(mode);
                requestAnimationFrame(paint);
            }
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

    // Create 3D texture from volume data
    const volumeTexture = new THREE.Data3DTexture(volume.voxels, volume.width, volume.height, volume.depth);
    volumeTexture.format = THREE.RedFormat;
    volumeTexture.type = THREE.FloatType;
    volumeTexture.minFilter = THREE.LinearFilter;
    volumeTexture.magFilter = THREE.LinearFilter;
    volumeTexture.wrapS = THREE.ClampToEdgeWrapping;
    volumeTexture.wrapT = THREE.ClampToEdgeWrapping;
    volumeTexture.wrapR = THREE.ClampToEdgeWrapping;
    volumeTexture.needsUpdate = true;

    // Create raycaster shader for single-pass volume rendering with MIP
    const volumeSize = new THREE.Vector3(volume.width, volume.height, volume.depth);
    raycasterShader = new RaycasterShader(volumeTexture, volumeSize);
    await raycasterShader.load();

    // Render the bounding box of the volume; fragment shader performs raycasting
    const boxGeometry = new THREE.BoxGeometry(volume.width, volume.height, volume.depth);
    const mesh = new THREE.Mesh(boxGeometry, raycasterShader.material);
    scene.add(mesh);

    // our camera orbits around an object centered at (0,0,0)
    orbitCamera = new OrbitCamera(camera, new THREE.Vector3(0,0,0), 2*volume.max, renderer.domElement);

    // update histogram with new volume data
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
