<script setup lang="ts">
import { onMounted, onUnmounted, nextTick } from 'vue'

let resizeObserver: ResizeObserver | null = null
let resizeTimeout: ReturnType<typeof setTimeout> | null = null

const getContentHeight = () => {
  // Get the maximum height from multiple sources to ensure we capture all content
  const body = document.body
  const html = document.documentElement
  
  return Math.max(
    body.scrollHeight,
    body.offsetHeight,
    html.clientHeight,
    html.scrollHeight,
    html.offsetHeight
  )
}

const sendCanvasResize = () => {
  if (typeof window === 'undefined') return
  
  try {
    // Scroll to top
    parent.postMessage(JSON.stringify({ subject: "lti.scrollToTop" }), "*")
    
    // Get accurate content height
    const height = getContentHeight()
    
    // Send height update with some padding to avoid cut-off
    parent.postMessage(JSON.stringify({ 
      subject: "lti.frameResize", 
      height: height + 20 
    }), "*")
    
    console.log('[LTI Embed] Sent resize message:', height + 20)
  } catch (err) {
    console.error('Failed to send Canvas LMS resize message:', err)
  }
}

const debouncedResize = () => {
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }
  resizeTimeout = setTimeout(() => {
    sendCanvasResize()
  }, 100)
}

const waitForImages = async () => {
  const images = Array.from(document.images)
  
  await Promise.all(
    images.map(img => {
      if (img.complete) return Promise.resolve()
      return new Promise((resolve) => {
        img.addEventListener('load', () => resolve(true))
        img.addEventListener('error', () => resolve(true))
      })
    })
  )
}

onMounted(async () => {
  // Wait for Vue to finish rendering
  await nextTick()
  
  // Initial resize
  sendCanvasResize()
  
  // Wait for images to load
  await waitForImages()
  sendCanvasResize()
  
  // Additional resize attempts to catch any delayed content
  setTimeout(sendCanvasResize, 500)
  setTimeout(sendCanvasResize, 1000)
  setTimeout(sendCanvasResize, 2000)
  
  // Watch for content changes and resize accordingly
  resizeObserver = new ResizeObserver(debouncedResize)

  if (document.body) {
    resizeObserver.observe(document.body)
  }

  // Listen for window resize events
  window.addEventListener('resize', debouncedResize)
  
  // Listen for image load events on dynamically added images
  window.addEventListener('load', sendCanvasResize)
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }
  window.removeEventListener('resize', debouncedResize)
  window.removeEventListener('load', sendCanvasResize)
})
</script>

<template>
  <div class="min-h-screen bg-background">
    <slot />
  </div>
</template>
