/**
 * Vis 1 Task 1 - Volume Raycasting
 *
 * Shader class for single-pass GPU raycasting.
 * Supports MIP and First-Hit compositing modes.
 * Derives from the base Shader class and sets up volume texture, size, iso-value, and compositing mode uniforms.
 */
class RaycasterShader extends Shader {
    constructor(volumeTexture, volumeSize) {
        super("raycaster_vert", "raycaster_frag");
        // Render back faces so the fragment shader runs for fragments visible from outside
        this.material.side = THREE.BackSide;
        this.setUniform("uVolumeTexture", volumeTexture);
        this.setUniform("uVolumeSize", volumeSize);
        this.setUniform("uIsoValue", 0.3);
        this.setUniform("uCompositingMode", 1); // default: First-Hit
        this.setUniform("uSurfaceColor", new THREE.Vector3(1.0, 1.0, 1.0)); // white
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
