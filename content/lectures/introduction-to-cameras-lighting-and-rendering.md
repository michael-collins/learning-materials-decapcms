---
title: 'Introduction to Cameras, Lighting, and Rendering'
slug: introduction-to-cameras-lighting-and-rendering
type: 'oer:SupportingMaterial'
googleSlidesID: null
topics:
  - |+
    1. **Video Screening**
        1. [“Spectacle, Speculation, Spam”](https://alanwarburton.co.uk/spectacle-speculation-spam) by Alan Warburton
        2. [Lighting Theory by Andrew Price](https://www.youtube.com/playlist?list=PLjEaoINr3zgH9vCr47kSS5W8PEJBNIiwK)
    2. **Demo**
        1. [Lighting and Rendering Video (Unedited live demo)](https://vimeo.com/456374066)
    3. **Technical Readings for 3D Rendering**
        1. [FX Guide: “Art of Rendering”](https://www.fxguide.com/featured/the-art-of-rendering/)
        2. [FX Guide: “State of Rendering”](https://www.fxguide.com/fxfeatured/the-state-of-rendering/)
    4. **For your Bookshelf**
        1. [How to Render by Scott Robertson](https://www.amazon.com/How-Render-fundamentals-shadow-reflectivity/dp/1933492961/)
        2. [Software Takes Command](http://manovich.net/index.php/projects/software-takes-command) by Lev Manovich
        3. [The Language of New Media](http://manovich.net/index.php/projects/language-of-new-media) by Lev Manovich
    5. **TerminologyLighting setups**
        1. [3 point lighting](https://m5designstudio.com/2011/maya-3d-tutorials/studio-three-point-lighting/) (key, fill, rim)
        2. Light types: Area, Spot, Directional or Sun, Point, Volumetric
        3. Geometry-based lighting using Emission shader
        4. Geometry-based lighting using [Principled Volumetric shader](https://www.youtube.com/watch?v=AXjE-t6dFZ8)
        5. Staging lights: Light box with side and top lights, curved color background and floor
        6. Image based lighting (IBL) [using HDR images](https://area.autodesk.com/tutorials/studio-lighting/)
        7. Shadows: The larger the light source, the softer the shadows
        8. Create edge bevels to capture highlights on hard surfaces
    6. **Camera**
        1. Perspective vs Orthographic
        2. Sensor size
        3. Depth of field using aperture F-Stop: Shallow depth of field is created with lower settings. (In Blender, very low settings may be needed such as 0.1)
        4. Blades add flat sides to the Bokeh
        5. You can create custom [Bokeh shapes](https://blender.stackexchange.com/questions/133191/custom-bokeh-shapes)
        6. Safe area
        7. Composition guides for layouts (golden ratio, golden triangle, thirds, etc.)
    7. **Render quality in Cycles**
        1. To reduce render times, keep material shaders simple. Use principled shader if working with photo-real renders.
        2. 500 samples are usually needed to reduce noise.
        3. Use [advanced denoising workflow](https://www.youtube.com/watch?v=Pw-OxOHHu5I) in the compositor
        4. If using motion blur or depth of field, sample sizes must increase dramatically.
        5. You can get away with 120 samples if you use denoising in the Compositor
    8. **Render quality in EEVEE**
        1. [EEVEE Lighting](https://www.youtube.com/watch?v=MFNurQ1AF2I)
        2. Enable render settings including: Ambient Occlusion, Depth of Field, and Screen Space Reflections
        3. Shadows: Increase the shadow map to 4K

author: |+
course:

published: true
oer:
  '@context': 'https://oerschema.org/'
  '@type': SupportingMaterial
  name: 'Introduction to Cameras, Lighting, and Rendering'
  materialType: Slide Deck
  about:
    - |+
      1. **Video Screening**
          1. [“Spectacle, Speculation, Spam”](https://alanwarburton.co.uk/spectacle-speculation-spam) by Alan Warburton
          2. [Lighting Theory by Andrew Price](https://www.youtube.com/playlist?list=PLjEaoINr3zgH9vCr47kSS5W8PEJBNIiwK)
      2. **Demo**
          1. [Lighting and Rendering Video (Unedited live demo)](https://vimeo.com/456374066)
      3. **Technical Readings for 3D Rendering**
          1. [FX Guide: “Art of Rendering”](https://www.fxguide.com/featured/the-art-of-rendering/)
          2. [FX Guide: “State of Rendering”](https://www.fxguide.com/fxfeatured/the-state-of-rendering/)
      4. **For your Bookshelf**
          1. [How to Render by Scott Robertson](https://www.amazon.com/How-Render-fundamentals-shadow-reflectivity/dp/1933492961/)
          2. [Software Takes Command](http://manovich.net/index.php/projects/software-takes-command) by Lev Manovich
          3. [The Language of New Media](http://manovich.net/index.php/projects/language-of-new-media) by Lev Manovich
      5. **TerminologyLighting setups**
          1. [3 point lighting](https://m5designstudio.com/2011/maya-3d-tutorials/studio-three-point-lighting/) (key, fill, rim)
          2. Light types: Area, Spot, Directional or Sun, Point, Volumetric
          3. Geometry-based lighting using Emission shader
          4. Geometry-based lighting using [Principled Volumetric shader](https://www.youtube.com/watch?v=AXjE-t6dFZ8)
          5. Staging lights: Light box with side and top lights, curved color background and floor
          6. Image based lighting (IBL) [using HDR images](https://area.autodesk.com/tutorials/studio-lighting/)
          7. Shadows: The larger the light source, the softer the shadows
          8. Create edge bevels to capture highlights on hard surfaces
      6. **Camera**
          1. Perspective vs Orthographic
          2. Sensor size
          3. Depth of field using aperture F-Stop: Shallow depth of field is created with lower settings. (In Blender, very low settings may be needed such as 0.1)
          4. Blades add flat sides to the Bokeh
          5. You can create custom [Bokeh shapes](https://blender.stackexchange.com/questions/133191/custom-bokeh-shapes)
          6. Safe area
          7. Composition guides for layouts (golden ratio, golden triangle, thirds, etc.)
      7. **Render quality in Cycles**
          1. To reduce render times, keep material shaders simple. Use principled shader if working with photo-real renders.
          2. 500 samples are usually needed to reduce noise.
          3. Use [advanced denoising workflow](https://www.youtube.com/watch?v=Pw-OxOHHu5I) in the compositor
          4. If using motion blur or depth of field, sample sizes must increase dramatically.
          5. You can get away with 120 samples if you use denoising in the Compositor
      8. **Render quality in EEVEE**
          1. [EEVEE Lighting](https://www.youtube.com/watch?v=MFNurQ1AF2I)
          2. Enable render settings including: Ambient Occlusion, Depth of Field, and Screen Space Reflections
          3. Shadows: Increase the shadow map to 4K

  encodingFormat: application/vnd.google-apps.presentation
  duration: PT45M
  inLanguage: en-US
  license: 'https://creativecommons.org/licenses/by-nc-sa/4.0/'
---

## Presentation

::google-slides-component
---
id: 2PACX-1vR8tl1dcVeFuKlBa1s1uB-dyXCnqzq_4Mdswke1ppmpOj4Gtby5etm2_aKykcz33GYCLQ4xUyixe61D
title: Introduction to Modeling
---
::

## Topics Covered

- 1. **Video Screening**
    1. [“Spectacle, Speculation, Spam”](https://alanwarburton.co.uk/spectacle-speculation-spam) by Alan Warburton
    2. [Lighting Theory by Andrew Price](https://www.youtube.com/playlist?list=PLjEaoINr3zgH9vCr47kSS5W8PEJBNIiwK)
2. **Demo**
    1. [Lighting and Rendering Video (Unedited live demo)](https://vimeo.com/456374066)
3. **Technical Readings for 3D Rendering**
    1. [FX Guide: “Art of Rendering”](https://www.fxguide.com/featured/the-art-of-rendering/)
    2. [FX Guide: “State of Rendering”](https://www.fxguide.com/fxfeatured/the-state-of-rendering/)
4. **For your Bookshelf**
    1. [How to Render by Scott Robertson](https://www.amazon.com/How-Render-fundamentals-shadow-reflectivity/dp/1933492961/)
    2. [Software Takes Command](http://manovich.net/index.php/projects/software-takes-command) by Lev Manovich
    3. [The Language of New Media](http://manovich.net/index.php/projects/language-of-new-media) by Lev Manovich
5. **TerminologyLighting setups**
    1. [3 point lighting](https://m5designstudio.com/2011/maya-3d-tutorials/studio-three-point-lighting/) (key, fill, rim)
    2. Light types: Area, Spot, Directional or Sun, Point, Volumetric
    3. Geometry-based lighting using Emission shader
    4. Geometry-based lighting using [Principled Volumetric shader](https://www.youtube.com/watch?v=AXjE-t6dFZ8)
    5. Staging lights: Light box with side and top lights, curved color background and floor
    6. Image based lighting (IBL) [using HDR images](https://area.autodesk.com/tutorials/studio-lighting/)
    7. Shadows: The larger the light source, the softer the shadows
    8. Create edge bevels to capture highlights on hard surfaces
6. **Camera**
    1. Perspective vs Orthographic
    2. Sensor size
    3. Depth of field using aperture F-Stop: Shallow depth of field is created with lower settings. (In Blender, very low settings may be needed such as 0.1)
    4. Blades add flat sides to the Bokeh
    5. You can create custom [Bokeh shapes](https://blender.stackexchange.com/questions/133191/custom-bokeh-shapes)
    6. Safe area
    7. Composition guides for layouts (golden ratio, golden triangle, thirds, etc.)
7. **Render quality in Cycles**
    1. To reduce render times, keep material shaders simple. Use principled shader if working with photo-real renders.
    2. 500 samples are usually needed to reduce noise.
    3. Use [advanced denoising workflow](https://www.youtube.com/watch?v=Pw-OxOHHu5I) in the compositor
    4. If using motion blur or depth of field, sample sizes must increase dramatically.
    5. You can get away with 120 samples if you use denoising in the Compositor
8. **Render quality in EEVEE**
    1. [EEVEE Lighting](https://www.youtube.com/watch?v=MFNurQ1AF2I)
    2. Enable render settings including: Ambient Occlusion, Depth of Field, and Screen Space Reflections
    3. Shadows: Increase the shadow map to 4K



