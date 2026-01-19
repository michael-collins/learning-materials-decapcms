<script setup lang="ts">
import { onMounted, onUnmounted, nextTick } from 'vue'

let resizeObserver: ResizeObserver | null = null
let resizeTimeout: ReturnType<typeof setTimeout> | null = null

const getContentHeight = () => {
  // The body/html are being constrained, so measure the actual content inside
  const body = document.body
  const html = document.documentElement
  
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
  
  const height = Math.max(
    body.scrollHeight,
    body.offsetHeight,
    html.scrollHeight,
    html.offsetHeight,
    actualContentHeight,
    maxContentDivHeight,
    mainContent?.scrollHeight || 0
  )
  
  // Debug: Log what we're measuring
  console.log('[LTI Embed] Height measurements:', {
    'body.scrollHeight': body.scrollHeight,
    'body.offsetHeight': body.offsetHeight,
    'html.scrollHeight': html.scrollHeight,
    'html.offsetHeight': html.offsetHeight,
    'actualContentHeight (deepest element)': actualContentHeight,
    'maxContentDivHeight': maxContentDivHeight,
    'mainContent.scrollHeight': mainContent?.scrollHeight || 0,
    'calculated': height,
    'allElements.length': allElements.length
  })
  
  return height
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
  <div class="w-full bg-background">
    <slot />
  </div>
</template>
