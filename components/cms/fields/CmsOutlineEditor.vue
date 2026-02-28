<script setup lang="ts">
/**
 * CmsOutlineEditor — Minimal tree editor for book outlines.
 *
 * Shadcn-tree-inspired design with:
 * - Tree connector lines (vertical + horizontal)
 * - Collapse/expand for items with children
 * - Subtree-aware move & drag operations
 * - Single-line items with inline content badge
 * - Clean hover actions
 */
import {
  ListTree,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  GripVertical,
  Link,
  FolderPlus,
  FileText,
  GraduationCap,
  Wrench,
  Presentation,
  PenTool,
  FolderOpen,
  X,
  Search,
  Loader2,
  BookOpen,
} from 'lucide-vue-next'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import Button from '~/components/ui/button/Button.vue'
import Input from '~/components/ui/input/Input.vue'

// ── Types ─────────────────────────────────────────────────────────────

interface OutlineNode {
  title: string
  path?: string
  content?: string
  items?: OutlineNode[]
}

interface FlatItem {
  id: string
  title: string
  path: string
  content: string
  depth: number
}

// ── Props & Emits ─────────────────────────────────────────────────────

const props = defineProps<{
  modelValue: OutlineNode[] | undefined
}>()

const emit = defineEmits<{
  'update:modelValue': [value: OutlineNode[]]
}>()

// ── Helpers ───────────────────────────────────────────────────────────

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return Math.random().toString(36).slice(2, 11)
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ── Flat ↔ Nested conversion ──────────────────────────────────────────

function nestedToFlat(nodes: OutlineNode[], depth = 0): FlatItem[] {
  const result: FlatItem[] = []
  for (const node of nodes) {
    result.push({
      id: generateId(),
      title: node.title || '',
      path: node.path || '',
      content: node.content || '',
      depth,
    })
    if (node.items?.length) {
      result.push(...nestedToFlat(node.items, depth + 1))
    }
  }
  return result
}

function flatToNested(items: FlatItem[]): OutlineNode[] {
  const root: OutlineNode[] = []
  const stack: { node: OutlineNode; depth: number }[] = []

  for (const item of items) {
    const node: OutlineNode = { title: item.title }
    if (item.path) node.path = item.path
    if (item.content) node.content = item.content

    while (stack.length > 0 && stack[stack.length - 1]!.depth >= item.depth) {
      stack.pop()
    }

    if (stack.length === 0) {
      root.push(node)
    } else {
      const parent = stack[stack.length - 1]!.node
      if (!parent.items) parent.items = []
      parent.items.push(node)
    }

    stack.push({ node, depth: item.depth })
  }

  return root
}

// ── State ─────────────────────────────────────────────────────────────

const items = ref<FlatItem[]>([])
const focusItemId = ref<string | null>(null)
const itemInputRefs = ref<Record<string, HTMLInputElement | null>>({})

// Collapse state
const collapsedIds = ref<Set<string>>(new Set())

// Content picker
interface PickerVersion {
  version: string
  slug: string
  status: 'latest' | 'archived' | 'deprecated' | ''
}
interface PickerResult {
  collection: string
  baseSlug: string   // e.g. "animation-basics"
  title: string
  description?: string
  versions: PickerVersion[]  // sorted: latest first
}

const showContentPicker = ref(false)
const pickerTargetId = ref<string | null>(null)
const pickerQuery = ref('')
const pickerType = ref('all')
const pickerResults = ref<PickerResult[]>([])
const pickerLoading = ref(false)
const pickerIsNewItem = ref(false)
// Track selected version per result (key = "collection/baseSlug")
const selectedVersions = ref<Record<string, string>>({})

// When picker is closed without selecting (for new items), remove the empty item
watch(showContentPicker, (open) => {
  if (!open && pickerIsNewItem.value && pickerTargetId.value) {
    const item = items.value.find(i => i.id === pickerTargetId.value)
    if (item && !item.title && !item.content) {
      const idx = items.value.findIndex(i => i.id === pickerTargetId.value)
      if (idx >= 0) {
        items.value.splice(idx, 1)
        emitUpdate()
      }
    }
    pickerIsNewItem.value = false
    pickerTargetId.value = null
  }
})

// ── Collapse / Expand helpers ─────────────────────────────────────────

/** Get the subtree range for an item (item + all deeper items following it) */
function getSubtreeRange(idx: number): { start: number; end: number } {
  const depth = items.value[idx]!.depth
  let end = idx + 1
  while (end < items.value.length && items.value[end]!.depth > depth) {
    end++
  }
  return { start: idx, end }
}

/** Check if item at index has children (next item is deeper) */
function hasChildren(idx: number): boolean {
  return idx + 1 < items.value.length && items.value[idx + 1]!.depth > items.value[idx]!.depth
}

/** Count children of an item (for collapsed badge) */
function childCount(idx: number): number {
  const { start, end } = getSubtreeRange(idx)
  return end - start - 1
}

function toggleCollapse(id: string) {
  if (collapsedIds.value.has(id)) {
    collapsedIds.value.delete(id)
  } else {
    collapsedIds.value.add(id)
  }
}

/** Visible items — hides children of collapsed nodes */
const visibleItems = computed(() => {
  const result: { item: FlatItem; index: number }[] = []
  let skipUntilDepth = -1
  for (let i = 0; i < items.value.length; i++) {
    const item = items.value[i]!
    // If we're skipping children of a collapsed parent
    if (skipUntilDepth >= 0) {
      if (item.depth > skipUntilDepth) continue
      skipUntilDepth = -1
    }
    result.push({ item, index: i })
    // If this item is collapsed, skip its children
    if (collapsedIds.value.has(item.id) && hasChildren(i)) {
      skipUntilDepth = item.depth
    }
  }
  return result
})

/** Check if item is the last child at its depth within its parent scope */
function isLastChild(idx: number): boolean {
  const depth = items.value[idx]!.depth
  // Look past the subtree for an item at same or shallower depth
  const { end } = getSubtreeRange(idx)
  if (end >= items.value.length) return true
  return items.value[end]!.depth < depth
}

/** Ancestry check: for tree lines, determine which depth levels have a continuing sibling below */
function hasNextSiblingAtDepth(idx: number, depth: number): boolean {
  // Walk forward from this item's subtree end to find a sibling at the given depth
  const { end } = getSubtreeRange(idx)
  for (let i = end; i < items.value.length; i++) {
    if (items.value[i]!.depth < depth) return false
    if (items.value[i]!.depth === depth) return true
  }
  return false
}

// Initialize from prop
function initFromProp() {
  const val = props.modelValue
  if (Array.isArray(val) && val.length > 0) {
    items.value = nestedToFlat(val)
  } else {
    items.value = []
  }
  collapsedIds.value.clear()
}

initFromProp()
watch(() => props.modelValue, (newVal) => {
  if (JSON.stringify(newVal) !== JSON.stringify(flatToNested(items.value))) {
    initFromProp()
  }
}, { deep: true })

function emitUpdate() {
  emit('update:modelValue', flatToNested(items.value))
}

watch(focusItemId, (id) => {
  if (id) {
    nextTick(() => {
      const el = itemInputRefs.value[id]
      if (el) el.focus()
      focusItemId.value = null
    })
  }
})

// ── Item operations ───────────────────────────────────────────────────

function addSection() {
  const newItem: FlatItem = { id: generateId(), title: '', path: '', content: '', depth: 0 }
  items.value.push(newItem)
  focusItemId.value = newItem.id
  emitUpdate()
}

function addItemAfter(afterId: string, openPicker = false) {
  const idx = items.value.findIndex(i => i.id === afterId)
  if (idx < 0) return
  const depth = items.value[idx]!.depth
  // Insert after this item's subtree
  const { end } = getSubtreeRange(idx)
  const newItem: FlatItem = { id: generateId(), title: '', path: '', content: '', depth }
  items.value.splice(end, 0, newItem)
  if (openPicker) {
    nextTick(() => openPickerForItem(newItem.id))
  } else {
    focusItemId.value = newItem.id
  }
  emitUpdate()
  return newItem
}

function addChild(parentId: string, openPicker = false) {
  const idx = items.value.findIndex(i => i.id === parentId)
  if (idx < 0) return
  const parentDepth = items.value[idx]!.depth
  const childDepth = Math.min(parentDepth + 1, 3)
  const { end } = getSubtreeRange(idx)
  const newItem: FlatItem = { id: generateId(), title: '', path: '', content: '', depth: childDepth }
  items.value.splice(end, 0, newItem)
  // Expand parent if collapsed
  collapsedIds.value.delete(parentId)
  if (openPicker) {
    nextTick(() => openPickerForItem(newItem.id))
  } else {
    focusItemId.value = newItem.id
  }
  emitUpdate()
  return newItem
}

function addItemWithPicker() {
  const newItem: FlatItem = { id: generateId(), title: '', path: '', content: '', depth: items.value.length > 0 ? 1 : 0 }
  items.value.push(newItem)
  emitUpdate()
  nextTick(() => openPickerForItem(newItem.id))
}

function removeItem(id: string) {
  const idx = items.value.findIndex(i => i.id === id)
  if (idx < 0) return
  const { end } = getSubtreeRange(idx)
  const prevId = idx > 0 ? items.value[idx - 1]!.id : null
  items.value.splice(idx, end - idx)
  collapsedIds.value.delete(id)
  if (prevId) {
    nextTick(() => {
      const el = itemInputRefs.value[prevId]
      if (el) el.focus()
    })
  }
  emitUpdate()
}

function updateTitle(id: string, title: string) {
  const item = items.value.find(i => i.id === id)
  if (!item) return
  item.title = title
  if (!item.path || item.path === slugify(item.title)) {
    item.path = slugify(title)
  }
  emitUpdate()
}

function updatePath(id: string, path: string) {
  const item = items.value.find(i => i.id === id)
  if (!item) return
  item.path = path
  emitUpdate()
}

function indentItem(id: string) {
  const idx = items.value.findIndex(i => i.id === id)
  if (idx <= 0) return
  const item = items.value[idx]!
  const prevDepth = items.value[idx - 1]!.depth
  if (item.depth >= 3 || item.depth > prevDepth) return
  item.depth++
  emitUpdate()
}

function outdentItem(id: string) {
  const idx = items.value.findIndex(i => i.id === id)
  if (idx < 0) return
  const item = items.value[idx]!
  if (item.depth <= 0) return
  item.depth--
  emitUpdate()
}

// ── Subtree-aware move ────────────────────────────────────────────────

function moveUp(id: string) {
  const idx = items.value.findIndex(i => i.id === id)
  if (idx <= 0) return
  const { start, end } = getSubtreeRange(idx)
  const subtree = items.value.slice(start, end)

  // Find the previous sibling (item before this one at same or shallower depth)
  let prevIdx = start - 1
  if (prevIdx < 0) return
  // If moving up into a collapsed subtree, grab the whole previous subtree
  const prevItem = items.value[prevIdx]!
  let prevStart = prevIdx
  // Walk backward to find the root of the previous item's subtree if it's deeper
  if (prevItem.depth >= items.value[start]!.depth) {
    // Previous item is at same or deeper depth — find its root
    while (prevStart > 0 && items.value[prevStart - 1]!.depth >= items.value[start]!.depth) {
      prevStart--
    }
  }

  // Simple swap: remove our subtree, insert before previous position
  items.value.splice(start, end - start)
  items.value.splice(prevStart, 0, ...subtree)
  emitUpdate()
}

function moveDown(id: string) {
  const idx = items.value.findIndex(i => i.id === id)
  if (idx < 0) return
  const { start, end } = getSubtreeRange(idx)
  if (end >= items.value.length) return

  const subtree = items.value.slice(start, end)
  // Get the next sibling's subtree range
  const nextEnd = getSubtreeRange(end).end

  // Remove our subtree, then insert after the next subtree
  items.value.splice(start, end - start)
  // After removal, nextEnd shifts back by subtree length
  const insertAt = nextEnd - subtree.length
  items.value.splice(insertAt, 0, ...subtree)
  emitUpdate()
}

// ── Content linking ───────────────────────────────────────────────────

const typeIcons: Record<string, any> = {
  lessons: GraduationCap,
  articles: FileText,
  tutorials: Wrench,
  lectures: Presentation,
  exercises: PenTool,
  projects: FolderOpen,
}

const SEARCHABLE_COLLECTIONS = [
  { name: 'lessons', label: 'Lessons' },
  { name: 'articles', label: 'Articles' },
  { name: 'tutorials', label: 'Tutorials' },
  { name: 'lectures', label: 'Lectures' },
  { name: 'exercises', label: 'Exercises' },
  { name: 'projects', label: 'Projects' },
] as const

function getContentIcon(content: string) {
  const collection = content.split('/')[0] || ''
  return typeIcons[collection] || FileText
}

function openPicker(itemId: string) {
  pickerTargetId.value = itemId
  pickerQuery.value = ''
  pickerType.value = 'all'
  pickerIsNewItem.value = false
  showContentPicker.value = true
  performSearch()
}

function openPickerForItem(itemId: string) {
  pickerTargetId.value = itemId
  pickerQuery.value = ''
  pickerType.value = 'all'
  pickerIsNewItem.value = true
  showContentPicker.value = true
  performSearch()
}

function unlinkContent(id: string) {
  const item = items.value.find(i => i.id === id)
  if (!item) return
  item.content = ''
  emitUpdate()
}

let searchTimeout: ReturnType<typeof setTimeout> | null = null

watch(pickerQuery, () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => performSearch(), 300)
})

watch(pickerType, () => performSearch())

async function performSearch() {
  pickerLoading.value = true
  pickerResults.value = []
  selectedVersions.value = {}
  try {
    const collectionsToSearch = pickerType.value === 'all'
      ? SEARCHABLE_COLLECTIONS.map(c => c.name)
      : [pickerType.value]

    // Group by collection + base slug
    const grouped = new Map<string, PickerResult>()

    for (const collName of collectionsToSearch) {
      try {
        const queryItems = await queryCollection(collName as any).order('title', 'ASC').limit(200).all()
        const searchLower = pickerQuery.value.trim().toLowerCase()
        for (const qItem of queryItems) {
          const meta = qItem as any
          const itemTitle: string = meta.title || ''
          if (searchLower && !itemTitle.toLowerCase().includes(searchLower)) continue

          const pathStr: string = meta.path || meta.stem || ''
          // Determine base slug and version from path
          // Paths look like: /lessons/animation-basics (index) or /lessons/animation-basics/v/1.0.0 (archived)
          const pathParts = pathStr.replace(/^\//, '').split('/')
          // Remove collection prefix if present
          const afterColl = pathParts[0] === collName ? pathParts.slice(1) : pathParts
          let baseSlug: string
          let versionStr: string
          let versionStatus: 'latest' | 'archived' | 'deprecated' | ''

          if (afterColl.length >= 3 && afterColl[afterColl.length - 2] === 'v') {
            // Versioned path: slug/v/1.0.0
            baseSlug = afterColl.slice(0, -2).join('/')
            versionStr = afterColl[afterColl.length - 1]!
            versionStatus = (meta.versionStatus as any) || 'archived'
          } else if (afterColl.length >= 1) {
            // Index / flat path: slug or slug/index
            baseSlug = afterColl[0] === 'index' ? '' : afterColl.filter(p => p !== 'index').join('/')
            versionStr = meta.version || ''
            versionStatus = (meta.versionStatus as any) || 'latest'
          } else {
            baseSlug = pathStr.split('/').pop() || pathStr
            versionStr = meta.version || ''
            versionStatus = ''
          }

          if (!baseSlug) continue

          const key = `${collName}/${baseSlug}`
          const slug = pathStr.split('/').pop() || pathStr

          if (!grouped.has(key)) {
            grouped.set(key, {
              collection: collName,
              baseSlug,
              title: itemTitle,
              description: meta.description || '',
              versions: [],
            })
          }

          const entry = grouped.get(key)!
          // Use the latest version's title/description as the display title
          if (versionStatus === 'latest' || entry.versions.length === 0) {
            entry.title = itemTitle
            if (meta.description) entry.description = meta.description
          }

          entry.versions.push({
            version: versionStr || 'latest',
            slug: baseSlug + (versionStr && versionStatus === 'archived' ? `/v/${versionStr}` : ''),
            status: versionStatus,
          })
        }
      } catch { /* skip */ }
    }

    // Sort versions within each group: latest first, then semver descending
    for (const entry of grouped.values()) {
      entry.versions.sort((a, b) => {
        if (a.status === 'latest' && b.status !== 'latest') return -1
        if (b.status === 'latest' && a.status !== 'latest') return 1
        // Semver descending
        const parse = (v: string) => {
          const p = v.split('.').map(Number)
          return (p[0] || 0) * 10000 + (p[1] || 0) * 100 + (p[2] || 0)
        }
        return parse(b.version) - parse(a.version)
      })
      // Default selection = latest version
      const key = `${entry.collection}/${entry.baseSlug}`
      selectedVersions.value[key] = entry.versions[0]?.slug || entry.baseSlug
    }

    const results = Array.from(grouped.values())
    const q = pickerQuery.value.trim().toLowerCase()
    results.sort((a, b) => {
      if (q) {
        const aM = a.title.toLowerCase().startsWith(q) ? 0 : 1
        const bM = b.title.toLowerCase().startsWith(q) ? 0 : 1
        if (aM !== bM) return aM - bM
      }
      return a.title.localeCompare(b.title)
    })
    pickerResults.value = results.slice(0, 50)
  } catch { /* */ } finally {
    pickerLoading.value = false
  }
}

function selectContent(result: PickerResult) {
  if (!pickerTargetId.value) return
  const item = items.value.find(i => i.id === pickerTargetId.value)
  if (item) {
    const key = `${result.collection}/${result.baseSlug}`
    const chosenSlug = selectedVersions.value[key] || result.baseSlug
    item.content = `${result.collection}/${chosenSlug}`
    if (!item.title) item.title = result.title
    if (!item.path) item.path = slugify(result.title)
    emitUpdate()
  }
  pickerIsNewItem.value = false
  showContentPicker.value = false
  pickerTargetId.value = null
}

// ── Keyboard shortcuts ────────────────────────────────────────────────

function handleKeydown(event: KeyboardEvent, item: FlatItem) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    addItemAfter(item.id)
  } else if (event.key === 'Tab' && !event.shiftKey) {
    event.preventDefault()
    indentItem(item.id)
  } else if (event.key === 'Tab' && event.shiftKey) {
    event.preventDefault()
    outdentItem(item.id)
  } else if (event.key === 'Backspace' && !item.title && !item.content) {
    event.preventDefault()
    if (items.value.length > 1) {
      removeItem(item.id)
    }
  } else if (event.key === 'ArrowUp' && event.altKey) {
    event.preventDefault()
    moveUp(item.id)
  } else if (event.key === 'ArrowDown' && event.altKey) {
    event.preventDefault()
    moveDown(item.id)
  }
}

function setItemRef(id: string, el: any) {
  if (el) itemInputRefs.value[id] = el.$el || el
}

// ── Drag & Drop ───────────────────────────────────────────────────────

const draggedId = ref<string | null>(null)
const dragOverId = ref<string | null>(null)
const dragPosition = ref<'before' | 'after'>('after')

const dragStartX = ref(0)
const dragOriginalDepth = ref(0)
const dragPreviewDepth = ref<number | null>(null)
const INDENT_PX = 40

function onDragStart(event: DragEvent, id: string) {
  draggedId.value = id
  dragStartX.value = event.clientX
  const item = items.value.find(i => i.id === id)
  dragOriginalDepth.value = item?.depth ?? 0
  dragPreviewDepth.value = null
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', id)
  }
  requestAnimationFrame(() => {
    const el = (event.target as HTMLElement).closest('[data-outline-item]') as HTMLElement | null
    if (el) el.style.opacity = '0.4'
  })
}

function onDragEnd(event: DragEvent) {
  const el = (event.target as HTMLElement).closest('[data-outline-item]') as HTMLElement | null
  if (el) el.style.opacity = ''

  if (draggedId.value && dragPreviewDepth.value !== null) {
    const item = items.value.find(i => i.id === draggedId.value)
    if (item && dragPreviewDepth.value !== item.depth) {
      item.depth = dragPreviewDepth.value
      emitUpdate()
    }
  }

  draggedId.value = null
  dragOverId.value = null
  dragPreviewDepth.value = null
}

function onDragOver(event: DragEvent, id: string) {
  event.preventDefault()
  if (!draggedId.value) return

  if (draggedId.value === id) {
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
    const deltaX = event.clientX - dragStartX.value
    const depthChange = Math.round(deltaX / INDENT_PX)
    const idx = items.value.findIndex(i => i.id === id)
    let newDepth = Math.max(0, Math.min(3, dragOriginalDepth.value + depthChange))
    if (idx > 0) {
      const prevDepth = items.value[idx - 1]!.depth
      newDepth = Math.min(newDepth, prevDepth + 1)
    }
    dragPreviewDepth.value = newDepth
    return
  }

  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  dragOverId.value = id

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const midY = rect.top + rect.height / 2
  dragPosition.value = event.clientY < midY ? 'before' : 'after'
}

function onDragLeave(event: DragEvent, id: string) {
  const relatedTarget = event.relatedTarget as HTMLElement | null
  const currentTarget = event.currentTarget as HTMLElement
  if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
    if (dragOverId.value === id) dragOverId.value = null
  }
}

function onDrop(event: DragEvent, targetId: string) {
  event.preventDefault()
  if (!draggedId.value || draggedId.value === targetId) return

  const fromIdx = items.value.findIndex(i => i.id === draggedId.value)
  const toIdx = items.value.findIndex(i => i.id === targetId)
  if (fromIdx < 0 || toIdx < 0) return

  const { start, end } = getSubtreeRange(fromIdx)
  const movedItems = items.value.splice(start, end - start)

  let insertIdx = items.value.findIndex(i => i.id === targetId)
  if (insertIdx < 0) insertIdx = items.value.length
  if (dragPosition.value === 'after') insertIdx++

  items.value.splice(insertIdx, 0, ...movedItems)

  draggedId.value = null
  dragOverId.value = null
  emitUpdate()
}

// Stats
const sectionCount = computed(() => items.value.filter(i => i.depth === 0).length)
const totalCount = computed(() => items.value.length)
</script>

<template>
  <div class="space-y-2">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <label class="text-sm font-medium flex items-center gap-2">
        <ListTree class="h-4 w-4 text-muted-foreground" />
        Outline
      </label>
      <span class="text-xs text-muted-foreground">
        {{ sectionCount }} section{{ sectionCount !== 1 ? 's' : '' }} · {{ totalCount }} item{{ totalCount !== 1 ? 's' : '' }}
      </span>
    </div>

    <!-- Tree -->
    <div v-if="items.length > 0" class="rounded-lg border bg-card">
      <div
        v-for="({ item, index: realIndex }, vIdx) in visibleItems"
        :key="item.id"
        data-outline-item
        draggable="true"
        :class="[
          'group relative flex items-center h-8 pr-2 transition-colors hover:bg-accent/40',
          dragOverId === item.id && dragPosition === 'before' ? 'ring-1 ring-inset ring-primary ring-offset-0' : '',
          dragOverId === item.id && dragPosition === 'after' ? 'ring-1 ring-inset ring-primary ring-offset-0' : '',
          draggedId === item.id ? 'opacity-40' : '',
          vIdx > 0 ? 'border-t border-border/40' : '',
        ]"
        @dragstart="onDragStart($event, item.id)"
        @dragend="onDragEnd"
        @dragover="onDragOver($event, item.id)"
        @dragleave="onDragLeave($event, item.id)"
        @drop="onDrop($event, item.id)"
      >
        <!-- Tree indent + lines -->
        <div
          class="flex items-center shrink-0 h-full"
          :style="{ width: `${16 + ((draggedId === item.id && dragPreviewDepth !== null ? dragPreviewDepth : item.depth) * 20)}px`, transition: draggedId === item.id ? 'width 0.15s ease' : '' }"
        >
          <!-- Drag handle (left edge) -->
          <div class="w-4 flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-50 transition-opacity">
            <GripVertical class="h-3 w-3 text-muted-foreground pointer-events-none" />
          </div>
          <!-- Depth spacers with tree lines -->
          <template v-for="d in item.depth" :key="d">
            <div class="relative w-5 h-full shrink-0">
              <!-- Vertical tree line for continuing ancestors -->
              <div
                v-if="hasNextSiblingAtDepth(realIndex, d)"
                class="absolute left-2 top-0 bottom-0 w-px bg-border"
              />
            </div>
          </template>
        </div>

        <!-- Collapse toggle / tree connector -->
        <div class="w-5 h-full flex items-center justify-center shrink-0 relative">
          <!-- Horizontal connector line -->
          <div
            v-if="item.depth > 0"
            class="absolute right-0 top-1/2 w-2.5 h-px bg-border"
            :style="{ left: '-1px' }"
          />
          <!-- Vertical line segment from parent -->
          <div
            v-if="item.depth > 0"
            :class="[
              'absolute left-1.75 w-px bg-border',
              isLastChild(realIndex) ? 'top-0 h-1/2' : 'top-0 bottom-0',
            ]"
          />
          <!-- Collapse/expand chevron for parents -->
          <button
            v-if="hasChildren(realIndex)"
            type="button"
            class="relative z-10 flex items-center justify-center w-4 h-4 rounded-sm bg-card hover:bg-accent transition-colors"
            @click.stop="toggleCollapse(item.id)"
          >
            <ChevronDown v-if="!collapsedIds.has(item.id)" class="h-3 w-3 text-muted-foreground" />
            <ChevronRight v-else class="h-3 w-3 text-muted-foreground" />
          </button>
          <!-- Leaf dot -->
          <div
            v-else
            class="relative z-10 w-1.5 h-1.5 rounded-full bg-border"
          />
        </div>

        <!-- Title -->
        <input
          :ref="(el) => setItemRef(item.id, el)"
          :value="item.title"
          :placeholder="item.depth === 0 ? 'Section title…' : 'Item title…'"
          :class="[
            'flex-1 min-w-0 bg-transparent border-none outline-none text-sm h-full px-1.5',
            'focus:ring-0 placeholder:text-muted-foreground/40',
            item.depth === 0 ? 'font-medium' : 'text-muted-foreground',
          ]"
          @input="updateTitle(item.id, ($event.target as HTMLInputElement).value)"
          @keydown="handleKeydown($event, item)"
        />

        <!-- Collapsed children count badge -->
        <span
          v-if="collapsedIds.has(item.id) && childCount(realIndex) > 0"
          class="shrink-0 rounded-full bg-muted px-1.5 py-0 text-[10px] font-medium text-muted-foreground mr-1"
        >
          {{ childCount(realIndex) }}
        </span>

        <!-- Content badge (inline) -->
        <button
          v-if="item.content"
          type="button"
          class="shrink-0 flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-primary/70 hover:bg-accent transition-colors mr-1"
          :title="item.content"
          @click.stop="openPicker(item.id)"
        >
          <component :is="getContentIcon(item.content)" class="h-3 w-3" />
          <span class="max-w-30 truncate">{{ item.content.split('/').pop() }}</span>
        </button>

        <!-- Hover actions -->
        <div class="shrink-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            v-if="!item.content"
            type="button"
            class="p-1 rounded text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-colors"
            title="Link content"
            @click.stop="openPicker(item.id)"
          >
            <Link class="h-3 w-3" />
          </button>
          <button
            v-if="item.content"
            type="button"
            class="p-1 rounded text-muted-foreground/50 hover:text-destructive transition-colors"
            title="Unlink"
            @click.stop="unlinkContent(item.id)"
          >
            <X class="h-3 w-3" />
          </button>
          <button
            v-if="item.depth < 3"
            type="button"
            class="p-1 rounded text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-colors"
            title="Add child"
            @click.stop="addChild(item.id, true)"
          >
            <Plus class="h-3 w-3" />
          </button>
          <button
            type="button"
            class="p-1 rounded text-muted-foreground/50 hover:text-destructive transition-colors"
            title="Delete"
            @click.stop="removeItem(item.id)"
          >
            <Trash2 class="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="rounded-lg border border-dashed py-6 text-center">
      <ListTree class="h-6 w-6 mx-auto mb-1.5 text-muted-foreground/40" />
      <p class="text-sm text-muted-foreground">No outline items yet</p>
    </div>

    <!-- Add buttons -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        @click="addSection"
      >
        <FolderPlus class="h-3 w-3" /> Section
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        @click="addItemWithPicker"
      >
        <BookOpen class="h-3 w-3" /> Content
      </button>
    </div>

    <!-- Keyboard hints (minimal) -->
    <div class="flex flex-wrap gap-x-3 text-[10px] text-muted-foreground/50">
      <span><kbd class="font-mono">↵</kbd> new</span>
      <span><kbd class="font-mono">⇥</kbd> indent</span>
      <span><kbd class="font-mono">⇧⇥</kbd> outdent</span>
      <span><kbd class="font-mono">⌥↑↓</kbd> move</span>
      <span>drag ↔ indent</span>
    </div>

    <!-- ═══ Content Picker Dialog ═══ -->
    <Dialog v-model:open="showContentPicker">
      <DialogContent class="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{{ pickerIsNewItem ? 'Add Content' : 'Link Content' }}</DialogTitle>
          <DialogDescription>
            {{ pickerIsNewItem ? 'Search and select content to add.' : 'Search content to link to this item.' }}
          </DialogDescription>
        </DialogHeader>

        <div class="flex gap-2">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              v-model="pickerQuery"
              placeholder="Search by title…"
              class="pl-10"
            />
          </div>
          <select
            v-model="pickerType"
            class="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Types</option>
            <option v-for="c in SEARCHABLE_COLLECTIONS" :key="c.name" :value="c.name">
              {{ c.label }}
            </option>
          </select>
        </div>

        <div class="flex-1 overflow-y-auto min-h-0 -mx-2 px-2">
          <div v-if="pickerLoading" class="flex items-center justify-center py-12">
            <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
          <div v-else-if="pickerResults.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
            <Search class="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p class="text-sm text-muted-foreground">
              {{ pickerQuery ? 'No content found.' : 'No content available.' }}
            </p>
          </div>
          <div v-else class="space-y-0.5 py-2">
            <div
              v-for="r in pickerResults"
              :key="`${r.collection}-${r.baseSlug}`"
              class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent"
            >
              <component
                :is="typeIcons[r.collection] || FileText"
                class="h-4 w-4 shrink-0 text-muted-foreground"
              />
              <button
                type="button"
                class="text-sm truncate flex-1 text-left hover:underline"
                @click="selectContent(r)"
              >
                {{ r.title }}
              </button>
              <!-- Version selector -->
              <select
                v-if="r.versions.length > 1"
                :value="selectedVersions[`${r.collection}/${r.baseSlug}`]"
                class="h-7 rounded border border-input bg-background px-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                @click.stop
                @change="selectedVersions[`${r.collection}/${r.baseSlug}`] = ($event.target as HTMLSelectElement).value"
              >
                <option
                  v-for="v in r.versions"
                  :key="v.slug"
                  :value="v.slug"
                >
                  {{ v.version }}{{ v.status === 'latest' ? ' (latest)' : '' }}
                </option>
              </select>
              <span v-else-if="r.versions.length === 1 && r.versions[0]?.version" class="shrink-0 text-[10px] text-muted-foreground">
                v{{ r.versions[0]?.version }}
              </span>
              <span class="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {{ SEARCHABLE_COLLECTIONS.find(c => c.name === r.collection)?.label || r.collection }}
              </span>
              <button
                type="button"
                class="shrink-0 rounded px-2 py-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                @click="selectContent(r)"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div class="flex justify-between items-center pt-2 border-t text-xs text-muted-foreground">
          <span>{{ pickerResults.length }} item{{ pickerResults.length !== 1 ? 's' : '' }}</span>
          <Button variant="ghost" size="sm" @click="showContentPicker = false">Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
