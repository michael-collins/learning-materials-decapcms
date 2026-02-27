<script setup lang="ts">
/**
 * MdcToolbar — "Insert Component" dropdown for MDC shortcodes.
 *
 * Shows a dropdown menu with all available MDC editor components.
 * Clicking one opens the MdcComponentModal for configuring props,
 * then emits the generated MDC syntax string.
 */
import {
  Blocks, Play, Globe, CodeXml, Presentation, ClipboardList, Box, Package, Quote, ImagePlus,
  AlertTriangle, ChevronsUpDown, LayoutGrid, RectangleHorizontal, Minus, ArrowUpDown,
} from 'lucide-vue-next'

const emit = defineEmits<{
  insert: [mdcSyntax: string]
}>()

const showDropdown = ref(false)
const activeComponent = ref<MdcComponentDef | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const dropdownStyle = ref<Record<string, string>>({})

function toggleDropdown() {
  showDropdown.value = !showDropdown.value
  if (showDropdown.value) {
    nextTick(() => positionDropdown())
  }
}

function positionDropdown() {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  dropdownStyle.value = {
    position: 'fixed',
    left: `${rect.left}px`,
    top: `${rect.bottom + 4}px`,
    zIndex: '50',
  }
}

// ─── MDC component definitions ─────────────────────────────
export interface MdcFieldDef {
  name: string
  label: string
  widget: 'string' | 'select' | 'boolean' | 'file'
  default?: any
  required?: boolean
  hint?: string
  options?: string[]
  fileTypes?: string[]  // For file widget: allowed media types (e.g. ['3d'], ['image'])
}

export interface MdcComponentDef {
  id: string
  label: string
  icon: any
  color: string
  fields: MdcFieldDef[]
  toBlock: (values: Record<string, any>) => string
}

// ─── Shared layout fields for media components ─────────
const layoutFields: MdcFieldDef[] = [
  {
    name: 'align', label: 'Alignment', widget: 'select',
    options: ['center', 'left', 'right', 'full'],
    default: 'center', required: false, hint: 'Horizontal alignment within the content column',
  },
  {
    name: 'size', label: 'Size', widget: 'select',
    options: ['full', 'large', 'medium', 'small'],
    default: 'full', required: false, hint: 'Width relative to the content column',
  },
  {
    name: 'float', label: 'Text Wrap', widget: 'select',
    options: ['none', 'left', 'right'],
    default: 'none', required: false, hint: 'Float the media so text wraps around it',
  },
]

/** Append non-default layout props to a parts array */
function appendLayoutProps(parts: string[], v: Record<string, any>) {
  if (v.align && v.align !== 'center') parts.push(`align="${v.align}"`)
  if (v.size && v.size !== 'full') parts.push(`size="${v.size}"`)
  if (v.float && v.float !== 'none') parts.push(`float="${v.float}"`)
}

const mdcComponents: MdcComponentDef[] = [
  {
    id: 'image-component',
    label: 'Image',
    icon: ImagePlus,
    color: 'text-emerald-500',
    fields: [
      { name: 'src', label: 'Image File', widget: 'file', hint: 'Choose an image from the media library', fileTypes: ['image'] },
      { name: 'alt', label: 'Alt Text', widget: 'string', required: true, hint: 'Describe the image for accessibility (required)' },
      { name: 'caption', label: 'Caption', widget: 'string', required: false, hint: 'Optional caption shown below the image' },
      { name: 'credit', label: 'Credit / Attribution', widget: 'string', required: false, hint: 'Source attribution (photographer, publisher, etc.)' },
      { name: 'creditUrl', label: 'Credit URL', widget: 'string', required: false, hint: 'Link to original source' },
      ...layoutFields,
    ],
    toBlock: (v) => {
      const parts = [`src="${v.src}"`, `alt="${v.alt || ''}"`]
      if (v.caption) parts.push(`caption="${v.caption}"`)
      if (v.credit) parts.push(`credit="${v.credit}"`)
      if (v.creditUrl) parts.push(`creditUrl="${v.creditUrl}"`)
      appendLayoutProps(parts, v)
      return `::image-component{${parts.join(' ')}}\n::`
    },
  },
  {
    id: 'video-component',
    label: 'Video',
    icon: Play,
    color: 'text-red-500',
    fields: [
      { name: 'src', label: 'Video URL', widget: 'string', hint: 'YouTube, Vimeo, Kaltura, or other video URL' },
      { name: 'title', label: 'Title', widget: 'string', default: 'Video', required: false },
      { name: 'caption', label: 'Caption', widget: 'string', required: false, hint: 'Optional caption shown below the embed' },
      { name: 'credit', label: 'Credit / Attribution', widget: 'string', required: false, hint: 'Source attribution (author, publisher, etc.)' },
      { name: 'creditUrl', label: 'Credit URL', widget: 'string', required: false, hint: 'Link to original source' },
      ...layoutFields,
    ],
    toBlock: (v) => {
      const parts = [`src="${v.src}"`, `title="${v.title || 'Video'}"`]
      if (v.caption) parts.push(`caption="${v.caption}"`)
      if (v.credit) parts.push(`credit="${v.credit}"`)
      if (v.creditUrl) parts.push(`creditUrl="${v.creditUrl}"`)
      appendLayoutProps(parts, v)
      return `::video-component{${parts.join(' ')}}\n::`
    },
  },
  {
    id: 'iframe-component',
    label: 'Embed (iframe)',
    icon: Globe,
    color: 'text-blue-500',
    fields: [
      { name: 'src', label: 'URL', widget: 'string', hint: 'Any embeddable HTTPS URL' },
      { name: 'title', label: 'Title', widget: 'string', default: 'Embed', required: false },
      { name: 'height', label: 'Height (px)', widget: 'string', default: '500', required: false },
      { name: 'caption', label: 'Caption', widget: 'string', required: false, hint: 'Optional caption shown below the embed' },
      { name: 'credit', label: 'Credit / Attribution', widget: 'string', required: false, hint: 'Source attribution' },
      { name: 'creditUrl', label: 'Credit URL', widget: 'string', required: false, hint: 'Link to original source' },
      ...layoutFields,
    ],
    toBlock: (v) => {
      const parts = [`src="${v.src}"`, `title="${v.title || 'Embed'}"`]
      if (v.height && v.height !== '500') parts.push(`height="${v.height}"`)
      if (v.caption) parts.push(`caption="${v.caption}"`)
      if (v.credit) parts.push(`credit="${v.credit}"`)
      if (v.creditUrl) parts.push(`creditUrl="${v.creditUrl}"`)
      appendLayoutProps(parts, v)
      return `::iframe-component{${parts.join(' ')}}\n::`
    },
  },
  {
    id: 'code-embed-component',
    label: 'Code Embed',
    icon: CodeXml,
    color: 'text-orange-500',
    fields: [
      {
        name: 'provider', label: 'Provider', widget: 'select',
        options: ['codepen', 'jsfiddle', 'codesandbox', 'stackblitz', 'replit', 'glitch'],
        hint: 'Select the code playground provider',
      },
      { name: 'src', label: 'URL or Pen ID', widget: 'string', hint: 'Full URL or slug/ID from the provider' },
      { name: 'title', label: 'Title', widget: 'string', default: 'Code Example', required: false },
      { name: 'height', label: 'Height (px)', widget: 'string', default: '400', required: false },
      { name: 'caption', label: 'Caption', widget: 'string', required: false, hint: 'Optional caption shown below the embed' },
      { name: 'credit', label: 'Credit / Attribution', widget: 'string', required: false, hint: 'Source attribution' },
      { name: 'creditUrl', label: 'Credit URL', widget: 'string', required: false, hint: 'Link to original source' },
    ],
    toBlock: (v) => {
      const parts = [`provider="${v.provider}"`, `src="${v.src}"`, `title="${v.title || 'Code Example'}"`]
      if (v.height && v.height !== '400') parts.push(`height="${v.height}"`)
      if (v.caption) parts.push(`caption="${v.caption}"`)
      if (v.credit) parts.push(`credit="${v.credit}"`)
      if (v.creditUrl) parts.push(`creditUrl="${v.creditUrl}"`)
      return `::code-embed-component{${parts.join(' ')}}\n::`
    },
  },
  {
    id: 'google-slides',
    label: 'Google Slides',
    icon: Presentation,
    color: 'text-green-500',
    fields: [
      { name: 'id', label: 'Presentation ID or URL', widget: 'string', hint: 'ID or full URL from Google Slides' },
      { name: 'title', label: 'Presentation Title', widget: 'string', default: 'Presentation', required: false },
      { name: 'caption', label: 'Caption', widget: 'string', required: false, hint: 'Optional caption shown below the embed' },
      { name: 'credit', label: 'Credit / Attribution', widget: 'string', required: false, hint: 'Source attribution' },
      { name: 'creditUrl', label: 'Credit URL', widget: 'string', required: false, hint: 'Link to original source' },
    ],
    toBlock: (v) => {
      const parts = [`id="${v.id}"`, `title="${v.title || 'Presentation'}"`]
      if (v.caption) parts.push(`caption="${v.caption}"`)
      if (v.credit) parts.push(`credit="${v.credit}"`)
      if (v.creditUrl) parts.push(`creditUrl="${v.creditUrl}"`)
      return `::google-slides-component{${parts.join(' ')}}\n::`
    },
  },
  {
    id: 'rubric-component',
    label: 'Assessment Rubric',
    icon: ClipboardList,
    color: 'text-amber-500',
    fields: [
      {
        name: 'id', label: 'Rubric', widget: 'select',
        options: ['exercise', 'exercise-low-poly', 'project', 'task', 'written-statement'],
        hint: 'Select which rubric to display',
      },
    ],
    toBlock: (v) => `::rubric-component{id="${v.id}"}\n::`,
  },
  {
    id: 'sketchfab-viewer',
    label: 'Sketchfab Model',
    icon: Box,
    color: 'text-cyan-500',
    fields: [
      { name: 'src', label: 'Sketchfab URL', widget: 'string', hint: 'Paste the Sketchfab model URL' },
      { name: 'title', label: 'Model Title', widget: 'string', default: 'Sketchfab Model', required: false },
      { name: 'height', label: 'Viewer Height', widget: 'string', default: '600px', required: false, hint: 'CSS height value' },
      { name: 'caption', label: 'Caption', widget: 'string', required: false, hint: 'Optional caption shown below the viewer' },
      { name: 'credit', label: 'Credit / Attribution', widget: 'string', required: false, hint: 'Model creator / source attribution' },
      { name: 'creditUrl', label: 'Credit URL', widget: 'string', required: false, hint: 'Link to original source' },
    ],
    toBlock: (v) => {
      const parts = [`src="${v.src}"`, `title="${v.title || 'Sketchfab Model'}"`, `height="${v.height || '600px'}"`]
      if (v.caption) parts.push(`caption="${v.caption}"`)
      if (v.credit) parts.push(`credit="${v.credit}"`)
      if (v.creditUrl) parts.push(`creditUrl="${v.creditUrl}"`)
      return `::sketchfab-component{${parts.join(' ')}}\n::`
    },
  },
  {
    id: 'threed-viewer',
    label: '3D Model (Upload)',
    icon: Package,
    color: 'text-purple-500',
    fields: [
      { name: 'src', label: '3D File Path', widget: 'file', hint: 'Path to .gltf or .glb file in uploads', fileTypes: ['3d'] },
      { name: 'title', label: 'Model Title', widget: 'string', default: '3D Model', required: false },
      { name: 'height', label: 'Viewer Height', widget: 'string', default: '600px', required: false },
      { name: 'autoRotate', label: 'Auto-rotate', widget: 'boolean', default: true, required: false },
      { name: 'caption', label: 'Caption', widget: 'string', required: false, hint: 'Optional caption shown below the viewer' },
      { name: 'credit', label: 'Credit / Attribution', widget: 'string', required: false, hint: 'Model creator / source attribution' },
      { name: 'creditUrl', label: 'Credit URL', widget: 'string', required: false, hint: 'Link to original source' },
    ],
    toBlock: (v) => {
      const parts = [`src="${v.src}"`, `title="${v.title || '3D Model'}"`, `height="${v.height || '600px'}"`]
      if (v.autoRotate === false) parts.push('autoRotate="false"')
      if (v.caption) parts.push(`caption="${v.caption}"`)
      if (v.credit) parts.push(`credit="${v.credit}"`)
      if (v.creditUrl) parts.push(`creditUrl="${v.creditUrl}"`)
      return `::threed-viewer-component{${parts.join(' ')}}\n::`
    },
  },
  {
    id: 'cite-reference',
    label: 'Citation / Reference',
    icon: Quote,
    color: 'text-indigo-500',
    fields: [
      { name: 'label', label: 'Short Label', widget: 'string', hint: 'Brief identifier (e.g. author last name, "Figure 1")' },
      { name: 'text', label: 'Full Citation', widget: 'string', hint: 'Complete citation text (author, title, year, publisher, etc.)' },
      { name: 'url', label: 'Source URL', widget: 'string', required: false, hint: 'Link to the source' },
    ],
    toBlock: (v) => {
      const parts = [`label="${v.label}"`, `text="${v.text}"`]
      if (v.url) parts.push(`url="${v.url}"`)
      return `::cite-reference{${parts.join(' ')}}::`
    },
  },
]

// ─── Container / layout component snippets (code-mode) ────
interface MdcSnippetDef {
  id: string
  label: string
  icon: any
  color: string
  snippet: string
}

const mdcSnippets: MdcSnippetDef[] = [
  {
    id: 'callout',
    label: 'Callout',
    icon: AlertTriangle,
    color: 'text-blue-500',
    snippet: ':::callout{type="info" title="Note"}\nYour content here.\n:::\n',
  },
  {
    id: 'accordion',
    label: 'Accordion',
    icon: ChevronsUpDown,
    color: 'text-teal-500',
    snippet: ':::accordion{title="Click to expand"}\nHidden content here.\n:::\n',
  },
  {
    id: 'card-block',
    label: 'Card',
    icon: RectangleHorizontal,
    color: 'text-violet-500',
    snippet: ':::card-block{title="Card Title"}\nCard content here.\n:::\n',
  },
  {
    id: 'figure',
    label: 'Figure',
    icon: ImagePlus,
    color: 'text-emerald-600',
    snippet: ':::figure{caption="Figure 1: Description"}\n::image-component{src="/uploads/photo.jpg" alt="Description"}\n::\n:::\n',
  },
  {
    id: 'columns',
    label: 'Columns',
    icon: LayoutGrid,
    color: 'text-orange-600',
    snippet: ':::columns{count="2" gap="md"}\n#left\nLeft column content.\n\n#right\nRight column content.\n:::\n',
  },
  {
    id: 'content-divider',
    label: 'Divider',
    icon: Minus,
    color: 'text-gray-500',
    snippet: ':::content-divider{label="Section"}\n:::\n',
  },
  {
    id: 'spacer',
    label: 'Spacer',
    icon: ArrowUpDown,
    color: 'text-gray-400',
    snippet: '::spacer{size="md"}\n::\n',
  },
]

function openComponentModal(comp: MdcComponentDef) {
  activeComponent.value = comp
  showDropdown.value = false
}

function insertSnippet(snippet: MdcSnippetDef) {
  emit('insert', snippet.snippet)
  showDropdown.value = false
}

function handleInsert(values: Record<string, any>) {
  if (!activeComponent.value) return
  const syntax = activeComponent.value.toBlock(values)
  emit('insert', syntax)
  activeComponent.value = null
}

function handleCancel() {
  activeComponent.value = null
}
</script>

<template>
  <!-- Insert Component button -->
  <div class="relative">
    <button
      ref="triggerRef"
      type="button"
      @click="toggleDropdown()"
      class="flex items-center gap-1 rounded px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      title="Insert MDC Component"
    >
      <Blocks class="h-4 w-4" />
      <span class="hidden sm:inline">Insert</span>
    </button>
  </div>

  <!-- Click-outside to close dropdown -->
  <Teleport to="body">
    <div
      v-if="showDropdown"
      class="fixed inset-0 z-40"
      @click="showDropdown = false"
    />

    <!-- Component dropdown (teleported to escape overflow-hidden) -->
    <div
      v-if="showDropdown"
      :style="dropdownStyle"
      class="w-56 max-h-[28rem] overflow-y-auto rounded-md border bg-popover p-1 shadow-lg"
    >
      <!-- Media components (open modal for props) -->
      <div class="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Media</div>
      <button
        v-for="comp in mdcComponents"
        :key="comp.id"
        type="button"
        @click="openComponentModal(comp)"
        class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
      >
        <component :is="comp.icon" class="h-4 w-4" :class="comp.color" />
        {{ comp.label }}
      </button>

      <!-- Layout snippets (insert directly into code view) -->
      <div class="my-1 border-t border-border" />
      <div class="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Layout</div>
      <button
        v-for="snippet in mdcSnippets"
        :key="snippet.id"
        type="button"
        @click="insertSnippet(snippet)"
        class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
      >
        <component :is="snippet.icon" class="h-4 w-4" :class="snippet.color" />
        {{ snippet.label }}
      </button>
    </div>
  </Teleport>

  <!-- Component modal -->
  <CmsMdcComponentModal
    v-if="activeComponent"
    :component="activeComponent"
    @insert="handleInsert"
    @cancel="handleCancel"
  />
</template>
