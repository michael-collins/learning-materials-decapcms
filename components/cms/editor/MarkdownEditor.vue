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
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from 'tiptap-markdown'
import {
  Bold, Italic, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code, Minus, Link as LinkIcon,
  ImagePlus, Eye, EyeOff, SplitSquareHorizontal, FileCode,
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

// ─── Editor setup ──────────────────────────────────────────
const editor = useEditor({
  content: props.modelValue || '',
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
    Image.configure({
      inline: false,
      allowBase64: true,
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
  ],
  editorProps: {
    attributes: {
      class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] px-4 py-3',
    },
  },
  onUpdate: ({ editor: ed }) => {
    const md = ed.storage.markdown.getMarkdown()
    emit('update:modelValue', md)
  },
})

// Watch for external changes to modelValue
watch(() => props.modelValue, (newVal) => {
  if (!editor.value) return
  const currentMd = editor.value.storage.markdown.getMarkdown()
  if (newVal !== currentMd) {
    editor.value.commands.setContent(newVal || '')
  }
})

// ─── Code mode sync ────────────────────────────────────────
watch(viewMode, (mode, oldMode) => {
  if (mode === 'code') {
    // Entering code mode: sync raw markdown from editor
    rawMarkdown.value = editor.value?.storage.markdown.getMarkdown() || props.modelValue || ''
  } else if (oldMode === 'code') {
    // Leaving code mode: push raw markdown back into editor
    editor.value?.commands.setContent(rawMarkdown.value)
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

function insertImage() {
  const url = window.prompt('Enter image URL:')
  if (!url) return
  editor.value?.chain().focus().setImage({ src: url }).run()
}

// ─── MDC insertion ─────────────────────────────────────────
function insertMdcBlock(mdcSyntax: string) {
  // Insert the MDC syntax as raw text in a paragraph
  // The tiptap-markdown extension will preserve it
  editor.value?.chain().focus().insertContent(mdcSyntax).run()
}

onBeforeUnmount(() => {
  editor.value?.destroy()
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
    { icon: ImagePlus, label: 'Image', action: insertImage },
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
          v-html="editor?.getHTML() || '<p class=\'text-muted-foreground\'>Nothing to preview</p>'"
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
</style>
