# 3D Model Viewer Component

The 3D Model Viewer component allows you to embed interactive 3D models in your content. It supports:
- **Sketchfab embeds** (automatically detected from URL)
- **GLTF files** (.gltf)
- **GLB files** (.glb - binary GLTF)

## Usage in Markdown

### Basic Syntax

```markdown
::threed-viewer-component{src="YOUR_URL_OR_FILE_PATH" title="Model Title"}
::
```

### Examples

#### Sketchfab Model

```markdown
::threed-viewer-component{src="https://sketchfab.com/3d-models/example-model-abc123" title="Example 3D Model"}
::
```

#### Uploaded GLTF/GLB File

```markdown
::threed-viewer-component{src="/uploads/3d-models/my-model.glb" title="My Custom Model"}
::
```

#### Custom Height

```markdown
::threed-viewer-component{src="/uploads/3d-models/spaceship.glb" title="Spaceship Model" height="800px"}
::
```

#### Disable Auto-Rotation

```markdown
::threed-viewer-component{src="https://sketchfab.com/3d-models/sculpture-xyz" title="Sculpture" autoRotate="false"}
::
```

## Using in DecapCMS Editor

1. Click the **+** button in the markdown editor
2. Select **"3D Model Viewer"** from the dropdown
3. Fill in the fields:
   - **3D Model Source**: Paste a Sketchfab URL OR
   - **Upload 3D File**: Upload a .gltf or .glb file
   - **Model Title**: Optional caption for the model
   - **Viewer Height**: Default is 600px
   - **Auto-rotate model**: Toggle to enable/disable rotation

## Supported Formats

### Sketchfab URLs
Any Sketchfab model URL will work:
- `https://sketchfab.com/3d-models/model-name-<id>`
- `https://sketchfab.com/models/<id>`
- Already embedded URLs are also supported

### 3D File Formats
- **.gltf** - GLTF text format (may reference external textures)
- **.glb** - GLTF binary format (all assets packed in one file) - **Recommended**

## Tips

- **Use GLB format** for best results - it packages everything into one file
- **Keep file sizes reasonable** - large models may take time to load
- **Test on different devices** - 3D rendering performance varies
- **Use descriptive titles** - helps with accessibility and context

## Model Viewer Features

The GLTF/GLB viewer includes:
- ✅ Camera controls (orbit, zoom, pan)
- ✅ Auto-rotation (optional)
- ✅ Shadow rendering
- ✅ Responsive sizing
- ✅ Loading progress indicator

## Example Usage in an Exercise

```markdown
---
title: 3D Modeling Exercise
slug: 3d-modeling-exercise
type: 'oer:Practice'
difficulty: Intermediate
---

# 3D Modeling Assignment

Create a low-poly character model following these specifications.

## Reference Model

Here's an example of what we're aiming for:

::threed-viewer-component{src="/uploads/3d-models/reference-character.glb" title="Reference Character Model" height="700px"}
::

## Instructions

1. Start with basic primitives
2. Model the body using subdivision surface
3. Add details and UV unwrap
4. Export as GLB format

## Student Examples

Check out this student submission:

::threed-viewer-component{src="https://sketchfab.com/3d-models/student-character-example" title="Student Example by Jane Doe"}
::
```

## Troubleshooting

- **Model not loading?** Check that the file path is correct and the file exists
- **Sketchfab not embedding?** Ensure the model is set to public on Sketchfab
- **Performance issues?** Try reducing polygon count or texture resolution
- **Can't see the model?** Check browser console for errors
