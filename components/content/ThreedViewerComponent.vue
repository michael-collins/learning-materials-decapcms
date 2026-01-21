<script setup lang="ts">
interface Props {
  src: string
  title?: string
  width?: string
  height?: string
  autoRotate?: boolean
  cameraControls?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '3D Model',
  width: '100%',
  height: '600px',
  autoRotate: true,
  cameraControls: true
})

// Check if src is provided and valid
const hasValidSrc = computed(() => {
  return props.src && props.src.trim().length > 0
})

// Model viewer attributes
const modelViewerAttrs = computed(() => ({
  src: props.src,
  alt: props.title,
  'auto-rotate': props.autoRotate,
  'camera-controls': props.cameraControls,
  style: `width: ${props.width}; height: ${props.height};`
}))
</script>

<template>
  <div class="threed-viewer-container my-8">
    <!-- GLTF/GLB File Viewer -->
    <div v-if="hasValidSrc" class="relative w-full overflow-hidden rounded-lg border border-border bg-muted/30">
      <model-viewer
        v-bind="modelViewerAttrs"
        shadow-intensity="1"
        camera-orbit="45deg 55deg 2.5m"
        min-camera-orbit="auto auto 5%"
        max-camera-orbit="auto auto 100%"
        class="w-full"
      >
        <div slot="progress-bar" class="progress-bar">
          <div class="update-bar"></div>
        </div>
      </model-viewer>
    </div>
    
    <!-- Fallback for missing src -->
    <div v-else class="p-8 border border-border rounded-lg bg-muted/30 text-center">
      <p class="text-muted-foreground mb-2">
        <strong>No 3D model file provided</strong>
      </p>
      <p class="text-sm text-muted-foreground">
        Please upload a .gltf or .glb file using the editor.
      </p>
    </div>
    
    <!-- Title caption -->
    <p v-if="title && hasValidSrc" class="text-sm text-muted-foreground mt-2 text-center">
      {{ title }}
    </p>
  </div>
</template>

<style scoped>
model-viewer {
  background-color: transparent;
}

.progress-bar {
  display: block;
  width: 33%;
  height: 10%;
  max-height: 2%;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate3d(-50%, -50%, 0);
  border-radius: 25px;
  box-shadow: 0px 3px 10px 3px rgba(0, 0, 0, 0.5), 0px 0px 5px 1px rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.9);
  background-color: rgba(0, 0, 0, 0.5);
}

.progress-bar .update-bar {
  background-color: rgba(255, 255, 255, 0.9);
  width: 0%;
  height: 100%;
  border-radius: 25px;
  float: left;
  transition: width 0.3s;
}
</style>
