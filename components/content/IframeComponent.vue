<script setup lang="ts">
interface Props {
  src: string
  title?: string
  width?: string
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Video',
  width: '100%',
  height: '600'
})

// Detect if it's YouTube or Vimeo
const isYouTube = computed(() => props.src.includes('youtube.com') || props.src.includes('youtu.be'))
const isVimeo = computed(() => props.src.includes('vimeo.com'))

// Ensure proper embed URL format
const embedUrl = computed(() => {
  let url = props.src
  
  // Handle YouTube
  if (isYouTube.value) {
    // Convert watch URLs to embed URLs
    if (url.includes('watch?v=')) {
      url = url.replace('watch?v=', 'embed/')
    }
    // Handle youtu.be short links
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0]
      url = `https://www.youtube.com/embed/${videoId}`
    }
  }
  
  // Handle Vimeo
  if (isVimeo.value && !url.includes('/video/')) {
    const videoId = url.split('vimeo.com/')[1]?.split('?')[0]
    if (videoId && !url.includes('/embed/')) {
      url = `https://player.vimeo.com/video/${videoId}`
    }
  }
  
  return url
})
</script>

<template>
  <div class="iframe-container my-8 rounded-lg overflow-hidden border border-border bg-muted/30">
    <iframe
      :src="embedUrl"
      :title="title"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
    />
  </div>
</template>

<style scoped>
.iframe-container {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
}

.iframe-container iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
