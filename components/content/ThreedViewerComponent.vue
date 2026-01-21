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

// Detect if it's a Sketchfab URL
const isSketchfab = computed(() => {
  return props.src.includes('sketchfab.com')
})

// Detect if it's a GLTF/GLB file
const is3DFile = computed(() => {
  return props.src.endsWith('.gltf') || props.src.endsWith('.glb')
})

// For Sketchfab, convert URL to embed format
const sketchfabEmbedUrl = computed(() => {
  if (!isSketchfab.value) return ''
  
  let url = props.src
  
  // Handle various Sketchfab URL formats
  // https://sketchfab.com/3d-models/model-name-<id>
  // https://sketchfab.com/models/<id>
  
  // Extract model ID from URL
  let modelId = ''
  
  if (url.includes('/3d-models/')) {
    // Extract ID from pattern: /3d-models/name-<id>
    const parts = url.split('/')
    const lastPart = parts[parts.length - 1]
    if (lastPart) {
      const match = lastPart.match(/([a-f0-9]{32})/)
      if (match && match[1]) {
        modelId = match[1]
      }
    }
  } else if (url.includes('/models/')) {
    // Extract ID from pattern: /models/<id>
    const parts = url.split('/models/')
    const modelPart = parts[1]
    if (modelPart) {
      const withoutQuery = modelPart.split('?')[0]
      const cleanId = withoutQuery ? withoutQuery.split('#')[0] : ''
      if (cleanId) {
        modelId = cleanId
      }
    }
  }
  
  if (modelId) {
    return `https://sketchfab.com/models/${modelId}/embed?autostart=1&ui_theme=dark`
  }
  
  // If it's already an embed URL, return as is
  if (url.includes('/embed')) {
    return url
  }
  
  return url
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
    <!-- Sketchfab Embed -->
    <div v-if="isSketchfab" class="relative w-full overflow-hidden rounded-lg border border-border bg-muted/30">
      <iframe
        :src="sketchfabEmbedUrl"
        :title="title"
        :style="`width: ${width}; height: ${height};`"
        frameborder="0"
        allow="autoplay; fullscreen; xr-spatial-tracking"
        allowfullscreen
        mozallowfullscreen="true"
        webkitallowfullscreen="true"
        class="w-full"
      />
    </div>
    
    <!-- GLTF/GLB File Viewer -->
    <div v-else-if="is3DFile" class="relative w-full overflow-hidden rounded-lg border border-border bg-muted/30">
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
    
    <!-- Fallback for unsupported formats -->
    <div v-else class="p-8 border border-border rounded-lg bg-muted/30 text-center">
      <p class="text-muted-foreground">
        Unsupported 3D format. Please use Sketchfab URLs or upload .gltf/.glb files.
      </p>
      <p class="text-sm text-muted-foreground mt-2">Source: {{ src }}</p>
    </div>
    
    <!-- Title caption -->
    <p v-if="title" class="text-sm text-muted-foreground mt-2 text-center">
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
