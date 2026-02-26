<script setup lang="ts">
/**
 * MdcBlockView — Tiptap NodeView component for MDC component blocks.
 *
 * Renders MDC blocks (::youtube-video, ::google-slides-component, etc.)
 * as visual, editable widget cards in the editor instead of raw syntax.
 */
import { ref } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import {
  Play, Globe, CodeXml, Presentation, ClipboardList, Box, Package, Quote,
  Pencil, Trash2, GripVertical, FolderOpen,
} from 'lucide-vue-next'

const props = defineProps<{
  node: any
  updateAttributes: (attrs: Record<string, any>) => void
  deleteNode: () => void
  editor: any
  selected: boolean
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

// Media picker state
const showFilePicker = ref(false)
const filePickerField = ref('')
const filePickerTypes = ref<string[]>([])
const filePickerTitle = ref('Select a file')

// Component metadata — `browse` on a field indicates it can use the media picker
interface FieldDef {
  name: string
  label: string
  type: string
  browse?: string[]  // allowed media types for picker (e.g. ['image'], ['3d'])
}

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
}

const meta = computed(() => componentMeta[componentType.value] || {
  label: componentType.value,
  icon: Box,
  color: 'text-gray-500 bg-gray-500/10 border-gray-500/30',
  fields: [],
})

// Summary line showing key props
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
  const propEntries = Object.entries(newProps).filter(([_, v]) => v !== '' && v !== undefined && v !== null)
  const attrStr = propEntries
    .map(([k, v]) => {
      if (typeof v === 'boolean') return v ? `${k}="true"` : `${k}="false"`
      return `${k}="${v}"`
    })
    .join(' ')

  const newMdcRaw = `::${componentType.value}{${attrStr}}\n::`

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
  <NodeViewWrapper class="mdc-block-widget my-3 rounded-lg border-2 transition-all" :class="[meta.color, selected ? 'ring-2 ring-primary ring-offset-2' : '']" contenteditable="false" data-drag-handle>
    <!-- Widget Header -->
    <div class="flex items-center gap-2 px-3 py-2">
      <GripVertical class="h-4 w-4 cursor-grab opacity-40" />
      <component :is="meta.icon" class="h-4 w-4 shrink-0" />
      <span class="flex-1 truncate text-sm font-medium">
        {{ meta.label }}
      </span>
      <span class="truncate text-xs opacity-60 max-w-50">
        {{ summary }}
      </span>
      <button
        type="button"
        @click.stop="startEdit"
        class="rounded p-1 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
        title="Edit component"
      >
        <Pencil class="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        @click.stop="deleteNode"
        class="rounded p-1 transition-colors hover:bg-red-500/20 hover:text-red-600"
        title="Remove component"
      >
        <Trash2 class="h-3.5 w-3.5" />
      </button>
    </div>

    <!-- Inline Edit Form -->
    <div v-if="editing" class="border-t bg-background/80 px-3 py-3 space-y-3">
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

      <div class="flex justify-end gap-2">
        <button
          type="button"
          @click="cancelEdit"
          class="rounded-md border px-3 py-1 text-xs hover:bg-accent"
        >
          Cancel
        </button>
        <button
          type="button"
          @click="saveEdit"
          class="rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary/90"
        >
          Save
        </button>
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
