/**
 * Shader material for volume raycasting (single-pass).
 * Extends the base Shader class, loads our raycaster vertex/fragment shaders
 * and manages the uniforms we need for rendering.
 */
class RaycasterShader extends Shader {
    constructor(volumeTexture, volumeSize) {
        super("raycaster_vert", "raycaster_frag");
        // we need to see the inside of the box when the camera is outside
        this.material.side = THREE.BackSide;
        this.setUniform("uVolumeTexture", volumeTexture);
        this.setUniform("uVolumeSize", volumeSize);
        this.setUniform("uIsoValue", 0.3);
        this.setUniform("uCompositingMode", 1); // 0=MIP, 1=First-Hit
        this.setUniform("uSurfaceColor", new THREE.Vector3(1.0, 1.0, 1.0));
    }

    setIsoValue(value) {
        this.setUniform("uIsoValue", value);
    }

    setCompositingMode(mode) {
        // 0 = MIP, 1 = First-Hit
        this.setUniform("uCompositingMode", mode);
    }

    setSurfaceColor(r, g, b) {
        this.setUniform("uSurfaceColor", new THREE.Vector3(r, g, b));
    }
}
