Feedback from assignment 1:

- No need to submit the data - we have specified not to, as we already have them
- Include also your group number on your index.html mentioned on the top
- Non-optimal step size formula: the current step size scales with overall volume dimensions, but it does not account for the ray direction and anisotropic voxel spacing, so sampling density changes with view angle and dataset aspect ratio. This can cause either oversampling (slow rendering) or undersampling (missed details and aliasing) depending on how the ray traverses the volume. The step size should be computed per-ray based on the volume's voxel size and ray direction, ensuring exactly one voxel is sampled per step in the most constrained axis.
For Assignment 2 one comment for now – but otherwise for other comments regarding assignment 2 please join the open labs.
- no alpha value selectable in editor: editor currently exposes mode, iso, and color only, but no opacity/alpha control (editor.js:8). To fix: add alpha slider(s) and pass alpha uniform(s) to the shader.