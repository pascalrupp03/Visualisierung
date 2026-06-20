# 1. HTML & CSS Layer (index.html, style.css)

## What This Does

These files provide the **user-facing interface** for the volume rendering application:
- **index.html**: Loads Three.js and D3.js libraries, includes all custom JS files in order, defines the page structure (title, file upload input, two main containers for the volume viewer and control panel).
- **style.css**: Styles the layout using flexbox, colors (black background, white text), and defines interactive elements (color swatches, iso-value indicator).

The key visual layout is a two-panel design:
- **Left side (`#viewContainer`)**: Takes up ~70% of the screen, displays the 3D volume rendering
- **Right side (`#tfContainer`)**: Fixed 420px width, hosts the histogram + interactive controls

---

## What You Changed vs. Original Framework

**index.html:**
- ✅ **Changed**: Group name updated in `<h2>` (was empty, now "Group 25 — Pascal Rupp, Joy Alissa")
- ✅ **Changed**: Added script includes for custom files:
  - `js/raycasterShader.js` (new raycasting shader)
  - `js/histogram.js` (D3 histogram)
  - `js/editor.js` (interactive controls)
- ✅ **Removed**: `js/testShader.js` (test shader not used in final version)
- ❌ **Unchanged**: Basic structure, container divs, file upload input

**style.css:**
- ✅ **Added**: `.editor-section` class (margin/padding for control sections)
- ✅ **Added**: `.color-picker` class (wraps color swatches)
- ✅ **Added**: `.swatch-container` class (flex layout for color buttons)
- ✅ **Added**: `.iso-indicator` class (cursor style for draggable iso-value line)
- ❌ **Unchanged**: Body styling, container flexbox layout, viewport sizing

---

## 🔧 Adjustable Settings for Demos/Presentations

### In index.html:
- **Line 2**: `<title>VisVU</title>` — Change page title for branding
- **Line 23**: `<h2>Group 25 — Pascal Rupp, Joy Alissa</h2>` — Update group name/members
- **Canvas sizing** (not directly in HTML, but in `visvu.js`):
  - Currently: `maxWidth = window.innerWidth * 0.70`, `maxHeight = window.innerHeight * 0.68`
  - To show **full-screen** visualization: pass different percentages

### In style.css:
- **Line 3**: `background-color: black;` → Change to `#1a1a1a` for slightly lighter background (reduces eye strain in presentations)
- **Line 10**: `gap: 8px;` → Increase to `gap: 16px` for more space between panels
- **Line 19**: `flex: 0 0 420px;` → Change control panel width (e.g., `350px` for more space for viewer, `500px` for larger controls)
- **Color picker swatch size** (editor.js line ~120): Currently `22px × 22px`, increase to `26px × 26px` for easier clicking on large displays

---

## Potential Gotchas & Things to Watch

1. **🚨 Container width must not be 100%**: The CSS uses `flex: 1 1 auto` for the viewer and `flex: 0 0 420px` for the control panel. If you change the control panel to percentages (e.g., `flex: 0 0 30%`), the layout breaks responsively.
   - **Fix**: Always use fixed widths (`420px`) or `calc()` with viewport units for the control panel.

2. **🚨 Zoom/scroll behavior**: The file input field is **outside** the flex container. If you have many other elements, the file input stays in place but may collide with the viewer on small screens.
   - **Watch during demo**: On narrow monitors, move the file input above the flex container.

3. **🚨 Bootstrap/external CSS conflicts**: If you add external CSS libraries, they might override `.container`, `body`, or `div` styles. Prefix custom classes with `vis-` or similar to avoid collisions.

4. **Color contrast in lighting demos**: Black background is ideal for volume rendering (no distraction), but if the room has bright projector light, small details might wash out. Have a lighter variant ready:
   ```css
   /* Alternative for bright rooms */
   body { background-color: #f5f5f5; color: #333; }
   ```

5. **Touch devices**: The file input is a basic `<input type="file">`, which works on touch but is hard to target precisely. On tablets, consider replacing with a larger button.

6. **Print/export**: The black background won't print well. If you need to export screenshots, add a print stylesheet:
   ```css
   @media print {
     body { background-color: white; color: black; }
   }
   ```

---

## Summary

**Key files to modify for demos:**
- Update `index.html` group name (line 23)
- Adjust control panel width in `style.css` (line 19) if you need more viewer space
- Test on your presentation monitor/projector first—screen size affects the 70% width rule

**Best practice:** Keep a backup of the original dimensions. You can quickly toggle between "fullscreen demo" and "detailed controls" by switching a CSS variable:
```css
:root {
  --panel-width: 420px;  /* Change this one line */
}
#tfContainer {
  flex: 0 0 var(--panel-width);
}
```
