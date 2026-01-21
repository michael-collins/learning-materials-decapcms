<script setup lang="ts">
interface Props {
  src: string
  title?: string
  width?: string
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Sketchfab Model',
  width: '100%',
  height: '600px'
})

// Convert Sketchfab URL to embed format
const sketchfabEmbedUrl = computed(() => {
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
</script>

<template>
  <div class="sketchfab-viewer-container my-8">
    <div class="relative w-full overflow-hidden rounded-lg border border-border bg-muted/30">
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
    
    <!-- Title caption -->
    <p v-if="title" class="text-sm text-muted-foreground mt-2 text-center">
      {{ title }}
    </p>
  </div>
</template>

<style scoped>
iframe {
  display: block;
}
</style>
