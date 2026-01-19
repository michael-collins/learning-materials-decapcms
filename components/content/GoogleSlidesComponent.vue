<script setup lang="ts">
interface Props {
  id: string
  title?: string
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Presentation',
  height: '600'
})

const embedUrl = computed(() => {
  // Handle various Google Slides URL formats
  let slideId = props.id
  
  // Extract ID from full URL if provided
  if (slideId.includes('docs.google.com')) {
    const match = slideId.match(/\/d\/e?\/([a-zA-Z0-9-_]+)/)
    if (match && match[1]) {
      slideId = match[1]
    }
  }
  
  // Published slides start with "2PACX" and need /d/e/ format with /pubembed
  // Regular slides use /d/ format with /embed
  if (slideId.startsWith('2PACX')) {
    return `https://docs.google.com/presentation/d/e/${slideId}/pubembed?start=false&loop=false&delayms=3000`
  } else {
    return `https://docs.google.com/presentation/d/${slideId}/embed?start=false&loop=false&delayms=3000`
  }
})
</script>

<template>
  <div class="google-slides-container my-8 rounded-lg overflow-hidden border border-border bg-muted/30">
    <iframe
      :src="embedUrl"
      :title="title"
      frameborder="0"
      allowfullscreen="true"
      mozallowfullscreen="true"
      webkitallowfullscreen="true"
    />
  </div>
</template>

<style scoped>
.google-slides-container {
  position: relative;
  width: 100%;
  padding-bottom: 59.27%; /* 960/569 ratio from Google's embed (approx 16:9.5) */
}

.google-slides-container iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
