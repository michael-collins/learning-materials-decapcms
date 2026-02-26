<script setup lang="ts">
/**
 * MdcToolbar — "Insert Component" dropdown for MDC shortcodes.
 *
 * Shows a dropdown menu with all available MDC editor components.
 * Clicking one opens the MdcComponentModal for configuring props,
 * then emits the generated MDC syntax string.
 */
import { Blocks, Play, Globe, CodeXml, Presentation, ClipboardList, Box, Package } from 'lucide-vue-next'

const emit = defineEmits<{
  insert: [mdcSyntax: string]
}>()

const showDropdown = ref(false)
const activeComponent = ref<MdcComponentDef | null>(null)

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

const mdcComponents: MdcComponentDef[] = [
  {
    id: 'video-component',
    label: 'Video',
    icon: Play,
    color: 'text-red-500',
    fields: [
      { name: 'src', label: 'Video URL', widget: 'string', hint: 'YouTube, Vimeo, Kaltura, or other video URL' },
      { name: 'title', label: 'Title', widget: 'string', default: 'Video', required: false },
    ],
    toBlock: (v) => `::video-component{src="${v.src}" title="${v.title || 'Video'}"}\n::`,
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
    ],
    toBlock: (v) => {
      const h = v.height && v.height !== '500' ? ` height="${v.height}"` : ''
      return `::iframe-component{src="${v.src}" title="${v.title || 'Embed'}"${h}}\n::`
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
    ],
    toBlock: (v) => {
      const h = v.height && v.height !== '400' ? ` height="${v.height}"` : ''
      return `::code-embed-component{provider="${v.provider}" src="${v.src}" title="${v.title || 'Code Example'}"${h}}\n::`
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
    ],
    toBlock: (v) => `::google-slides-component{id="${v.id}" title="${v.title || 'Presentation'}"}\n::`,
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
    ],
    toBlock: (v) => `::sketchfab-component{src="${v.src}" title="${v.title || 'Sketchfab Model'}" height="${v.height || '600px'}"}\n::`,
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
    ],
    toBlock: (v) => {
      const auto = v.autoRotate === false ? ' autoRotate="false"' : ''
      return `::threed-viewer-component{src="${v.src}" title="${v.title || '3D Model'}" height="${v.height || '600px'}"${auto}}\n::`
    },
  },
]

function openComponentModal(comp: MdcComponentDef) {
  activeComponent.value = comp
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
      type="button"
      @click="showDropdown = !showDropdown"
      class="flex items-center gap-1 rounded px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      title="Insert MDC Component"
    >
      <Blocks class="h-4 w-4" />
      <span class="hidden sm:inline">Insert</span>
    </button>

    <!-- Component dropdown -->
    <div
      v-if="showDropdown"
      class="absolute left-0 top-full z-30 mt-1 w-56 rounded-md border bg-popover p-1 shadow-lg"
    >
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
    </div>
  </div>

  <!-- Click-outside to close dropdown -->
  <Teleport to="body">
    <div
      v-if="showDropdown"
      class="fixed inset-0 z-20"
      @click="showDropdown = false"
    />
  </Teleport>

  <!-- Component modal -->
  <CmsMdcComponentModal
    v-if="activeComponent"
    :component="activeComponent"
    @insert="handleInsert"
    @cancel="handleCancel"
  />
</template>
