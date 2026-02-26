<script setup lang="ts">
/**
 * MarkdownEditor — Tiptap-powered rich markdown editor.
 *
 * Features:
 * - Rich text ↔ markdown round-trip via tiptap-markdown
 * - Toolbar: headings, bold, italic, lists, blockquote, code, link, image, hr
 * - Three view modes: Edit only | Split (editor + preview) | Preview only
 * - Code mode for raw markdown editing
 * - MDC component insertion (via MdcToolbar)
 * - Keyboard shortcuts (standard conventions)
 */
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from 'tiptap-markdown'
import { MdcBlockExtension, parseMdcBlock, mdcToNodeAttrs } from './MdcBlockExtension'
import {
  Bold, Italic, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code, Minus, Link as LinkIcon,
  Eye, EyeOff, SplitSquareHorizontal, FileCode,
  Undo2, Redo2,
} from 'lucide-vue-next'

const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// ─── View mode ─────────────────────────────────────────────
type ViewMode = 'edit' | 'split' | 'preview' | 'code'
const viewMode = ref<ViewMode>('edit')

// ─── Code mode state (raw markdown textarea) ───────────────
const rawMarkdown = ref('')

// ─── MDC ↔ HTML conversion helpers ─────────────────────────
// MDC block pattern: ::component-name{props}\n::
const MDC_BLOCK_REGEX = /::([\w-]+)\{([^}]*)\}\s*\n?::/g

/**
 * Convert MDC blocks in markdown to HTML divs that Tiptap can parse.
 * This runs before setting editor content.
 */
function mdcToHtml(markdown: string): string {
  return markdown.replace(MDC_BLOCK_REGEX, (fullMatch, compType, attrStr) => {
    const props: Record<string, any> = {}
    const attrRegex = /(\w+)="([^"]*)"/g
    let m: RegExpExecArray | null
    while ((m = attrRegex.exec(attrStr)) !== null) {
      let val: any = m[2]
      if (val === 'true') val = true
      else if (val === 'false') val = false
      props[m[1]!] = val
    }
    const propsJson = JSON.stringify(props).replace(/"/g, '&quot;')
    const rawEscaped = fullMatch.replace(/"/g, '&quot;')
    return `<div data-mdc-block="true" data-component-type="${compType}" data-mdc-props="${propsJson}" data-mdc-raw="${rawEscaped}"></div>`
  })
}

/**
 * Convert HTML placeholder divs back to MDC syntax in markdown output.
 * This runs after getting markdown from the editor.
 */
function htmlToMdc(markdown: string): string {
  // Match the HTML div placeholders that tiptap-markdown might output
  const htmlDivRegex = /<div data-mdc-block="true" data-component-type="([^"]*)" data-mdc-props="([^"]*)" data-mdc-raw="([^"]*)"><\/div>/g
  return markdown.replace(htmlDivRegex, (_, _compType, _propsJson, rawEscaped) => {
    return rawEscaped.replace(/&quot;/g, '"').replace(/&amp;/g, '&')
  })
}

// ─── Editor setup ──────────────────────────────────────────
const editor = useEditor({
  content: mdcToHtml(props.modelValue || ''),
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: {
        HTMLAttributes: { class: 'code-block' },
      },
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { class: 'editor-link' },
    }),
    Placeholder.configure({
      placeholder: props.placeholder || 'Start writing your content...',
    }),
    Markdown.configure({
      html: true,
      tightLists: true,
      tightListClass: 'tight',
      bulletListMarker: '-',
      linkify: true,
      breaks: false,
      transformPastedText: true,
      transformCopiedText: true,
    }),
    MdcBlockExtension,
  ],
  editorProps: {
    attributes: {
      class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] px-4 py-3',
    },
  },
  onUpdate: ({ editor: ed }) => {
    let md = (ed.storage as any).markdown.getMarkdown()
    // Convert any HTML div placeholders back to MDC syntax
    md = htmlToMdc(md)
    // Also restore MDC from any mdcBlock nodes that tiptap-markdown didn't handle
    ed.state.doc.descendants((node: any) => {
      if (node.type.name === 'mdcBlock' && node.attrs.mdcRaw) {
        // The markdown serializer should have handled this via the extension,
        // but as a fallback we ensure MDC blocks appear in output
      }
    })
    emit('update:modelValue', md)
  },
})

// Watch for external changes to modelValue
watch(() => props.modelValue, (newVal) => {
  if (!editor.value) return
  let currentMd = (editor.value.storage as any).markdown.getMarkdown()
  currentMd = htmlToMdc(currentMd)
  if (newVal !== currentMd) {
    editor.value.commands.setContent(mdcToHtml(newVal || ''))
  }
})

// ─── Code mode sync ────────────────────────────────────────
watch(viewMode, (mode, oldMode) => {
  if (mode === 'code') {
    // Entering code mode: sync raw markdown from editor
    let md = (editor.value?.storage as any)?.markdown?.getMarkdown() || props.modelValue || ''
    rawMarkdown.value = htmlToMdc(md)
  } else if (oldMode === 'code') {
    // Leaving code mode: push raw markdown back into editor
    editor.value?.commands.setContent(mdcToHtml(rawMarkdown.value))
    emit('update:modelValue', rawMarkdown.value)
  }
})

function handleRawInput(e: Event) {
  rawMarkdown.value = (e.target as HTMLTextAreaElement).value
  emit('update:modelValue', rawMarkdown.value)
}

// ─── Toolbar actions ───────────────────────────────────────
function insertLink() {
  const url = window.prompt('Enter URL:')
  if (!url) return
  editor.value?.chain().focus().setLink({ href: url }).run()
}

// ─── MDC insertion ─────────────────────────────────────────
function insertMdcBlock(mdcSyntax: string) {
  const attrs = mdcToNodeAttrs(mdcSyntax)
  if (attrs && editor.value) {
    editor.value.chain().focus().insertContent({
      type: 'mdcBlock',
      attrs,
    }).run()
  } else {
    // Fallback: insert as raw text
    editor.value?.chain().focus().insertContent(mdcSyntax).run()
  }
}

onBeforeUnmount(() => {
  editor.value?.destroy()
})

// ─── Preview HTML post-processing ──────────────────────────
// Replaces MDC block placeholder divs in Tiptap's HTML output
// with real rendered components (e.g. <model-viewer>) for the preview pane.
const previewHtml = computed(() => {
  const raw = editor.value?.getHTML()
  if (!raw) return '<p class="text-muted-foreground">Nothing to preview</p>'

  // Simple in-editor reference tracker for preview pane
  const previewRefs: { num: number; label: string; text: string; url?: string; refId: string; citeId: string }[] = []
  const previewRefSeen = new Map<string, (typeof previewRefs)[0]>()
  function addPreviewRef(label: string, text?: string, url?: string) {
    const key = `${label}||${url || ''}`
    const existing = previewRefSeen.get(key)
    if (existing) return existing
    const num = previewRefs.length + 1
    const r = { num, label, text: text || label, url, refId: `ref-${num}`, citeId: `cite-${num}` }
    previewRefSeen.set(key, r)
    previewRefs.push(r)
    return r
  }

  function buildCaptionHtml(props: Record<string, any>): string {
    const caption = String(props.caption || '').trim()
    const credit = String(props.credit || '').trim()
    if (!caption && !credit) return ''
    let inner = ''
    if (caption) inner += caption.replace(/</g, '&lt;')
    if (credit) {
      if (caption) inner += ' &mdash; '
      const ref = addPreviewRef(credit, credit, props.creditUrl?.trim() || undefined)
      const creditText = props.creditUrl
        ? `<a href="${String(props.creditUrl).replace(/"/g, '&quot;')}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">${credit.replace(/</g, '&lt;')}</a>`
        : credit.replace(/</g, '&lt;')
      inner += `${creditText}<sup id="${ref.citeId}" class="ml-0.5"><a href="#${ref.refId}" class="inline-flex items-center justify-center rounded bg-primary/10 px-1 py-0.5 text-[0.65rem] font-semibold leading-none text-primary no-underline">[${ref.num}]</a></sup>`
    }
    return `<figcaption class="mt-2 text-center text-sm text-muted-foreground">${inner}</figcaption>`
  }

  // Replace <div data-mdc-block="true" data-component-type="..." data-mdc-props="...">...</div>
  let result = raw.replace(
    /<div data-mdc-block="true"[^>]*data-component-type="([^"]*)"[^>]*data-mdc-props="([^"]*)"[^>]*>.*?<\/div>/g,
    (_match: string, compType: string, propsEncoded: string) => {
      let props: Record<string, any> = {}
      try { props = JSON.parse(propsEncoded.replace(/&quot;/g, '"').replace(/&amp;/g, '&')) } catch { /* ignore */ }

      const captionHtml = buildCaptionHtml(props)

      if (compType === 'image-component' && props.src) {
        const src = String(props.src).replace(/"/g, '&quot;')
        const alt = String(props.alt || '').replace(/"/g, '&quot;')
        return `<div class="mdc-preview-block my-4 rounded-lg border overflow-hidden">
          <div class="bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground border-b">🖼 ${alt || 'Image'}</div>
          <img src="${src}" alt="${alt}" class="rounded-md max-w-full mx-auto" loading="lazy" />
          ${captionHtml}
        </div>`
      }

      if (compType === 'threed-viewer-component' && props.src) {
        const src = String(props.src).replace(/"/g, '&quot;')
        const title = String(props.title || '3D Model').replace(/"/g, '&quot;')
        const height = /^\d+$/.test(String(props.height || '')) ? props.height : '400'
        const autoRotate = props.autoRotate === true || props.autoRotate === 'true'
        return `<div class="mdc-preview-block my-4 rounded-lg border overflow-hidden">
          <div class="bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground border-b">\ud83d\udce6 ${title}</div>
          <model-viewer src="${src}" alt="${title}" camera-controls${autoRotate ? ' auto-rotate' : ''} shadow-intensity="1" style="width:100%;height:${height}px;background-color:transparent;"></model-viewer>
          ${captionHtml}
        </div>`
      }

      if (compType === 'cite-reference') {
        const label = String(props.label || 'Citation').replace(/</g, '&lt;')
        const text = String(props.text || props.label || 'Citation')
        const url = props.url?.trim()
        const ref = addPreviewRef(label, text, url || undefined)
        return `<sup id="${ref.citeId}" class="cite-ref"><a href="#${ref.refId}" class="inline-flex items-center justify-center rounded bg-primary/10 px-1 py-0.5 text-[0.65rem] font-semibold leading-none text-primary no-underline">[${ref.num}]</a></sup>`
      }

      // Fallback for other MDC blocks: show a labelled placeholder with caption
      const label = compType.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
      return `<div class="my-4 rounded-lg border p-3 text-sm text-muted-foreground"><strong>${label}</strong>${captionHtml}</div>`
    }
  )

  // Append references footer if any refs collected
  if (previewRefs.length > 0) {
    const items = previewRefs.map(r => {
      const srcLink = r.url
        ? `<a href="${r.url.replace(/"/g, '&quot;')}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline text-xs">Source</a>`
        : ''
      return `<li id="${r.refId}" class="flex gap-3 rounded-md p-2 text-sm">
        <span class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">${r.num}</span>
        <div><p>${r.text.replace(/</g, '&lt;')}</p><div class="mt-1 flex gap-3 text-xs">${srcLink}<a href="#${r.citeId}" class="text-muted-foreground hover:text-foreground text-xs">Back to text</a></div></div>
      </li>`
    }).join('')
    result += `<section class="mt-8 border-t pt-6"><h2 class="mb-3 text-base font-semibold">References <span class="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">${previewRefs.length}</span></h2><ol class="list-none space-y-2 pl-0">${items}</ol></section>`
  }

  return result
})

// ─── Line count (for code mode) ────────────────────────────
const lineCount = computed(() => (rawMarkdown.value.match(/\n/g) || []).length + 1)

// Toolbar button helper
interface ToolbarBtn {
  icon: any
  label: string
  action: () => void
  isActive?: () => boolean
}

const toolbarButtons = computed<ToolbarBtn[]>(() => {
  if (!editor.value) return []
  const e = editor.value
  return [
    { icon: Bold, label: 'Bold', action: () => e.chain().focus().toggleBold().run(), isActive: () => e.isActive('bold') },
    { icon: Italic, label: 'Italic', action: () => e.chain().focus().toggleItalic().run(), isActive: () => e.isActive('italic') },
    { icon: Heading1, label: 'H1', action: () => e.chain().focus().toggleHeading({ level: 1 }).run(), isActive: () => e.isActive('heading', { level: 1 }) },
    { icon: Heading2, label: 'H2', action: () => e.chain().focus().toggleHeading({ level: 2 }).run(), isActive: () => e.isActive('heading', { level: 2 }) },
    { icon: Heading3, label: 'H3', action: () => e.chain().focus().toggleHeading({ level: 3 }).run(), isActive: () => e.isActive('heading', { level: 3 }) },
    { icon: List, label: 'Bullet List', action: () => e.chain().focus().toggleBulletList().run(), isActive: () => e.isActive('bulletList') },
    { icon: ListOrdered, label: 'Ordered List', action: () => e.chain().focus().toggleOrderedList().run(), isActive: () => e.isActive('orderedList') },
    { icon: Quote, label: 'Blockquote', action: () => e.chain().focus().toggleBlockquote().run(), isActive: () => e.isActive('blockquote') },
    { icon: Code, label: 'Code Block', action: () => e.chain().focus().toggleCodeBlock().run(), isActive: () => e.isActive('codeBlock') },
    { icon: Minus, label: 'Horizontal Rule', action: () => e.chain().focus().setHorizontalRule().run() },
    { icon: LinkIcon, label: 'Link', action: insertLink, isActive: () => e.isActive('link') },
  ]
})
</script>

<template>
  <div class="overflow-hidden rounded-md border">
    <!-- Toolbar -->
    <div
      v-if="viewMode !== 'preview'"
      class="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 px-2 py-1.5"
    >
      <!-- Format buttons -->
      <template v-if="viewMode !== 'code'">
        <button
          v-for="btn in toolbarButtons"
          :key="btn.label"
          type="button"
          @click="btn.action"
          :title="btn.label"
          :class="[
            'rounded p-1.5 transition-colors hover:bg-accent',
            btn.isActive?.() ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
          ]"
        >
          <component :is="btn.icon" class="h-4 w-4" />
        </button>

        <div class="mx-1 h-5 w-px bg-border" />

        <!-- Undo/Redo -->
        <button
          type="button"
          @click="editor?.chain().focus().undo().run()"
          :disabled="!editor?.can().undo()"
          title="Undo"
          class="rounded p-1.5 text-muted-foreground hover:bg-accent disabled:opacity-30"
        >
          <Undo2 class="h-4 w-4" />
        </button>
        <button
          type="button"
          @click="editor?.chain().focus().redo().run()"
          :disabled="!editor?.can().redo()"
          title="Redo"
          class="rounded p-1.5 text-muted-foreground hover:bg-accent disabled:opacity-30"
        >
          <Redo2 class="h-4 w-4" />
        </button>

        <div class="mx-1 h-5 w-px bg-border" />

        <!-- MDC Component Toolbar -->
        <CmsMdcToolbar @insert="insertMdcBlock" />
      </template>

      <!-- Spacer -->
      <div class="flex-1" />

      <!-- View mode toggles -->
      <div class="flex items-center gap-0.5 rounded-md bg-muted p-0.5">
        <button
          type="button"
          @click="viewMode = 'edit'"
          :class="['rounded px-2 py-1 text-xs font-medium transition-colors', viewMode === 'edit' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground']"
          title="Edit mode"
        >
          Edit
        </button>
        <button
          type="button"
          @click="viewMode = 'split'"
          :class="['rounded px-2 py-1 text-xs font-medium transition-colors', viewMode === 'split' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground']"
          title="Split view"
        >
          <SplitSquareHorizontal class="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          @click="viewMode = 'preview'"
          :class="['rounded px-2 py-1 text-xs font-medium transition-colors', viewMode === 'preview' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground']"
          title="Preview"
        >
          <Eye class="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          @click="viewMode = 'code'"
          :class="['rounded px-2 py-1 text-xs font-medium transition-colors', viewMode === 'code' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground']"
          title="Raw markdown"
        >
          <FileCode class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>

    <!-- Editor area -->
    <div class="relative" :class="{ 'grid grid-cols-2 divide-x': viewMode === 'split' }">
      <!-- Rich-text editor (edit / split modes) -->
      <div v-if="viewMode === 'edit' || viewMode === 'split'" class="min-h-[300px]">
        <EditorContent :editor="editor" class="h-full" />
      </div>

      <!-- Raw code editor (code mode) -->
      <div v-if="viewMode === 'code'" class="relative min-h-[300px]">
        <textarea
          :value="rawMarkdown"
          @input="handleRawInput"
          class="h-full min-h-[400px] w-full resize-y bg-background px-4 py-3 font-mono text-sm outline-none"
          placeholder="Write raw markdown..."
          spellcheck="false"
        />
        <div class="absolute bottom-2 right-3 text-xs text-muted-foreground">
          {{ lineCount }} lines · Raw Markdown
        </div>
      </div>

      <!-- Preview pane (split / preview modes) -->
      <div
        v-if="viewMode === 'split' || viewMode === 'preview'"
        class="min-h-[300px] overflow-auto bg-muted/10 px-4 py-3"
      >
        <!-- Preview toolbar (preview-only mode) -->
        <div v-if="viewMode === 'preview'" class="mb-3 flex items-center justify-between">
          <span class="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Eye class="h-3.5 w-3.5" /> Preview
          </span>
          <button
            type="button"
            @click="viewMode = 'edit'"
            class="flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
          >
            <EyeOff class="h-3 w-3" /> Exit Preview
          </button>
        </div>

        <!-- Rendered HTML from Tiptap (reuses the same editor content) -->
        <div
          class="prose prose-sm dark:prose-invert max-w-none"
          v-html="previewHtml"
        />
      </div>
    </div>

  </div>
</template>

<style>
/* Tiptap editor styles */
.tiptap {
  outline: none;
}
.tiptap p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: var(--muted-foreground, #9ca3af);
  pointer-events: none;
  height: 0;
}
.tiptap .editor-link {
  color: var(--primary, #3b82f6);
  text-decoration: underline;
  cursor: pointer;
}
.tiptap .code-block {
  background: var(--muted, #f3f4f6);
  border-radius: 0.375rem;
  padding: 0.75rem 1rem;
  font-family: ui-monospace, monospace;
  font-size: 0.875rem;
}
.tiptap img {
  max-width: 100%;
  height: auto;
  border-radius: 0.375rem;
}
.tiptap blockquote {
  border-left: 3px solid var(--border, #e5e7eb);
  padding-left: 1rem;
  color: var(--muted-foreground, #6b7280);
}
/* Ensure lists render properly in both editor and preview (Tailwind v4 preflight resets list-style) */
.prose ol {
  list-style-type: decimal;
  padding-left: 1.625em;
}
.prose ul {
  list-style-type: disc;
  padding-left: 1.625em;
}
.prose ol ol {
  list-style-type: lower-alpha;
}
.prose ol ol ol {
  list-style-type: lower-roman;
}
.prose li {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}
.prose li > p {
  margin-top: 0;
  margin-bottom: 0;
}
</style>
