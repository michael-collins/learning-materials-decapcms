// Global keyboard shortcuts for command palette
export default defineNuxtPlugin(() => {
  const { open } = useCommandPalette()

  function handleKeyDown(e: KeyboardEvent) {
    // Cmd/Ctrl + K or Cmd/Ctrl + P
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K' || e.key === 'p' || e.key === 'P')) {
      e.preventDefault()
      open()
      return
    }

    // Forward slash (/) - only if not in an input/textarea
    if (e.key === '/' && !isInputFocused()) {
      e.preventDefault()
      open()
      return
    }
  }

  function isInputFocused(): boolean {
    const activeElement = document.activeElement
    if (!activeElement) return false
    
    const tagName = activeElement.tagName.toLowerCase()
    const isContentEditable = activeElement.getAttribute('contenteditable') === 'true'
    const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select'
    
    return isInput || isContentEditable
  }

  // Register global keyboard shortcut
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown)
  }

  // Cleanup on unmount
  return {
    provide: {
      commandPalette: { open }
    }
  }
})
