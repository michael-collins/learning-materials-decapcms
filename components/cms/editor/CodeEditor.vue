<script setup lang="ts">
/**
 * CodeEditor — CodeMirror 6 powered code editor with markdown + YAML syntax highlighting.
 *
 * Features:
 * - Markdown syntax highlighting with YAML frontmatter support
 * - Light / dark theme switching (respects app theme)
 * - Line numbers with gutter
 * - Bracket matching, active line highlighting
 * - Two-way binding via v-model
 */
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { yaml } from '@codemirror/lang-yaml'
import { bracketMatching, syntaxHighlighting, defaultHighlightStyle, indentOnInput, foldGutter } from '@codemirror/language'
import { oneDark } from '@codemirror/theme-one-dark'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'

const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const containerRef = ref<HTMLElement | null>(null)
let editorView: EditorView | null = null

// Detect dark mode via the document class (standard Tailwind dark mode approach)
const isDark = ref(false)

function checkDarkMode() {
  if (import.meta.client) {
    isDark.value = document.documentElement.classList.contains('dark')
  }
}

// ─── Theme compartment for dynamic switching ───────────────
// We rebuild the editor when the theme changes since CodeMirror 6
// theme switching is cleanest via reconfiguration.

function createExtensions(dark: boolean) {
  const extensions = [
    lineNumbers(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    foldGutter(),
    history(),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    markdown({ defaultCodeLanguage: yaml() }),
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      ...closeBracketsKeymap,
      indentWithTab,
    ]),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const doc = update.state.doc.toString()
        emit('update:modelValue', doc)
      }
    }),
    EditorView.lineWrapping,
    // Base theme overrides for consistent look
    EditorView.theme({
      '&': {
        fontSize: '0.875rem',
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
      },
      '.cm-content': {
        padding: '0.75rem 0',
        minHeight: '380px',
      },
      '.cm-gutters': {
        border: 'none',
      },
      '.cm-focused': {
        outline: 'none',
      },
      '.cm-scroller': {
        overflow: 'auto',
      },
    }),
  ]

  if (dark) {
    extensions.push(oneDark)
  } else {
    extensions.push(syntaxHighlighting(defaultHighlightStyle, { fallback: true }))
    // Light theme overrides
    extensions.push(
      EditorView.theme({
        '&': {
          backgroundColor: 'var(--background, #ffffff)',
          color: 'var(--foreground, #1a1a2e)',
        },
        '.cm-gutters': {
          backgroundColor: 'var(--muted, #f3f4f6)',
          color: 'var(--muted-foreground, #9ca3af)',
        },
        '.cm-activeLineGutter': {
          backgroundColor: 'var(--accent, #e5e7eb)',
        },
        '.cm-activeLine': {
          backgroundColor: 'var(--accent, #f3f4f6)',
        },
      }),
    )
  }

  return extensions
}

function createEditor() {
  if (!containerRef.value) return

  // Destroy previous instance
  if (editorView) {
    editorView.destroy()
    editorView = null
  }

  const state = EditorState.create({
    doc: props.modelValue || '',
    extensions: createExtensions(isDark.value),
  })

  editorView = new EditorView({
    state,
    parent: containerRef.value,
  })
}

// Watch for external modelValue changes (e.g., when entering code mode)
watch(
  () => props.modelValue,
  (newVal) => {
    if (!editorView) return
    const currentDoc = editorView.state.doc.toString()
    if (newVal !== currentDoc) {
      editorView.dispatch({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: newVal || '',
        },
      })
    }
  },
)

// Watch for theme changes
let darkModeObserver: MutationObserver | null = null

onMounted(() => {
  checkDarkMode()
  createEditor()

  // Observe dark mode class changes on <html>
  if (import.meta.client) {
    darkModeObserver = new MutationObserver(() => {
      const wasDark = isDark.value
      checkDarkMode()
      if (wasDark !== isDark.value) {
        // Recreate editor with new theme (preserves content)
        createEditor()
      }
    })
    darkModeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
  }
})

// ─── Public API ────────────────────────────────────────────
function insertAtCursor(text: string) {
  if (!editorView) return
  const cursor = editorView.state.selection.main.head
  editorView.dispatch({
    changes: { from: cursor, insert: text },
    selection: { anchor: cursor + text.length },
  })
  // Sync the model
  emit('update:modelValue', editorView.state.doc.toString())
}

defineExpose({ insertAtCursor })

onBeforeUnmount(() => {
  darkModeObserver?.disconnect()
  editorView?.destroy()
  editorView = null
})
</script>

<template>
  <div ref="containerRef" class="code-editor-container" />
</template>

<style>
.code-editor-container .cm-editor {
  height: 100%;
  min-height: 400px;
  resize: vertical;
  overflow: hidden;
}
</style>
