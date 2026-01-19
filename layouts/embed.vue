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
  // Wait multiple times to catch images added during hydration
  for (let i = 0; i < 3; i++) {
    await new Promise(resolve => setTimeout(resolve, 200))
    const images = Array.from(document.images)
    
    if (images.length > 0) {
      await Promise.all(
        images.map(img => {
          if (img.complete) return Promise.resolve()
          return new Promise((resolve) => {
            img.addEventListener('load', () => resolve(true))
            img.addEventListener('error', () => resolve(true))
            // Timeout after 5 seconds per image
            setTimeout(() => resolve(true), 5000)
          })
        })
      )
    }
  }
}

onMounted(async () => {
  console.log('[LTI Embed] Layout mounted - starting resize process')
  
  // Critical: Wait for Vue hydration to complete in SSG
  await nextTick()
  
  // Wait a bit for hydration to settle
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // Initial resize
  console.log('[LTI Embed] Sending initial resize')
  sendCanvasResize()
  
  // Wait for images to load
  console.log('[LTI Embed] Waiting for images to load')
  await waitForImages()
  sendCanvasResize()
  
  // Wait for fonts to load
  if (document.fonts && document.fonts.ready) {
    console.log('[LTI Embed] Waiting for fonts')
    await document.fonts.ready
    sendCanvasResize()
  }
  
  // Additional resize attempts to catch any delayed content/CSS
  console.log('[LTI Embed] Setting up delayed resize attempts')
  setTimeout(() => {
    console.log('[LTI Embed] Resize at 500ms')
    sendCanvasResize()
  }, 500)
  setTimeout(() => {
    console.log('[LTI Embed] Resize at 1000ms')
    sendCanvasResize()
  }, 1000)
  setTimeout(() => {
    console.log('[LTI Embed] Resize at 2000ms')
    sendCanvasResize()
  }, 2000)
  setTimeout(() => {
    console.log('[LTI Embed] Resize at 3000ms')
    sendCanvasResize()
  }, 3000)
  setTimeout(() => {
    console.log('[LTI Embed] Final resize at 5000ms')
    sendCanvasResize()
  }, 5000)
  
  // Watch for content changes and resize accordingly
  resizeObserver = new ResizeObserver(debouncedResize)

  if (document.body) {
    resizeObserver.observe(document.body)
    console.log('[LTI Embed] ResizeObserver attached to body')
  }

  // Listen for window resize events
  window.addEventListener('resize', debouncedResize)
  
  // Listen for image load events on dynamically added images
  window.addEventListener('load', sendCanvasResize)
  
  console.log('[LTI Embed] All listeners attached')
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
