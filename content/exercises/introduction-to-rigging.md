---
recordId: recNVyB0NFX6Uu2Ln
title: Introduction to rigging
slug: introduction-to-rigging
type: 'oer:Practice'
difficulty: Beginner
youtubePlaylistID: PL-V2nChTadrX4lOk4gv0XjdSVpB31qOtJ
image: /uploads/exercises/recNVyB0NFX6Uu2Ln_image_ex-6-beginner-banner-compressed.jpg
imageAlt: ex-6-beginner-banner-compressed.jpg
license: CC BY 4.0
aiLicense:
  - AIUL-WA
  - AIUL-NA-3D
rubric: exercise
tags:
  - Blender
author: Michael Collins
authorUrl: 'https://michaelcollins.xyz'
published: true
allowEmbed: true
attachments:
  - file: /uploads/files/recJjqlGeFw9C431Y_attachment_biped-base-mesh.fbx
    title: Base character mesh
    description: Starter character mesh
    alt: ''
    citation: ''
    sourceUrl: ''
    type: application/octet-stream
---

In this exercise, students will practice correcting a character model's edge-flow and set up an armature rig to pose the character in a sitting position.


## Tutorial Video

::iframe-component
---
src: https://youtube.com/embed/videoseries?list=PL-V2nChTadrX4lOk4gv0XjdSVpB31qOtJ
title: Introduction to rigging Tutorial
---
::


## Learning Objectives

1. Practice setting up Inverse Kinematics (IK) bone constraints.
2. Practice modeling to good edge flow for deformation.
3. Become familiarized with creating and binding a character armature.

## Instructions

1. Watch the rigging character rigging tutorials.
2. Download the base mesh model FBX file.
3. **File** → **Import** the FBX file into a new Blender scene.
4. Scale up the model.
5. Model the T-pose for armature deformation. Do not model the character into a sitting pose, it must be modeled in a T pose, and posed in a seated position via the armature rig.
6. Watch the demo video series to learn how to add and create good edge flow for deformation. Add geometry to articulate the head, torso, legs, and arms.
7. **Object** → **Apply** all transforms including scale, rotation, and location.
8. Create an armature with bones for the pelvis, lower back, upper back, lower legs, upper legs, feet, shoulders, arms, hands, neck, and head. Name and number them for your reference. You must put a “.L” or “.R” at the end of your bones for them to symmetrize properly.
9. Parent (bind) the mesh to the armature. Do this by selecting the mesh first, select the armature, and then press ‘CTRL-P,’ and choose “with automatic weights.” If you do not see this option, you have selected in the reverse order.
10. If you are getting any unwanted deformation, watch the weight paint tutorials and use the weight painting tool to clean up the vertex weights.
11. Pose the biped to be in a sitting pose on a prop like a bench or chair.
12. Save as `LASTNAME-`r`igging.blend` and upload to the submission dropbox.
13. Double check that you’ve included all files and that your .zip file can be downloaded and opened.





## Grading Rubric

::rubric-component{id="exercise"}
::

