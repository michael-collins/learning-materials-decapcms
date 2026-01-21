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
        <!-- Let model-viewer use its default progress bar -->
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
</style>
