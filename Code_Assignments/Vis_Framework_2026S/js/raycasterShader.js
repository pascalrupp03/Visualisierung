// Raycaster shader - loads raycaster_vert/frag and exposes volume rendering uniforms.
// BackSide because we're inside the box looking at the back faces.

class RaycasterShader extends Shader {
    constructor(volumeTexture, volumeSize) {
        super("raycaster_vert", "raycaster_frag");
        this.material.side = THREE.BackSide;
        this.material.transparent = true;

        this.setUniform("uVolumeTexture", volumeTexture);
        this.setUniform("uVolumeSize", volumeSize);
        this.setUniform("uIsoValue", 0.3);
        this.setUniform("uCompositingMode", 1);
        this.setUniform("uSurfaceColor", new THREE.Vector3(1.0, 1.0, 1.0));
        this.setUniform("uAlpha", 1.0);
    }

    setIsoValue(value) { this.setUniform("uIsoValue", value); }
    setCompositingMode(mode) { this.setUniform("uCompositingMode", mode); }
    setSurfaceColor(r, g, b) { this.setUniform("uSurfaceColor", new THREE.Vector3(r, g, b)); }
    setAlpha(value) { this.setUniform("uAlpha", value); }
}
