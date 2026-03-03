<script setup lang="ts">
/**
 * MdcBlockView — Tiptap NodeView component for MDC component blocks.
 *
 * Phase A: Inline-preview node views — the editor surface renders styled
 * previews that match the published output. Components are still `atom: true`
 * (no typing inside), but the visual appearance is the real callout, accordion,
 * image, video, etc.  A floating toolbar appears on hover for edit/delete/drag.
 */
import { ref } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import {
  Play, Globe, CodeXml, Presentation, ClipboardList, Box, Package, Quote,
  Pencil, Trash2, GripVertical, FolderOpen,
  AlertTriangle, ChevronsUpDown, LayoutGrid, RectangleHorizontal, Minus as MinusIcon, ArrowUpDown, ImagePlus,
  Image as ImageIcon, ExternalLink,
  ChevronUp, ChevronDown,
} from 'lucide-vue-next'
import { CONTAINER_COMPONENT_NAMES } from './MdcBlockExtension'

const props = defineProps<{
  node: any
  updateAttributes: (attrs: Record<string, any>) => void
  deleteNode: () => void
  editor: any
  selected: boolean
  getPos: () => number
}>()

const componentType = computed(() => props.node.attrs.componentType || '')
const mdcProps = computed(() => {
  try {
    return JSON.parse(props.node.attrs.mdcProps || '{}')
  } catch {
    return {}
  }
})

const editing = ref(false)
const editValues = ref<Record<string, any>>({})
const hovered = ref(false)
const dragging = ref(false)

/** Visible = hovered or selected or mid-drag (not editing) */
const showControls = computed(() => (hovered.value || props.selected || dragging.value) && !editing.value)

function onMouseEnter() { hovered.value = true }
function onMouseLeave() {
  // Don't hide controls mid-drag — the cursor leaves the element during drag
  if (!dragging.value) hovered.value = false
}
function onDragStart() { dragging.value = true }
function onDragEnd() { dragging.value = false; hovered.value = false }

// ─── Programmatic move up/down ─────────────────────────────
function moveUp() {
  const pos = props.getPos()
  if (typeof pos !== 'number') return
  const { state, dispatch } = props.editor.view
  const node = state.doc.nodeAt(pos)
  if (!node) return
  const $pos = state.doc.resolve(pos)
  const index = $pos.index($pos.depth)
  if (index === 0) return // already first
  const prevNode = $pos.parent.child(index - 1)
  const prevPos = pos - prevNode.nodeSize
  const tr = state.tr
  tr.delete(pos, pos + node.nodeSize)
  // prevPos is before the deletion so it maps to itself
  tr.insert(tr.mapping.map(prevPos), node)
  dispatch(tr.scrollIntoView())
}

function moveDown() {
  const pos = props.getPos()
  if (typeof pos !== 'number') return
  const { state, dispatch } = props.editor.view
  const node = state.doc.nodeAt(pos)
  if (!node) return
  const afterPos = pos + node.nodeSize
  if (afterPos >= state.doc.content.size) return // already last
  const nextNode = state.doc.nodeAt(afterPos)
  if (!nextNode) return
  const nextEnd = afterPos + nextNode.nodeSize
  const tr = state.tr
  tr.delete(pos, pos + node.nodeSize)
  const insertPos = tr.mapping.map(nextEnd)
  tr.insert(insertPos, node)
  dispatch(tr.scrollIntoView())
}

// Media picker state
const showFilePicker = ref(false)
const filePickerField = ref('')
const filePickerTypes = ref<string[]>([])
const filePickerTitle = ref('Select a file')

// Component metadata — `browse` on a field indicates it can use the media picker
interface FieldDef {
  name: string
  label: string
  type: string  // 'string' | 'boolean' | 'select'
  browse?: string[]  // allowed media types for picker (e.g. ['image'], ['3d'])
  options?: string[]  // for select type
}

// Shared layout fields for media components
const layoutFieldDefs: FieldDef[] = [
  { name: 'align', label: 'Alignment', type: 'select', options: ['center', 'left', 'right', 'full'] },
  { name: 'size', label: 'Size', type: 'select', options: ['full', 'large', 'medium', 'small'] },
  { name: 'float', label: 'Text Wrap', type: 'select', options: ['none', 'left', 'right'] },
]

const componentMeta: Record<string, { label: string; icon: any; color: string; fields: FieldDef[] }> = {
  'image-component': {
    label: 'Image',
    icon: FolderOpen,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
    fields: [
      { name: 'src', label: 'Image File', type: 'string', browse: ['image'] },
      { name: 'alt', label: 'Alt Text', type: 'string' },
      { name: 'caption', label: 'Caption', type: 'string' },
      { name: 'credit', label: 'Credit / Attribution', type: 'string' },
      { name: 'creditUrl', label: 'Credit URL', type: 'string' },
      ...layoutFieldDefs,
    ],
  },
  'video-component': {
    label: 'Video',
    icon: Play,
    color: 'text-red-500 bg-red-500/10 border-red-500/30',
    fields: [
      { name: 'src', label: 'Video URL', type: 'string' },
      { name: 'title', label: 'Title', type: 'string' },
      { name: 'caption', label: 'Caption', type: 'string' },
      { name: 'credit', label: 'Credit / Attribution', type: 'string' },
      { name: 'creditUrl', label: 'Credit URL', type: 'string' },
      ...layoutFieldDefs,
    ],
  },
  // Legacy alias — existing content still uses ::youtube-video
  'youtube-video': {
    label: 'Video (YouTube)',
    icon: Play,
    color: 'text-red-500 bg-red-500/10 border-red-500/30',
    fields: [
      { name: 'id', label: 'Video ID', type: 'string' },
      { name: 'title', label: 'Title', type: 'string' },
    ],
  },
  'iframe-component': {
    label: 'Embed (iframe)',
    icon: Globe,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
    fields: [
      { name: 'src', label: 'URL', type: 'string' },
      { name: 'title', label: 'Title', type: 'string' },
      { name: 'height', label: 'Height (px)', type: 'string' },
      { name: 'caption', label: 'Caption', type: 'string' },
      { name: 'credit', label: 'Credit / Attribution', type: 'string' },
      { name: 'creditUrl', label: 'Credit URL', type: 'string' },
      ...layoutFieldDefs,
    ],
  },
  'code-embed-component': {
    label: 'Code Embed',
    icon: CodeXml,
    color: 'text-orange-500 bg-orange-500/10 border-orange-500/30',
    fields: [
      { name: 'provider', label: 'Provider', type: 'string' },
      { name: 'src', label: 'URL or ID', type: 'string' },
      { name: 'title', label: 'Title', type: 'string' },
      { name: 'height', label: 'Height (px)', type: 'string' },
      { name: 'caption', label: 'Caption', type: 'string' },
      { name: 'credit', label: 'Credit / Attribution', type: 'string' },
      { name: 'creditUrl', label: 'Credit URL', type: 'string' },
    ],
  },
  'google-slides-component': {
    label: 'Google Slides',
    icon: Presentation,
    color: 'text-green-500 bg-green-500/10 border-green-500/30',
    fields: [
      { name: 'id', label: 'Presentation ID', type: 'string' },
      { name: 'title', label: 'Title', type: 'string' },
      { name: 'caption', label: 'Caption', type: 'string' },
      { name: 'credit', label: 'Credit / Attribution', type: 'string' },
      { name: 'creditUrl', label: 'Credit URL', type: 'string' },
    ],
  },
  'rubric-component': {
    label: 'Assessment Rubric',
    icon: ClipboardList,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
    fields: [
      { name: 'id', label: 'Rubric ID', type: 'string' },
    ],
  },
  'sketchfab-component': {
    label: 'Sketchfab Model',
    icon: Box,
    color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30',
    fields: [
      { name: 'src', label: 'Sketchfab URL', type: 'string' },
      { name: 'title', label: 'Title', type: 'string' },
      { name: 'height', label: 'Height', type: 'string' },
      { name: 'caption', label: 'Caption', type: 'string' },
      { name: 'credit', label: 'Credit / Attribution', type: 'string' },
      { name: 'creditUrl', label: 'Credit URL', type: 'string' },
    ],
  },
  'threed-viewer-component': {
    label: '3D Model Viewer',
    icon: Package,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
    fields: [
      { name: 'src', label: 'File Path', type: 'string', browse: ['3d'] },
      { name: 'title', label: 'Title', type: 'string' },
      { name: 'height', label: 'Height', type: 'string' },
      { name: 'autoRotate', label: 'Auto Rotate', type: 'boolean' },
      { name: 'caption', label: 'Caption', type: 'string' },
      { name: 'credit', label: 'Credit / Attribution', type: 'string' },
      { name: 'creditUrl', label: 'Credit URL', type: 'string' },
    ],
  },
  'cite-reference': {
    label: 'Citation',
    icon: Quote,
    color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/30',
    fields: [
      { name: 'label', label: 'Short Label', type: 'string' },
      { name: 'text', label: 'Full Citation', type: 'string' },
      { name: 'url', label: 'Source URL', type: 'string' },
    ],
  },
  // ─── Container components ─────────────────────────────────
  'callout': {
    label: 'Callout',
    icon: AlertTriangle,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
    fields: [
      { name: 'type', label: 'Type', type: 'select', options: ['info', 'tip', 'warning', 'danger', 'definition', 'objective'] },
      { name: 'title', label: 'Title', type: 'string' },
    ],
  },
  'accordion': {
    label: 'Accordion',
    icon: ChevronsUpDown,
    color: 'text-teal-500 bg-teal-500/10 border-teal-500/30',
    fields: [
      { name: 'title', label: 'Title', type: 'string' },
    ],
  },
  'card-block': {
    label: 'Card',
    icon: RectangleHorizontal,
    color: 'text-violet-500 bg-violet-500/10 border-violet-500/30',
    fields: [
      { name: 'title', label: 'Title', type: 'string' },
      { name: 'variant', label: 'Variant', type: 'select', options: ['outlined', 'filled', 'elevated'] },
    ],
  },
  'figure': {
    label: 'Figure',
    icon: ImagePlus,
    color: 'text-emerald-600 bg-emerald-600/10 border-emerald-600/30',
    fields: [
      { name: 'caption', label: 'Caption', type: 'string' },
      { name: 'align', label: 'Alignment', type: 'select', options: ['center', 'left', 'right'] },
    ],
  },
  'columns': {
    label: 'Columns',
    icon: LayoutGrid,
    color: 'text-orange-600 bg-orange-600/10 border-orange-600/30',
    fields: [
      { name: 'count', label: 'Column Count', type: 'select', options: ['2', '3', '4'] },
      { name: 'gap', label: 'Gap', type: 'select', options: ['sm', 'md', 'lg'] },
    ],
  },
  'content-divider': {
    label: 'Divider',
    icon: MinusIcon,
    color: 'text-gray-500 bg-gray-500/10 border-gray-500/30',
    fields: [
      { name: 'label', label: 'Label', type: 'string' },
    ],
  },
  'spacer': {
    label: 'Spacer',
    icon: ArrowUpDown,
    color: 'text-gray-400 bg-gray-400/10 border-gray-400/30',
    fields: [
      { name: 'size', label: 'Size', type: 'select', options: ['sm', 'md', 'lg', 'xl'] },
    ],
  },
}

const meta = computed(() => componentMeta[componentType.value] || {
  label: componentType.value,
  icon: Box,
  color: 'text-gray-500 bg-gray-500/10 border-gray-500/30',
  fields: [],
})

const isContainer = computed(() => CONTAINER_COMPONENT_NAMES.includes(componentType.value))

// ─── Helpers ─────────────────────────────────────────────
/** Extract a YouTube video ID from various URL formats or a bare ID */
function extractYouTubeId(input: string): string | null {
  if (!input) return null
  if (/^[\w-]{11}$/.test(input)) return input
  try {
    const url = new URL(input)
    const host = url.hostname.replace(/^www\./, '')
    if ((host === 'youtube.com' || host === 'youtube-nocookie.com') && url.searchParams.get('v'))
      return url.searchParams.get('v')
    const embedMatch = url.pathname.match(/\/embed\/([\w-]{11})/)
    if (embedMatch) return embedMatch[1]!
    if (host === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0]
      if (id && /^[\w-]{11}$/.test(id)) return id
    }
  } catch { /* not a URL */ }
  return null
}

/** YouTube thumbnail URL from video ID */
const ytThumbnail = computed(() => {
  const raw = mdcProps.value.src || mdcProps.value.id || ''
  const id = extractYouTubeId(raw)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
})

/** Google Slides embed URL */
const slidesEmbedUrl = computed(() => {
  const raw = (mdcProps.value.id || '').trim()
  if (!raw) return null
  let slideId = raw
  if (slideId.includes('docs.google.com')) {
    const docIdMatch = slideId.match(/\/d\/e?\/([a-zA-Z0-9_-]+)/)
    slideId = docIdMatch ? docIdMatch[1]! : ''
  }
  if (!slideId || !/^[a-zA-Z0-9_-]+$/.test(slideId)) return null
  if (slideId.startsWith('2PACX'))
    return `https://docs.google.com/presentation/d/e/${slideId}/pubembed?start=false&loop=false&delayms=3000`
  return `https://docs.google.com/presentation/d/${slideId}/embed?start=false&loop=false&delayms=3000`
})

/** Callout icon map */
const calloutIcons: Record<string, string> = { info: 'ℹ️', tip: '💡', warning: '⚠️', danger: '🚫', definition: '📖', objective: '🎯' }

/** Accordion open state for preview */
const accordionOpen = ref(false)

/** Render body text with simple inline markdown → HTML */
function renderBody(body: string): string {
  if (!body) return ''
  return body.split('\n').map(line => {
    const t = line.trim()
    if (!t) return ''
    return t
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded max-w-full" />')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline">$1</a>')
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1 py-0.5 text-xs">$1</code>')
  }).filter(Boolean).map(l => `<p class="mb-1 last:mb-0">${l}</p>`).join('')
}

const bodyHtml = computed(() => renderBody(mdcProps.value._body || ''))

// Summary line showing key props (used in compact/toolbar display)
const summary = computed(() => {
  const p = mdcProps.value
  if (p.title && p.title !== meta.value.label) return p.title
  if (p.id) return p.id
  if (p.src) {
    const src = p.src as string
    return src.length > 50 ? src.substring(0, 47) + '...' : src
  }
  return 'Click edit to configure'
})

function startEdit() {
  editValues.value = { ...mdcProps.value }
  editing.value = true
}

function saveEdit() {
  const newProps = { ...editValues.value }
  const body = newProps._body ?? ''
  const propEntries = Object.entries(newProps)
    .filter(([k, v]) => k !== '_body' && v !== '' && v !== undefined && v !== null)
  const attrStr = propEntries
    .map(([k, v]) => {
      if (typeof v === 'boolean') return v ? `${k}="true"` : `${k}="false"`
      return `${k}="${v}"`
    })
    .join(' ')

  let newMdcRaw: string
  if (isContainer.value) {
    newMdcRaw = `:::${componentType.value}{${attrStr}}\n${body}\n:::`
  } else {
    newMdcRaw = `::${componentType.value}{${attrStr}}\n::`
  }

  props.updateAttributes({
    mdcProps: JSON.stringify(newProps),
    mdcRaw: newMdcRaw,
  })

  editing.value = false
}

function cancelEdit() {
  editing.value = false
}

// Open media picker for a specific field
function openFilePicker(field: FieldDef) {
  filePickerField.value = field.name
  filePickerTypes.value = field.browse || []
  filePickerTitle.value = `Select ${field.label}`
  showFilePicker.value = true
}

function handleFilePickerSelect(path: string) {
  editValues.value[filePickerField.value] = path
  showFilePicker.value = false
}
</script>

<template>
  <NodeViewWrapper
    class="mdc-nodeview-root group/mdc relative my-3 transition-all"
    :class="[selected ? 'ring-2 ring-primary ring-offset-2 rounded-lg' : '']"
    contenteditable="false"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
  >
    <!-- ═══ Floating toolbar — uses opacity (always in DOM so ProseMirror finds data-drag-handle) ═══ -->
    <div
      class="absolute -top-9 right-1 z-20 flex items-center gap-0.5 rounded-md border bg-background/95 px-1 py-0.5 shadow-lg backdrop-blur-sm transition-opacity"
      :class="showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'"
    >
      <!-- Drag handle — always in DOM for ProseMirror -->
      <div class="cursor-grab px-1 text-muted-foreground hover:text-foreground active:cursor-grabbing" data-drag-handle title="Drag to reorder">
        <GripVertical class="h-3.5 w-3.5" />
      </div>
      <div class="h-4 w-px bg-border" />
      <button type="button" @click.stop="moveUp" class="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground" title="Move up">
        <ChevronUp class="h-3.5 w-3.5" />
      </button>
      <button type="button" @click.stop="moveDown" class="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground" title="Move down">
        <ChevronDown class="h-3.5 w-3.5" />
      </button>
      <div class="h-4 w-px bg-border" />
      <button type="button" @click.stop="startEdit" class="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground" title="Edit component">
        <Pencil class="h-3.5 w-3.5" />
      </button>
      <button type="button" @click.stop="deleteNode" class="rounded p-1 text-muted-foreground hover:bg-red-500/20 hover:text-red-600" title="Remove component">
        <Trash2 class="h-3.5 w-3.5" />
      </button>
      <div class="h-4 w-px bg-border" />
      <span class="px-1.5 text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider">{{ meta.label }}</span>
    </div>

    <!-- ═══ Inline Preview (non-editing state) ════════════════════ -->
    <div v-if="!editing" class="cursor-pointer" @dblclick.stop="startEdit">

      <!-- ─── Image ───────────────────────────────────────────── -->
      <template v-if="componentType === 'image-component'">
        <figure v-if="mdcProps.src" class="mdc-nodeview-figure">
          <img :src="mdcProps.src" :alt="mdcProps.alt || ''" class="rounded-md max-w-full mx-auto block" loading="lazy" />
          <figcaption v-if="mdcProps.caption || mdcProps.credit" class="mt-2 text-center text-sm text-muted-foreground">
            <template v-if="mdcProps.caption">{{ mdcProps.caption }}</template>
            <template v-if="mdcProps.caption && mdcProps.credit"> — </template>
            <template v-if="mdcProps.credit">{{ mdcProps.credit }}</template>
          </figcaption>
        </figure>
        <div v-else class="flex items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-muted-foreground">
          <ImageIcon class="h-5 w-5" />
          <span class="text-sm">No image selected — double-click to add</span>
        </div>
      </template>

      <!-- ─── Video (YouTube / generic) ──────────────────────── -->
      <template v-else-if="componentType === 'video-component' || componentType === 'youtube-video'">
        <div v-if="ytThumbnail" class="mdc-nodeview-video relative overflow-hidden rounded-lg">
          <img :src="ytThumbnail" :alt="mdcProps.title || 'Video'" class="w-full aspect-video object-cover" loading="lazy" />
          <div class="absolute inset-0 flex items-center justify-center bg-black/20">
            <div class="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 shadow-lg">
              <Play class="h-6 w-6 text-white ml-0.5" fill="currentColor" />
            </div>
          </div>
          <div v-if="mdcProps.title" class="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/70 to-transparent px-4 py-3">
            <span class="text-sm font-medium text-white">{{ mdcProps.title }}</span>
          </div>
        </div>
        <div v-else-if="mdcProps.src || mdcProps.id" class="flex items-center gap-3 rounded-lg border p-4">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
            <Play class="h-5 w-5" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium">{{ mdcProps.title || 'Video' }}</div>
            <div class="truncate text-xs text-muted-foreground">{{ mdcProps.src || mdcProps.id }}</div>
          </div>
        </div>
        <div v-else class="flex items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-muted-foreground">
          <Play class="h-5 w-5" />
          <span class="text-sm">No video URL specified — double-click to add</span>
        </div>
      </template>

      <!-- ─── Google Slides ──────────────────────────────────── -->
      <template v-else-if="componentType === 'google-slides-component'">
        <div v-if="slidesEmbedUrl" class="overflow-hidden rounded-lg border">
          <iframe :src="slidesEmbedUrl" :title="mdcProps.title || 'Google Slides'" class="w-full aspect-video" frameborder="0" allowfullscreen></iframe>
        </div>
        <div v-else class="flex items-center gap-3 rounded-lg border p-4">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-500">
            <Presentation class="h-5 w-5" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium">{{ mdcProps.title || 'Google Slides' }}</div>
            <div class="text-xs text-muted-foreground">{{ mdcProps.id || 'No presentation ID — double-click to add' }}</div>
          </div>
        </div>
      </template>

      <!-- ─── 3D Model Viewer ────────────────────────────────── -->
      <template v-else-if="componentType === 'threed-viewer-component'">
        <div v-if="mdcProps.src" class="overflow-hidden rounded-lg border">
          <model-viewer
            :src="mdcProps.src"
            :alt="mdcProps.title || '3D Model'"
            camera-controls
            :auto-rotate="mdcProps.autoRotate === true || mdcProps.autoRotate === 'true' ? '' : undefined"
            shadow-intensity="1"
            :style="{ width: '100%', height: (mdcProps.height || '400') + 'px', backgroundColor: 'transparent' }"
          ></model-viewer>
          <div v-if="mdcProps.caption" class="px-3 py-2 text-center text-sm text-muted-foreground border-t">{{ mdcProps.caption }}</div>
        </div>
        <div v-else class="flex items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-muted-foreground">
          <Package class="h-5 w-5" />
          <span class="text-sm">No 3D model file — double-click to add</span>
        </div>
      </template>

      <!-- ─── Sketchfab ──────────────────────────────────────── -->
      <template v-else-if="componentType === 'sketchfab-component'">
        <div v-if="mdcProps.src" class="flex items-center gap-3 rounded-lg border p-4">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500">
            <Box class="h-5 w-5" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium">{{ mdcProps.title || 'Sketchfab Model' }}</div>
            <div class="truncate text-xs text-muted-foreground">{{ mdcProps.src }}</div>
          </div>
        </div>
        <div v-else class="flex items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-muted-foreground">
          <Box class="h-5 w-5" />
          <span class="text-sm">No Sketchfab URL — double-click to add</span>
        </div>
      </template>

      <!-- ─── iFrame Embed ───────────────────────────────────── -->
      <template v-else-if="componentType === 'iframe-component'">
        <div v-if="mdcProps.src" class="flex items-center gap-3 rounded-lg border p-4">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
            <Globe class="h-5 w-5" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium">{{ mdcProps.title || 'Embed' }}</div>
            <div class="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <ExternalLink class="h-3 w-3 shrink-0" />
              {{ mdcProps.src }}
            </div>
          </div>
        </div>
        <div v-else class="flex items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-muted-foreground">
          <Globe class="h-5 w-5" />
          <span class="text-sm">No URL — double-click to add</span>
        </div>
      </template>

      <!-- ─── Code Embed ─────────────────────────────────────── -->
      <template v-else-if="componentType === 'code-embed-component'">
        <div v-if="mdcProps.src" class="flex items-center gap-3 rounded-lg border p-4">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
            <CodeXml class="h-5 w-5" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium">{{ mdcProps.title || 'Code Example' }}</div>
            <div class="truncate text-xs text-muted-foreground">{{ mdcProps.provider ? `${mdcProps.provider}: ` : '' }}{{ mdcProps.src }}</div>
          </div>
        </div>
        <div v-else class="flex items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-muted-foreground">
          <CodeXml class="h-5 w-5" />
          <span class="text-sm">No code embed — double-click to add</span>
        </div>
      </template>

      <!-- ─── Rubric ─────────────────────────────────────────── -->
      <template v-else-if="componentType === 'rubric-component'">
        <div class="flex items-center gap-3 rounded-lg border p-4">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
            <ClipboardList class="h-5 w-5" />
          </div>
          <div>
            <div class="text-sm font-medium">Assessment Rubric</div>
            <div class="text-xs text-muted-foreground">{{ mdcProps.id || 'No rubric selected' }}</div>
          </div>
        </div>
      </template>

      <!-- ─── Citation (inline) ──────────────────────────────── -->
      <template v-else-if="componentType === 'cite-reference'">
        <span class="inline-flex items-center rounded bg-indigo-500/10 px-1.5 py-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
          [{{ mdcProps.label || 'cite' }}]
        </span>
      </template>

      <!-- ─── Callout (container) ────────────────────────────── -->
      <template v-else-if="componentType === 'callout'">
        <div :class="['callout', `callout-${mdcProps.type || 'info'}`]" role="note">
          <div class="callout-icon" aria-hidden="true">{{ calloutIcons[mdcProps.type || 'info'] || 'ℹ️' }}</div>
          <div class="callout-content">
            <div v-if="mdcProps.title" class="callout-title">{{ mdcProps.title }}</div>
            <div v-if="mdcProps._body" class="prose prose-sm max-w-none text-sm" v-html="bodyHtml" />
            <div v-else class="text-sm text-muted-foreground italic">Double-click to add content…</div>
          </div>
        </div>
      </template>

      <!-- ─── Accordion (container) ──────────────────────────── -->
      <template v-else-if="componentType === 'accordion'">
        <div class="mdc-accordion" :data-open="accordionOpen">
          <button
            type="button"
            class="mdc-accordion-trigger"
            :aria-expanded="accordionOpen"
            @click.stop="accordionOpen = !accordionOpen"
          >
            <span>{{ mdcProps.title || 'Accordion' }}</span>
            <svg class="mdc-accordion-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div v-show="accordionOpen" class="mdc-accordion-body">
            <div v-if="mdcProps._body" class="prose prose-sm max-w-none text-sm" v-html="bodyHtml" />
            <div v-else class="text-sm text-muted-foreground italic">Double-click to add content…</div>
          </div>
        </div>
      </template>

      <!-- ─── Card Block (container) ─────────────────────────── -->
      <template v-else-if="componentType === 'card-block'">
        <div :class="['mdc-card', mdcProps.variant === 'filled' ? 'mdc-card-filled' : '', mdcProps.variant === 'elevated' ? 'mdc-card-elevated' : '']">
          <div v-if="mdcProps.title" class="mdc-card-header">
            <h3 class="mdc-card-title">{{ mdcProps.title }}</h3>
          </div>
          <div class="mdc-card-body">
            <div v-if="mdcProps._body" class="prose prose-sm max-w-none text-sm" v-html="bodyHtml" />
            <div v-else class="text-sm text-muted-foreground italic">Double-click to add content…</div>
          </div>
        </div>
      </template>

      <!-- ─── Figure (container) ─────────────────────────────── -->
      <template v-else-if="componentType === 'figure'">
        <figure :class="['mdc-figure', mdcProps.align === 'left' ? 'mdc-align-left' : mdcProps.align === 'right' ? 'mdc-align-right' : 'mdc-align-center']">
          <div v-if="mdcProps._body" class="prose prose-sm max-w-none text-sm" v-html="bodyHtml" />
          <div v-else class="flex items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-muted-foreground">
            <ImagePlus class="h-5 w-5" />
            <span class="text-sm">Double-click to add figure content…</span>
          </div>
          <figcaption v-if="mdcProps.caption" class="mdc-figure-caption">{{ mdcProps.caption }}</figcaption>
        </figure>
      </template>

      <!-- ─── Columns (container) ────────────────────────────── -->
      <template v-else-if="componentType === 'columns'">
        <div :class="['mdc-columns', `mdc-columns-${mdcProps.count || '2'}`, `mdc-columns-gap-${mdcProps.gap || 'md'}`]">
          <div v-if="mdcProps._body" class="mdc-col prose prose-sm max-w-none text-sm" style="grid-column: 1 / -1" v-html="bodyHtml" />
          <template v-else>
            <div v-for="n in Number(mdcProps.count || 2)" :key="n" class="mdc-col rounded border border-dashed p-4 text-center text-sm text-muted-foreground italic">
              Column {{ n }}
            </div>
          </template>
        </div>
      </template>

      <!-- ─── Content Divider ────────────────────────────────── -->
      <template v-else-if="componentType === 'content-divider'">
        <div class="mdc-divider" role="separator">
          <span v-if="mdcProps.label" class="mdc-divider-label">{{ mdcProps.label }}</span>
        </div>
      </template>

      <!-- ─── Spacer ─────────────────────────────────────────── -->
      <template v-else-if="componentType === 'spacer'">
        <div :class="`mdc-spacer-${mdcProps.size || 'md'}`" class="relative" aria-hidden="true">
          <div v-if="hovered || selected" class="absolute inset-0 flex items-center justify-center rounded border border-dashed border-muted-foreground/30">
            <span class="rounded bg-background/80 px-2 py-0.5 text-[10px] text-muted-foreground">Spacer ({{ mdcProps.size || 'md' }})</span>
          </div>
        </div>
      </template>

      <!-- ─── Unknown / Fallback ─────────────────────────────── -->
      <template v-else>
        <div class="flex items-center gap-3 rounded-lg border p-4">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg" :class="meta.color">
            <component :is="meta.icon" class="h-5 w-5" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium">{{ meta.label }}</div>
            <div class="truncate text-xs text-muted-foreground">{{ summary }}</div>
          </div>
        </div>
      </template>
    </div>

    <!-- ═══ Inline Edit Form ══════════════════════════════════════ -->
    <div v-if="editing" class="rounded-lg border-2 border-primary/40 bg-background shadow-lg">
      <!-- Edit header -->
      <div class="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
        <component :is="meta.icon" class="h-4 w-4 shrink-0" :class="meta.color.split(' ')[0]" />
        <span class="text-sm font-medium">Edit {{ meta.label }}</span>
        <div class="flex-1" />
        <button type="button" @click="cancelEdit" class="rounded p-1 text-muted-foreground hover:bg-accent" title="Cancel">
          <Trash2 class="h-3.5 w-3.5" />
        </button>
      </div>

      <div class="px-3 py-3 space-y-3">
        <div v-for="field in meta.fields" :key="field.name" class="space-y-1">
          <label class="text-xs font-medium text-foreground/70">{{ field.label }}</label>
          <template v-if="field.type === 'boolean'">
            <label class="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                v-model="editValues[field.name]"
                class="rounded border"
              />
              Enabled
            </label>
          </template>
          <template v-else-if="field.type === 'select' && field.options">
            <select
              v-model="editValues[field.name]"
              class="w-full rounded-md border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </template>
          <template v-else>
            <div class="flex gap-1.5">
              <input
                v-model="editValues[field.name]"
                type="text"
                class="flex-1 rounded-md border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <!-- Browse button for fields with media picker support -->
              <button
                v-if="field.browse"
                type="button"
                @click.stop="openFilePicker(field)"
                class="shrink-0 rounded-md border px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                title="Browse media library"
              >
                <FolderOpen class="h-3.5 w-3.5" />
              </button>
            </div>
          </template>
        </div>

        <!-- Body content textarea for container components -->
        <div v-if="isContainer" class="space-y-1">
          <label class="text-xs font-medium text-foreground/70">Content (Markdown)</label>
          <textarea
            v-model="editValues._body"
            rows="4"
            class="w-full rounded-md border bg-background px-2.5 py-1.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Write markdown content here..."
          />
        </div>

        <div class="flex justify-end gap-2 pt-1">
          <button
            type="button"
            @click="cancelEdit"
            class="rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="saveEdit"
            class="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90"
          >
            Save
          </button>
        </div>
      </div>
    </div>

    <!-- Media picker modal for browsable fields -->
    <CmsMediaPickerModal
      :open="showFilePicker"
      :allowed-types="filePickerTypes"
      :title="filePickerTitle"
      @select="handleFilePickerSelect"
      @close="showFilePicker = false"
    />
  </NodeViewWrapper>
</template>

<style scoped>
/* Ensure mdc-layout.css styles apply within the node view */
.mdc-nodeview-root :deep(.callout) {
  margin: 0;
}
.mdc-nodeview-root :deep(.mdc-accordion) {
  margin: 0;
}
.mdc-nodeview-root :deep(.mdc-card) {
  margin: 0;
}
.mdc-nodeview-root :deep(.mdc-figure) {
  margin: 0;
}
.mdc-nodeview-root :deep(.mdc-columns) {
  margin: 0;
}
.mdc-nodeview-root :deep(.mdc-divider) {
  margin: 1rem 0;
}


</style>
