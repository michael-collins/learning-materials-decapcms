/**
 * Composable to manage body/html overflow when showing modals.
 * Prevents scrolling on the background page while modal is open.
 */
import { ref, onBeforeUnmount, readonly } from 'vue'

export function useBodyOverflow() {
  const isLocked = ref(false)

  const lock = () => {
    if (isLocked.value) return
    
    // Store the current scroll position
    const scrollY = window.scrollY
    
    // Apply overflow hidden to both html and body
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    
    isLocked.value = true
  }

  const unlock = () => {
    if (!isLocked.value) return
    
    // Get the scroll position we stored
    const scrollY = parseInt(document.body.style.top || '0', 10) * -1
    
    // Remove overflow styles
    document.documentElement.style.overflow = ''
    document.body.style.overflow = ''
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.width = ''
    
    // Restore scroll position
    window.scrollTo(0, scrollY)
    
    isLocked.value = false
  }

  const toggle = (shouldLock: boolean) => {
    if (shouldLock) {
      lock()
    } else {
      unlock()
    }
  }

  // Cleanup on unmount
  onBeforeUnmount(() => {
    unlock()
  })

  return {
    lock,
    unlock,
    toggle,
    isLocked: readonly(isLocked)
  }
}
