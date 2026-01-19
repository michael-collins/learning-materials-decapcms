<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

let resizeObserver: ResizeObserver | null = null

const sendCanvasResize = () => {
  if (typeof window === 'undefined') return
  
  try {
    // Scroll to top
    parent.postMessage('{"subject":"lti.scrollToTop"}', "*")
    
    // Send height update
    const height = document.body.scrollHeight
    parent.postMessage(`{"subject":"lti.frameResize", "height": ${height}}`, "*")
  } catch (err) {
    console.error('Failed to send Canvas LMS resize message:', err)
  }
}

onMounted(() => {
  // Initial resize after content loads
  setTimeout(() => {
    sendCanvasResize()
  }, 100)

  // Additional resize after images and fonts load
  setTimeout(() => {
    sendCanvasResize()
  }, 500)

  // Watch for content changes and resize accordingly
  resizeObserver = new ResizeObserver(() => {
    sendCanvasResize()
  })

  if (document.body) {
    resizeObserver.observe(document.body)
  }

  // Listen for window resize events
  window.addEventListener('resize', sendCanvasResize)
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  window.removeEventListener('resize', sendCanvasResize)
})
</script>

<template>
  <div class="min-h-screen bg-background">
    <slot />
  </div>
</template>
