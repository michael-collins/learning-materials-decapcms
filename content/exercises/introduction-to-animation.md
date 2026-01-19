---
recordId: recDaZ0H0qFz4iYlR
title: Introduction to animation
slug: introduction-to-animation
type: 'oer:Practice'
difficulty: Beginner
youtubePlaylistID: PL-V2nChTadrUCq3o-AvWZ3A6mQTd8O9uJ
image: /uploads/exercises/recDaZ0H0qFz4iYlR_image_animation.png
imageAlt: animation.png
license: CC BY 4.0
rubric: exercise
tags:
  - Blender
author: Michael Collins
authorUrl: 'https://michaelcollins.xyz'
published: true
allowEmbed: true
---

In this exercise, level 1 students will practice keyframe animation, parenting, animating the camera with a target, and manipulating curves in the graph editor.


## Tutorial Video

::iframe-component
---
src: https://youtube.com/embed/videoseries?list=PL-V2nChTadrUCq3o-AvWZ3A6mQTd8O9uJ
title: Introduction to animation Tutorial
---
::


## Learning Objectives

1. Practice keyframe animation of translation, rotation, and scale properties.
2. Become familiarized with keyframe animation.
3. Become familiarized with the purpose of pivot points and parent objects.
4. Practice applying camera constraints.

## Instructions

1. Watch linked tutorials in Learning Resources from Blender Foundation and others to get acquainted with animation tools.
2. Create a project folder on your computer and save a new `.blend` file called `LASTNAME-animation.blend`.
3. Follow the video demonstrations to animate a camera, cube, and sphere.
    - The duration of the animation should be 120 frames.
    - Create a centered cube.
    - Create a sphere [parented](https://www.youtube.com/watch?v=kd1O0oqQ3Uw) to the cube. The sphere should be 5 units away from the cube in the X or Y axis, and revolve concentrically around the cube. (HINT: Their [pivot points](https://www.versluis.com/2016/05/how-to-set-the-origin-pivot-point-in-blender/) should be the same location: 0,0,0)
    - Animate the sphere to rotate concentrically around the cube, twice(720 degrees).
    - Go into the Graph Editor and set **interpolation mode** to **linear**.
    - Your sphere should now loop seamlessly with linear motion. Press play in the timeline to see if it is looping seamlessly. The sphere should not be stopping at any point.
    - Animate the cube to move from 0 to positive 10 units in the z-axis from frame 1 to 60, and move back to the origin from frame 61 to 120. (The sphere will follow the cube as it moves up and down if it parented correctly)
    - Create a new perspective camera.
    - Create an ‘empty’ and use it at as a [camera tracking constraint](https://www.youtube.com/watch?v=ageV_llb0Hk).
    - Parent the ‘empty’ to the cube so the camera aims at the cube as it moves up and down.
    - Select the camera and choose **View** ⟶ **Camera** ⟶ **Set active object as camera** and choose “Lock Camera to viewport .
4. Export a rendered video.
    - To create a video file, save the file and set the render settings output folder to the project folder.
    - Under **File Format**, choose **FFMpeg Video**, change the encoding format to **MPEG-4**
    - Under **Codec,** choose **H.264**.
    - Choose **Render** ⟶ **Render Animation** to create the animation file.
5. Choose **View** ⟶ **Viewport Render Animation** to create the animation file.
6. Compress the project folder once you’ve completed the tutorial and rename it `LASTNAME-animation.zip`.
7. Upload the .zip file to the assignment dropbox.
8. Double check that you’ve included all files and that your .zip file can be downloaded and opened.






## Grading Rubric

::rubric-component{id="exercise"}
::

