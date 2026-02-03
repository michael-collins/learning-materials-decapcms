<script setup lang="ts">
import { onMounted, onUnmounted, nextTick } from 'vue'

let resizeObserver: ResizeObserver | null = null
let resizeTimeout: ReturnType<typeof setTimeout> | null = null
let lastSentHeight = 0
let observerActive = true

const getContentHeight = () => {
  // CRITICAL: Only measure body content, NOT html.scrollHeight
  // html.scrollHeight includes the iframe height set by Canvas, creating a feedback loop
  const body = document.body
  
  // Use the most reliable measurements without iterating through all elements
  // This is much faster than checking every single element
  const mainContent = document.querySelector('#__nuxt') as HTMLElement
  
  // Get the maximum height from the most reliable sources
  const height = Math.max(
    body.scrollHeight,
    body.offsetHeight,
    mainContent?.scrollHeight || 0,
    mainContent?.offsetHeight || 0
  )
  
  return height
}

const sendCanvasResize = () => {
  if (typeof window === 'undefined') return
  
  try {
    // Get accurate content height
    const height = getContentHeight()
    const heightWithPadding = height + 20
    
    // Only send if height actually changed (prevent infinite loop)
    if (Math.abs(heightWithPadding - lastSentHeight) < 5) {
      return
    }
    
    lastSentHeight = heightWithPadding
    
    // Scroll to top
    parent.postMessage(JSON.stringify({ subject: "lti.scrollToTop" }), "*")
    
    // Send height update with some padding to avoid cut-off
    parent.postMessage(JSON.stringify({ 
      subject: "lti.frameResize", 
      height: heightWithPadding
    }), "*")
  } catch (err) {
    // Silently fail
  }
}

const debouncedResize = () => {
  if (!observerActive) {
    return
  }
  
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }
  resizeTimeout = setTimeout(() => {
    sendCanvasResize()
  }, 100)
}

const waitForImages = async () => {
  const images = Array.from(document.images)
  
  if (images.length === 0) return
  
  // Wait for all images with a timeout
  await Promise.race([
    Promise.all(
      images.map(img => {
        if (img.complete) return Promise.resolve()
        return new Promise((resolve) => {
          img.addEventListener('load', () => resolve(true), { once: true })
          img.addEventListener('error', () => resolve(true), { once: true })
        })
      })
    ),
    // Timeout after 3 seconds total (instead of per image)
    new Promise(resolve => setTimeout(resolve, 3000))
  ])
}

onMounted(async () => {
  // Critical: Wait for Vue hydration to complete in SSG
  await nextTick()
  
  // Initial resize
  sendCanvasResize()
  
  // Wait for images to load
  await waitForImages()
  sendCanvasResize()
  
  // Wait for fonts to load
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready
    sendCanvasResize()
  }
  
  // Optimized resize attempts - reduced from 5 to 3 attempts
  setTimeout(() => sendCanvasResize(), 300)
  setTimeout(() => sendCanvasResize(), 1000)
  setTimeout(() => {
    sendCanvasResize()
    
    // Stop observing after final resize to prevent infinite loops
    observerActive = false
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
  }, 2500) // Reduced from 5000ms to 2500ms
  
  // Watch for content changes and resize accordingly (only for first 2.5 seconds)
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
  <div class="w-full bg-background">
    <slot />
  </div>
</template>
