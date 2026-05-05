/**
 * Vis 1 Task 1 - Volume Raycasting
 *
 * Shader class for single-pass GPU raycasting with MIP compositing.
 * Derives from the base Shader class and sets up the volume texture and size uniforms.
 */
class RaycasterShader extends Shader {
    constructor(volumeTexture, volumeSize) {
        super("raycaster_vert", "raycaster_frag");
        this.setUniform("uVolumeTexture", volumeTexture);
        this.setUniform("uVolumeSize", volumeSize);
    }
}
