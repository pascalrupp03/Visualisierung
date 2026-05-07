## How to Use
Load one of the provided volume files through the GUI.
Rotate the orbit camera around the bounding box using the left mouse button. Zoom using the scroll wheel.

The volume appears with First-Hit compositing mode by default.

The panel on the right contains three main controls:

- **Compositing Mode dropdown**: Switch between MIP (Maximum Intensity Projection) and First-Hit rendering modes
- **Density Histogram**: Shows the distribution of voxel intensities in the data. The dotted line with the white circle is the iso-value indicator — drag it left or right to change the threshold (works for both MIP and First-Hit)
- **Color Swatcher**: 20 colors to choose from. Click any swatch to change the iso-surface color (only affects First-Hit mode)

The step size for ray marching is computed automatically based on the volume dimensions (no manual adjustment needed).



### Editor / Interaction Options

The editor panel is located to the right of the 3D viewport and provides the following controls:

| Control | Action |
|---------|--------|
| **Compositing Mode** dropdown | Switch between MIP (Maximum Intensity Projection) and First-Hit rendering |
| **Drag circle on histogram** | Change the iso-value by dragging the white circle/line indicator left or right on the density histogram |
| **Color swatches** (20 colors) | Click a color swatch to change the iso-surface color. Colors are systematically selected via HSL color space (18 hues) + white + gray |

### Volume Interaction

| Input | Action |
|-------|--------|
| Left mouse button + drag | Rotate camera around volume |
| Scroll wheel | Zoom in/out |

### Notes

- The density histogram is automatically recalculated and animated when a new data set is loaded.
- The iso-value indicator on the histogram is coupled to the shader — changes are reflected in real-time.
- The step size for ray marching is computed automatically based on the volume dimensions (no manual adjustment needed).
- Ray/AABB intersection is used to compute where each camera ray enters and exits the volume bounding box. This defines the exact segment that is sampled during ray marching and is the standard/robust approach for single-pass box-proxy volume rendering.


## Framework Description

This framework uses three.js and d3.js for volume rendering and setting the appearance, respectively. 
The following files are provided: 
* **index.html**: contains the HTML content. Please enter your names! Otherwise, it does not need to be changed 
(but can be, if required). 
* **style.css**: CSS styles (can be adjusted, but does not need to be changed). 
* **three.js/build/three.js**: Contains the three.js library. **Do not modify!**
* **d3.js/d3.v7.js**: Contains the d3.js library. **Do not modify!**
* **shaders**: Folder containing a dummy vertex and fragment shader. **Add your shaders to this folder!** 
* **js**: Folder containing all JavaScript files. **Add new classes as separate js-files in this folder!** 
    * **visvu.js**: Main script file. Needs to be modified. 
    * **shader.js**: Base shader class. Does not need to be modified. Derive your custom shader materials from this class!
    * **testShader.js**: Example shader class demonstrating how to create and use a shader material 
    using external .essl files. Should not be used in the final submission.
    * **camera.js**: Simple orbit camera that moves nicely around our volumes. Does not need to be modified. 

### Compliance Notes (Current Branch vs `main`)

- **Not modified (as requested by framework description):**
    - `three.js/build/three.js`
    - `d3.js/d3.v7.js`
    - `js/shader.js`
    - `js/camera.js`
- **Modified where expected by assignment:**
    - `js/visvu.js` (scene setup, shader integration, histogram/editor wiring)
    - new files in `js/` (`raycasterShader.js`, `histogram.js`, `editor.js`)
    - new files in `shaders/` (`raycaster_vert.essl`, `raycaster_frag.essl`)
    - `index.html` (script includes for new classes)
    - `style.css` (editor styling)
    - `README.md` and `CHANGELOG.md` (documentation)
    
Created 2021 by Manuela Waldner, Diana Schalko, amd Laura Luidolt based on the VisVU Task 1 Qt framework 
initially created by Johanna Schmidt, Tobias Klein, and Laura Luidolt. Updated 2022 and 2023 by Manuela Waldner. 

## JavaScript

Javascript files should go to folder 'js' and end with '.js'. All new javascript files have to be included in index.html. 

Recommended IDE: Webstorm (free educational version available using TU Wien e-mail address)

*Important*: do not run index.html from the file system! Only execute it from inside WebStorm 
(by selecting a browser icon from the top right panel that appears when you open index.html) 
or from hosting the project within another web server. Opening index.html directly in the browser without a server
will result in an error when trying to load the the .essl shader files. 


## Shaders

.essl is the OpenGL ES shading language. Shader files should all be located in the folder 'shaders' and end with '.essl'.  

Recommended code editor: Visual Studio Code (free): https://code.visualstudio.com/

Install syntax highlighting for shading languages: https://marketplace.visualstudio.com/items?itemName=slevesque.shader

Enable syntax highlighting: open shader file --> in the bar on the bottom right, switch from plain text to GLSL.  