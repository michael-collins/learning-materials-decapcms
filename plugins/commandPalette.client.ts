// Global keyboard shortcuts for command palette
export default defineNuxtPlugin(() => {
  const { open } = useCommandPalette()

  function handleKeyDown(e: KeyboardEvent) {
    // Cmd/Ctrl + K or Cmd/Ctrl + P
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K' || e.key === 'p' || e.key === 'P')) {
      // Skip when focus is inside an editor, input, or anywhere on CMS pages
      // so that Cmd+K can be used as the "insert link" shortcut in the editor
      if (isEditorContext()) return
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

  /** True when focus is in any input/editor OR on a CMS route */
  function isEditorContext(): boolean {
    // Any focused input, textarea, or contenteditable element
    if (isInputFocused()) return true
    // Also check if we're inside a .tiptap editor or .ProseMirror element
    const active = document.activeElement
    if (active?.closest?.('.tiptap, .ProseMirror, [data-cms-editor]')) return true
    // Check if we're on a CMS page (route starts with /cms)
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/cms')) return true
    return false
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
