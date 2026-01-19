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
  
  // Find the actual content - look for the deepest/largest content containers
  let actualContentHeight = 0
  
  // Check all elements and find the one with the largest bottom position
  const allElements = document.querySelectorAll('*')
  allElements.forEach((element) => {
    const rect = element.getBoundingClientRect()
    const bottom = rect.bottom + window.scrollY
    actualContentHeight = Math.max(actualContentHeight, bottom)
  })
  
  // Also specifically check main content containers
  const mainContent = document.querySelector('#__nuxt') as HTMLElement
  const contentDivs = document.querySelectorAll('div, article, section, main')
  
  let maxContentDivHeight = 0
  contentDivs.forEach((div) => {
    const el = div as HTMLElement
    const bottom = el.offsetTop + el.offsetHeight
    maxContentDivHeight = Math.max(maxContentDivHeight, bottom, el.scrollHeight)
  })
  
  // ONLY use body measurements and actual content, NOT html which reflects iframe size
  const height = Math.max(
    body.scrollHeight,
    body.offsetHeight,
    actualContentHeight,
    maxContentDivHeight,
    mainContent?.scrollHeight || 0
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
      console.log('[LTI Embed] Height unchanged, skipping resize')
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
    
    console.log('[LTI Embed] Sent resize message:', heightWithPadding)
  } catch (err) {
    console.error('Failed to send Canvas LMS resize message:', err)
  }
}

const debouncedResize = () => {
  if (!observerActive) {
    console.log('[LTI Embed] Observer inactive, skipping resize')
    return
  }
  
  console.log('[LTI Embed] debouncedResize called')
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }
  resizeTimeout = setTimeout(() => {
    console.log('[LTI Embed] Executing debounced resize')
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
    
    // Stop observing after final resize to prevent infinite loops
    console.log('[LTI Embed] Disabling ResizeObserver after final resize')
    observerActive = false
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
  }, 5000)
  
  // Watch for content changes and resize accordingly (only for first 5 seconds)
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
  <div class="w-full bg-background">
    <slot />
  </div>
</template>
