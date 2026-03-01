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
  Link,
  FolderPlus,
  FileText,
  GraduationCap,
  Presentation,
  Lightbulb,
  Dumbbell,
  FolderKanban,
  FolderOpen,
  Newspaper,
  X,
  Search,
  Loader2,
  BookOpen,
  Pencil,
  Check,
  Lock,
  Unlock,
  RefreshCw,
  PackageOpen,
  Image as ImageIcon,
  Eye,
  EyeOff,
} from 'lucide-vue-next'
import * as LucideIcons from 'lucide-vue-next'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import Button from '~/components/ui/button/Button.vue'
import Input from '~/components/ui/input/Input.vue'

// ── Types ─────────────────────────────────────────────────────────────

interface OutlineNode {
  title: string
  path?: string
  content?: string
  icon?: string
  items?: OutlineNode[]
  imported?: boolean
  locked?: boolean
  importChildren?: boolean
}

interface FlatItem {
  id: string
  title: string
  path: string
  content: string
  version: string
  icon: string
  depth: number
  imported?: boolean
  locked?: boolean
  importChildren?: boolean
  importedFrom?: string  // parent item ID that imported this
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

/**
 * Convert nested OutlineNode[] -> flat FlatItem[].
 *
 * markImportedFrom: the id of the nearest lesson ancestor whose children are
 * all considered "imported". Set automatically when we detect a lesson node
 * that already has children but no importChildren flag (i.e. written by the
 * import script rather than by the CMS UI).
 */
function nestedToFlat(nodes: OutlineNode[], depth = 0, parentId?: string, markImportedFrom?: string): FlatItem[] {
  const result: FlatItem[] = []
  for (const node of nodes) {
    const id = generateId()
    const item: FlatItem = {
      id,
      title: node.title || '',
      path: node.path || '',
      content: node.content || '',
      version: node.version || '',
      icon: node.icon || '',
      depth,
    }

    // Auto-detect: lesson node with existing children but no importChildren flag
    // (written by import script — treat its whole subtree as imported)
    const isAutoLesson = !node.importChildren
      && !!node.content?.startsWith('lessons/')
      && Array.isArray(node.items)
      && node.items.length > 0

    // Determine effective cascade ancestor id for children.
    // Both explicit importChildren (after first save) and auto-detected lessons
    // start a fresh cascade so removeImportedChildren() keeps working across
    // save/reload cycles.
    const childMarkId = (isAutoLesson || node.importChildren) ? id : markImportedFrom

    // Mark imported state
    if (node.imported || markImportedFrom) {
      item.imported = true
      item.locked = node.locked !== false
    }
    if (node.importChildren || isAutoLesson) item.importChildren = true

    // importedFrom: use cascaded lesson id, else old single-level mode
    if (markImportedFrom) {
      item.importedFrom = markImportedFrom
    } else if (parentId && node.imported) {
      item.importedFrom = parentId
    }

    result.push(item)
    if (node.items?.length) {
      const childParentId = (node.importChildren || isAutoLesson) ? id : undefined
      result.push(...nestedToFlat(node.items, depth + 1, childParentId, childMarkId))
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
    if (item.version) node.version = item.version
    if (item.icon) node.icon = item.icon
    if (item.imported) node.imported = true
    if (item.locked) node.locked = true
    if (item.importChildren) node.importChildren = true

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

// Key of the currently linked content item (for highlighting in picker)
const pickerCurrentKey = computed(() => {
  if (!pickerTargetId.value) return ''
  const item = items.value.find(i => i.id === pickerTargetId.value)
  if (!item?.content) return ''
  const parts = item.content.split('/')
  const coll = parts[0] || ''
  const vIdx = parts.indexOf('v')
  const baseSlug = vIdx > 1 ? parts.slice(1, vIdx).join('/') : parts.slice(1).join('/')
  return `${coll}/${baseSlug}`
})

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
    // Auto-enter edit mode for newly added items
    startEditing(id)
    focusItemId.value = null
  }
})

// ── Item operations ───────────────────────────────────────────────────

function addSection() {
  const newItem: FlatItem = { id: generateId(), title: '', path: '', content: '', version: '', icon: '', depth: 0 }
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
  const newItem: FlatItem = { id: generateId(), title: '', path: '', content: '', version: '', icon: '', depth }
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
  const newItem: FlatItem = { id: generateId(), title: '', path: '', content: '', version: '', icon: '', depth: childDepth }
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
  const newItem: FlatItem = { id: generateId(), title: '', path: '', content: '', version: '', icon: '', depth: items.value.length > 0 ? 1 : 0 }
  items.value.push(newItem)
  emitUpdate()
  nextTick(() => openPickerForItem(newItem.id))
}

function removeItem(id: string) {
  const idx = items.value.findIndex(i => i.id === id)
  if (idx < 0) return
  const item = items.value[idx]!
  // If this item had imported children, remove them first
  if (item.importChildren) {
    removeImportedChildren(id)
  }
  // Re-find idx since removal may have shifted indices
  const newIdx = items.value.findIndex(i => i.id === id)
  if (newIdx < 0) return
  const { end } = getSubtreeRange(newIdx)
  const prevId = newIdx > 0 ? items.value[newIdx - 1]!.id : null
  items.value.splice(newIdx, end - newIdx)
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
  // Block indent for locked imported items
  if (item.imported && item.locked) return
  const prevDepth = items.value[idx - 1]!.depth
  if (item.depth >= 3 || item.depth > prevDepth) return
  item.depth++
  emitUpdate()
}

function outdentItem(id: string) {
  const idx = items.value.findIndex(i => i.id === id)
  if (idx < 0) return
  const item = items.value[idx]!
  // Block outdent for locked imported items
  if (item.imported && item.locked) return
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
  lessons: BookOpen,
  articles: Newspaper,
  tutorials: Lightbulb,
  lectures: Presentation,
  exercises: Dumbbell,
  projects: FolderKanban,
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

/** Default icon name map for content types */
const typeIconNames: Record<string, string> = {
  lessons: 'BookOpen',
  articles: 'Newspaper',
  tutorials: 'Lightbulb',
  lectures: 'Presentation',
  exercises: 'Dumbbell',
  projects: 'FolderKanban',
}

/** Get the default icon name for an item based on its content type */
function getDefaultIconName(item: FlatItem): string {
  if (!item.content) return ''
  const collection = item.content.split('/')[0] || ''
  return typeIconNames[collection] || ''
}

/** Resolve a Lucide icon component by its PascalCase name */
function resolveIconComponent(iconName: string): any {
  if (!iconName) return null
  // Try exact name first, then Lucide-prefixed variant
  return (LucideIcons as any)[iconName] || (LucideIcons as any)[`Lucide${iconName}`] || null
}

/** Get the display icon component for an item (custom → default → null) */
function getItemIcon(item: FlatItem): any {
  if (item.icon) return resolveIconComponent(item.icon)
  if (item.content) return getContentIcon(item.content)
  return null
}

// ── Icon toggle & picker ──────────────────────────────────────────────

const showIcons = ref(true)
const showIconPicker = ref(false)
const iconPickerTargetId = ref<string | null>(null)
const iconPickerQuery = ref('')

// Build searchable icon list (once, lazily)
let _iconList: { name: string; keywords: string }[] | null = null
function getIconList(): { name: string; keywords: string }[] {
  if (!_iconList) {
    _iconList = Object.keys(LucideIcons)
      .filter(k => k[0] === k[0].toUpperCase() && !k.endsWith('Icon') && !k.startsWith('Lucide') && k !== 'default' && k !== 'createLucideIcon' && typeof (LucideIcons as any)[k] === 'function')
      .map(name => ({
        name,
        keywords: name.replace(/([A-Z])/g, ' $1').toLowerCase().trim(),
      }))
  }
  return _iconList
}

const filteredIcons = computed(() => {
  const all = getIconList()
  const q = iconPickerQuery.value.toLowerCase().trim()
  if (!q) return all.slice(0, 60)
  const matches = all.filter(i => i.keywords.includes(q) || i.name.toLowerCase().includes(q))
  return matches.slice(0, 60)
})

function openIconPicker(itemId: string) {
  iconPickerTargetId.value = itemId
  iconPickerQuery.value = ''
  showIconPicker.value = true
}

function selectIcon(iconName: string) {
  if (!iconPickerTargetId.value) return
  const item = items.value.find(i => i.id === iconPickerTargetId.value)
  if (item) {
    item.icon = iconName
    emitUpdate()
  }
  showIconPicker.value = false
  iconPickerTargetId.value = null
}

function clearIcon(itemId: string) {
  const item = items.value.find(i => i.id === itemId)
  if (item) {
    item.icon = ''
    emitUpdate()
  }
}

// ── Lesson sub-item import ────────────────────────────────────────────

/** Map lesson item type → collection name and field key */
const LESSON_ITEM_TYPE_MAP: Record<string, { collection: string; field: string }> = {
  lectures: { collection: 'lectures', field: 'lecture' },
  exercises: { collection: 'exercises', field: 'exercise' },
  projects: { collection: 'projects', field: 'project' },
  tutorials: { collection: 'tutorials', field: 'tutorial' },
  articles: { collection: 'articles', field: 'article' },
}

/** Check if an outline item references a lesson */
function isLessonContent(item: FlatItem): boolean {
  return item.content.startsWith('lessons/')
}

/** Fetch a lesson's sub-items from its frontmatter (flat list, legacy use) */
async function fetchLessonSubItems(lessonContent: string): Promise<{ collection: string; slug: string; title: string }[]> {
  // content is like "lessons/3d-modeling-fundamentals"
  const slug = lessonContent.replace(/^lessons\//, '')
  try {
    // Query all lessons (same pattern as performSearch which works)
    const results = await queryCollection('lessons' as any).limit(200).all()
    const lesson = results.find((r: any) => {
      const p = (r.path || '').replace(/^\//, '')
      return p === lessonContent || p === `lessons/${slug}`
    }) as any
    if (!lesson) return []
    return extractLessonItems(lesson)
  } catch (e) {
    console.error('[import] fetchLessonSubItems error:', e)
    return []
  }
}

/**
 * Fetch a lesson's outline as a structured tree of OutlineNode[].
 * Prefers the `outline` field (nested categories + content items),
 * falls back to building a flat list from legacy `items[]`.
 */
async function fetchLessonOutlineNodes(lessonContent: string): Promise<OutlineNode[]> {
  const slug = lessonContent.replace(/^lessons\//, '')
  try {
    const results = await queryCollection('lessons' as any).limit(200).all()
    const lesson = results.find((r: any) => {
      const p = (r.path || '').replace(/^\//, '')
      return p === lessonContent || p === `lessons/${slug}`
    }) as any
    if (!lesson) return []

    // New format: outline field (nested categories with content items)
    let outlineNodes: any[] = lesson.outline || []
    if (typeof outlineNodes === 'string') {
      try { outlineNodes = JSON.parse(outlineNodes) } catch { outlineNodes = [] }
    }
    if (Array.isArray(outlineNodes) && outlineNodes.length > 0) {
      return outlineNodes as OutlineNode[]
    }

    // Legacy: build flat list from items[]
    const legacyItems = await extractLessonItems(lesson)
    return legacyItems.map(si => ({
      title: si.title,
      path: slugify(si.title),
      content: `${si.collection}/${si.slug}`,
    } as OutlineNode))
  } catch (e) {
    console.error('[import] fetchLessonOutlineNodes error:', e)
    return []
  }
}

/** Extract sub-item references from a lesson's metadata.
 *  Prefers the newer `outline` nested structure (used by DMD 100 lessons),
 *  falls back to the legacy flat `items` array format. */
async function extractLessonItems(lesson: any): Promise<{ collection: string; slug: string; title: string }[]> {
  const subItems: { collection: string; slug: string; title: string }[] = []

  // ── New format: outline (nested nodes with `content: collection/slug`) ──
  let outlineNodes: any[] = lesson.outline || []
  if (typeof outlineNodes === 'string') {
    try { outlineNodes = JSON.parse(outlineNodes) } catch { outlineNodes = [] }
  }

  if (Array.isArray(outlineNodes) && outlineNodes.length > 0) {
    /** Recursively walk outline nodes and collect leaf nodes with content refs. */
    function walkOutlineNodes(nodes: any[]) {
      for (const node of nodes) {
        if (node.content) {
          // content is "collection/slug", e.g. "articles/dmd100-lesson-1-topics-what-is-design"
          const slashIdx = (node.content as string).indexOf('/')
          if (slashIdx !== -1) {
            const collection = node.content.slice(0, slashIdx) as string
            const slug = node.content.slice(slashIdx + 1) as string
            subItems.push({ collection, slug, title: node.title || slug })
          }
        }
        if (Array.isArray(node.items) && node.items.length) {
          walkOutlineNodes(node.items)
        }
      }
    }
    walkOutlineNodes(outlineNodes)
    return subItems
  }

  // ── Legacy format: flat items array ──────────────────────────────────────
  let lessonItems: any[] = lesson.items || []
  if (typeof lessonItems === 'string') {
    try { lessonItems = JSON.parse(lessonItems) } catch { lessonItems = [] }
  }
  if (!Array.isArray(lessonItems) || lessonItems.length === 0) return []

  // Cache collection results to avoid redundant queries
  const collectionCache: Record<string, any[]> = {}

  for (const li of lessonItems) {
    const typeKey = li.type as string
    const mapping = LESSON_ITEM_TYPE_MAP[typeKey]
    if (!mapping) continue
    const refSlug = li[mapping.field] as string
    if (!refSlug) continue

    // Strip /index suffix if present
    const cleanSlug = refSlug.replace(/\/index$/, '')

    // Try to fetch the title from the referenced content
    let title = cleanSlug.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || cleanSlug
    try {
      if (!collectionCache[mapping.collection]) {
        collectionCache[mapping.collection] = await queryCollection(mapping.collection as any).limit(200).all()
      }
      const ref = collectionCache[mapping.collection]!.find((r: any) => {
        const p = (r.path || '').replace(/^\//, '')
        return p.includes(cleanSlug)
      })
      if (ref && (ref as any).title) {
        title = (ref as any).title
      }
    } catch { /* use fallback title */ }

    subItems.push({
      collection: mapping.collection,
      slug: cleanSlug,
      title,
    })
  }
  return subItems
}

// Track importing state for loading indicator
const importingId = ref<string | null>(null)

// Refresh confirmation dialog state
const showRefreshConfirm = ref(false)
const refreshTargetId = ref<string | null>(null)

/** Import lesson sub-items for an outline item (no toggle — always imports) */
async function importLessonChildren(id: string) {
  const idx = items.value.findIndex(i => i.id === id)
  if (idx < 0) return
  const item = items.value[idx]!
  if (!isLessonContent(item)) return

  // If already imported, skip (use refreshImportedChildren instead)
  if (item.importChildren) return

  importingId.value = id
  try {
    item.importChildren = true
    const outlineNodes = await fetchLessonOutlineNodes(item.content)
    if (outlineNodes.length === 0) {
      item.importChildren = false
      emitUpdate()
      return
    }

    const freshIdx = items.value.findIndex(i => i.id === id)
    if (freshIdx < 0) return
    const { end } = getSubtreeRange(freshIdx)
    const baseDepth = items.value[freshIdx]!.depth + 1

    /**
     * Recursively flatten the lesson outline into FlatItems, preserving
     * the category → item hierarchy. Every node (category headers and
     * leaf content items alike) gets importedFrom: id so that
     * removeImportedChildren() can cleanly remove the whole subtree.
     */
    function flattenForImport(nodes: OutlineNode[], depth: number): FlatItem[] {
      const result: FlatItem[] = []
      for (const node of nodes) {
        const collection = node.content ? (node.content.split('/')[0] || '') : ''
        result.push({
          id: generateId(),
          title: node.title || '',
          path: node.path || slugify(node.title || ''),
          content: node.content || '',
          version: '',
          icon: collection ? (typeIconNames[collection] || '') : '',
          depth,
          imported: true,
          locked: true,
          importedFrom: id,
        })
        if (node.items?.length) {
          result.push(...flattenForImport(node.items, depth + 1))
        }
      }
      return result
    }

    const newItems = flattenForImport(outlineNodes, baseDepth)
    items.value.splice(end, 0, ...newItems)
    // Expand parent if collapsed
    collapsedIds.value.delete(id)
    emitUpdate()
  } catch (e) {
    console.error('[import] importLessonChildren error:', e)
    item.importChildren = false
  } finally {
    importingId.value = null
  }
}

/** Remove all imported children for a given parent */
function removeImportedChildren(parentId: string) {
  items.value = items.value.filter(i => i.importedFrom !== parentId)
}

/** Prompt user to confirm refresh of imported lesson sub-items */
function promptRefreshChildren(id: string) {
  refreshTargetId.value = id
  showRefreshConfirm.value = true
}

/** Refresh imported lesson sub-items: remove current children, re-import */
async function confirmRefreshChildren() {
  const id = refreshTargetId.value
  showRefreshConfirm.value = false
  refreshTargetId.value = null
  if (!id) return

  const item = items.value.find(i => i.id === id)
  if (!item) return

  // Remove existing imported children and reset flag
  // Do NOT emitUpdate() here — it would trigger initFromProp() which
  // regenerates all item IDs, causing importLessonChildren to fail.
  removeImportedChildren(id)
  item.importChildren = false

  // Re-import (this will emitUpdate after inserting new children)
  await importLessonChildren(id)
}

function cancelRefreshChildren() {
  showRefreshConfirm.value = false
  refreshTargetId.value = null
}

/** Toggle lock on an imported item */
function toggleLock(id: string) {
  const item = items.value.find(i => i.id === id)
  if (!item || !item.imported) return
  item.locked = !item.locked
  emitUpdate()
}

function openPicker(itemId: string) {
  pickerTargetId.value = itemId
  pickerQuery.value = ''
  pickerType.value = 'all'
  pickerIsNewItem.value = false
  showContentPicker.value = true
  // Pre-filter to the current item's collection if it has content linked
  const item = items.value.find(i => i.id === itemId)
  if (item?.content) {
    const coll = item.content.split('/')[0] || ''
    if (SEARCHABLE_COLLECTIONS.some(c => c.name === coll)) {
      pickerType.value = coll
    }
  }
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
  // If this lesson had imported children, remove them
  if (item.importChildren) {
    removeImportedChildren(id)
    item.importChildren = false
  }
  item.content = ''
  item.version = ''
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

    // Determine the currently linked content's key so we can boost it to the top
    let currentKey = ''
    if (pickerTargetId.value) {
      const targetItem = items.value.find(i => i.id === pickerTargetId.value)
      if (targetItem?.content) {
        const parts = targetItem.content.split('/')
        const coll = parts[0] || ''
        // Extract base slug: strip collection prefix and /v/x.y.z suffix
        const vIdx = parts.indexOf('v')
        const baseSlug = vIdx > 1 ? parts.slice(1, vIdx).join('/') : parts.slice(1).join('/')
        currentKey = `${coll}/${baseSlug}`

        // Pre-select the pinned version for this item
        if (targetItem.version && grouped.has(currentKey)) {
          const entry = grouped.get(currentKey)!
          const pinnedVer = entry.versions.find(v => v.version === targetItem.version)
          if (pinnedVer) {
            selectedVersions.value[currentKey] = pinnedVer.slug
          }
        }
      }
    }

    results.sort((a, b) => {
      const aKey = `${a.collection}/${a.baseSlug}`
      const bKey = `${b.collection}/${b.baseSlug}`
      // Currently linked item always comes first
      if (aKey === currentKey && bKey !== currentKey) return -1
      if (bKey === currentKey && aKey !== currentKey) return 1
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
  const itemId = pickerTargetId.value
  const item = items.value.find(i => i.id === itemId)
  if (item) {
    // If changing content on an item that had imported children, remove old imports first
    if (item.importChildren) {
      removeImportedChildren(itemId)
      item.importChildren = false
    }
    const key = `${result.collection}/${result.baseSlug}`
    const chosenSlug = selectedVersions.value[key] || result.baseSlug
    item.content = `${result.collection}/${chosenSlug}`
    // Store version from the selected picker version
    const chosenVersion = result.versions.find(v => v.slug === chosenSlug)
    item.version = chosenVersion?.version || ''
    if (!item.title) item.title = result.title
    if (!item.path) item.path = slugify(result.title)
    // Set default icon from content type if none set
    if (!item.icon) item.icon = typeIconNames[result.collection] || ''
    emitUpdate()

    // Auto-import sub-items when linking a lesson
    if (result.collection === 'lessons') {
      nextTick(() => importLessonChildren(itemId))
    }
  }
  pickerIsNewItem.value = false
  showContentPicker.value = false
  pickerTargetId.value = null
}

// ── Keyboard shortcuts ────────────────────────────────────────────────

/** Keyboard handler for the input field (edit mode) */
function handleKeydown(event: KeyboardEvent, item: FlatItem) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    event.stopPropagation()
    stopEditing()
    return
  } else if (event.key === 'Escape') {
    event.stopPropagation()
  } else if (event.key === 'Tab' && !event.shiftKey) {
    event.preventDefault()
    indentItem(item.id)
  } else if (event.key === 'Tab' && event.shiftKey) {
    event.preventDefault()
    outdentItem(item.id)
  } else if (event.key === 'Backspace' && !item.title && !item.content) {
    event.preventDefault()
    if (items.value.length > 1) {
      stopEditing()
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

/** Keyboard handler for the row itself (display mode) */
function handleRowKeydown(event: KeyboardEvent, item: FlatItem, realIndex: number) {
  // Don't intercept when editing — the input handles it
  if (editingId.value === item.id) return

  const isLockedImport = item.imported && item.locked

  if (event.key === 'Tab' && !event.shiftKey) {
    event.preventDefault()
    if (!isLockedImport) indentItem(item.id)
  } else if (event.key === 'Tab' && event.shiftKey) {
    event.preventDefault()
    if (!isLockedImport) outdentItem(item.id)
  } else if (event.key === 'Enter' || event.key === 'F2') {
    event.preventDefault()
    if (!isLockedImport) startEditing(item.id)
  } else if (event.key === 'ArrowUp' && event.altKey) {
    event.preventDefault()
    if (!isLockedImport) moveUp(item.id)
  } else if (event.key === 'ArrowDown' && event.altKey) {
    event.preventDefault()
    if (!isLockedImport) moveDown(item.id)
  } else if (event.key === 'ArrowUp' && !event.altKey) {
    event.preventDefault()
    // Focus previous visible item
    const vis = visibleItems.value
    const curVIdx = vis.findIndex(v => v.item.id === item.id)
    if (curVIdx > 0) {
      const prevEl = document.querySelector(`[data-outline-item][data-item-id="${vis[curVIdx - 1]!.item.id}"]`) as HTMLElement | null
      prevEl?.focus()
    }
  } else if (event.key === 'ArrowDown' && !event.altKey) {
    event.preventDefault()
    // Focus next visible item
    const vis = visibleItems.value
    const curVIdx = vis.findIndex(v => v.item.id === item.id)
    if (curVIdx < vis.length - 1) {
      const nextEl = document.querySelector(`[data-outline-item][data-item-id="${vis[curVIdx + 1]!.item.id}"]`) as HTMLElement | null
      nextEl?.focus()
    }
  } else if (event.key === 'ArrowRight') {
    // Expand if collapsed
    if (hasChildren(realIndex) && collapsedIds.value.has(item.id)) {
      event.preventDefault()
      toggleCollapse(item.id)
    }
  } else if (event.key === 'ArrowLeft') {
    // Collapse if expanded
    if (hasChildren(realIndex) && !collapsedIds.value.has(item.id)) {
      event.preventDefault()
      toggleCollapse(item.id)
    }
  } else if (event.key === 'Delete' || (event.key === 'Backspace' && !item.title && !item.content)) {
    event.preventDefault()
    if (items.value.length > 1) removeItem(item.id)
  }
}

function setItemRef(id: string, el: any) {
  if (el) itemInputRefs.value[id] = el.$el || el
}

// ── Edit mode ─────────────────────────────────────────────────────────

const editingId = ref<string | null>(null)

function startEditing(id: string) {
  // Block editing for locked imported items
  const item = items.value.find(i => i.id === id)
  if (item?.imported && item?.locked) return
  editingId.value = id
  nextTick(() => {
    const el = itemInputRefs.value[id]
    if (el) {
      el.focus()
      // Place cursor at end
      if (el instanceof HTMLInputElement) {
        el.selectionStart = el.selectionEnd = el.value.length
      }
    }
  })
}

function stopEditing() {
  editingId.value = null
}

// ── Drag & Drop ───────────────────────────────────────────────────────

const draggedId = ref<string | null>(null)
const dragOverId = ref<string | null>(null)
const dragPosition = ref<'before' | 'after'>('after')

const dragStartX = ref(0)
const dragOriginalDepth = ref(0)
const dragPreviewDepth = ref<number | null>(null)
const INDENT_PX = 20

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

// ── Collapse / expand all ─────────────────────────────────────────────

/** True when at least one item has children */
const hasAnyWithChildren = computed(() =>
  items.value.some((_, i) => hasChildren(i))
)

function collapseAll() {
  for (let i = 0; i < items.value.length; i++) {
    if (hasChildren(i)) collapsedIds.value.add(items.value[i]!.id)
  }
}

function expandAll() {
  collapsedIds.value.clear()
}

/**
 * Returns one entry per depth level that "closes" after visible item at vIdx
 * (i.e. levels for which this item is the last child). Ordered deepest first.
 * Each entry carries the id of the item to call addItemAfter() with so the
 * new sibling is inserted at exactly that depth.
 */
function closingRows(vIdx: number): { depth: number; afterId: string; realIndex: number }[] {
  const { item, index: realIdx } = visibleItems.value[vIdx]!
  const nextDepth =
    vIdx + 1 < visibleItems.value.length
      ? visibleItems.value[vIdx + 1]!.item.depth
      : -1
  if (nextDepth >= item.depth) return []

  const result: { depth: number; afterId: string; realIndex: number }[] = []
  for (let d = item.depth; d > nextDepth; d--) {
    // For the item's own depth, use its id directly.
    // For shallower depths, walk backward through visibleItems to find the
    // last item at that depth (the parent whose subtree ends here).
    let afterId = item.id
    if (d < item.depth) {
      for (let i = vIdx - 1; i >= 0; i--) {
        const vi = visibleItems.value[i]!
        if (vi.item.depth === d) { afterId = vi.item.id; break }
        if (vi.item.depth < d) break
      }
    }
    result.push({ depth: d, afterId, realIndex: realIdx })
  }
  return result
}
</script>

<template>
  <div class="space-y-2">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <label class="text-sm font-medium flex items-center gap-2">
        <ListTree class="h-4 w-4 text-muted-foreground" />
        Outline
      </label>
      <div class="flex items-center gap-2">
        <template v-if="items.length > 0 && hasAnyWithChildren">
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Collapse all"
            @click="collapseAll"
          >
            <ChevronRight class="h-3 w-3" />
            Collapse all
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Expand all"
            @click="expandAll"
          >
            <ChevronDown class="h-3 w-3" />
            Expand all
          </button>
        </template>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] transition-colors"
          :class="showIcons ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-accent'"
          title="Toggle item icons"
          @click="showIcons = !showIcons"
        >
          <Eye v-if="showIcons" class="h-3 w-3" />
          <EyeOff v-else class="h-3 w-3" />
          Icons
        </button>
        <span class="text-xs text-muted-foreground">
          {{ sectionCount }} section{{ sectionCount !== 1 ? 's' : '' }} · {{ totalCount }} item{{ totalCount !== 1 ? 's' : '' }}
        </span>
      </div>
    </div>

    <!-- Tree -->
    <div v-if="items.length > 0" class="rounded-lg border bg-background" role="tree">
      <template v-for="({ item, index: realIndex }, vIdx) in visibleItems" :key="item.id">
      <div
        data-outline-item
        :data-item-id="item.id"
        :draggable="editingId !== item.id && !(item.imported && item.locked)"
        tabindex="0"
        role="treeitem"
        :aria-level="item.depth + 1"
        :aria-expanded="hasChildren(realIndex) ? !collapsedIds.has(item.id) : undefined"
        :aria-label="item.title || (item.depth === 0 ? 'Empty section' : 'Empty item')"
        :class="[
          'group relative flex items-center h-8 pl-2 pr-2 transition-colors focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary/50',
          item.imported && item.locked ? '' : 'hover:bg-accent/40 focus:bg-accent/30',
          draggedId === item.id ? 'opacity-40' : '',
        ]"
        @keydown="handleRowKeydown($event, item, realIndex)"
        @dragstart="onDragStart($event, item.id)"
        @dragend="onDragEnd"
        @dragover="onDragOver($event, item.id)"
        @dragleave="onDragLeave($event, item.id)"
        @drop="onDrop($event, item.id)"
      >
        <!-- Drop indicator line -->
        <div
          v-if="dragOverId === item.id && draggedId !== item.id"
          class="absolute left-0 right-0 z-20 pointer-events-none"
          :class="dragPosition === 'before' ? '-top-px' : '-bottom-px'"
        >
          <div class="h-0.5 bg-primary rounded-full" />
          <div
            class="absolute w-2 h-2 rounded-full border-2 border-primary bg-background"
            :class="dragPosition === 'before' ? '-top-[3px] -left-1' : '-top-[3px] -left-1'"
          />
        </div>

        <!-- Tree indent + lines -->
        <div
          class="flex items-center shrink-0 h-full"
          :style="{ width: `${(draggedId === item.id && dragPreviewDepth !== null ? dragPreviewDepth : item.depth) * 20}px`, transition: draggedId === item.id ? 'width 0.15s ease' : '' }"
        >
          <!-- Depth spacers with tree lines -->
          <template v-for="d in item.depth" :key="d">
            <div class="relative w-5 h-full shrink-0">
              <!-- Ancestor levels (d < item.depth): full vertical line if siblings continue -->
              <div
                v-if="d < item.depth && hasNextSiblingAtDepth(realIndex, d)"
                class="absolute left-2 top-0 bottom-0 w-px bg-border"
              />
              <!-- Current level (d === item.depth): tree elbow connector -->
              <template v-if="d === item.depth">
                <!-- Vertical: top half (always — connects from parent line above) -->
                <div class="absolute left-2 top-0 h-1/2 w-px bg-border" />
                <!-- Vertical: bottom half (if siblings continue below, OR an add-row at this depth follows) -->
                <div
                  v-if="hasNextSiblingAtDepth(realIndex, d) || closingRows(vIdx).some(r => r.depth === d)"
                  class="absolute left-2 top-1/2 bottom-0 w-px bg-border"
                />
                <!-- Horizontal connector: from vertical line to toggle area center -->
                <div class="absolute left-2 top-1/2 h-px bg-border" style="right: -10px" />
              </template>
            </div>
          </template>
        </div>

        <!-- Collapse toggle / leaf dot -->
        <div class="w-5 h-full flex items-center justify-center shrink-0 relative">
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

        <!-- Item icon (when icons are enabled) -->
        <button
          v-if="showIcons && getItemIcon(item)"
          type="button"
          class="shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-accent transition-colors"
          :class="item.icon ? 'text-primary' : 'text-muted-foreground/60'"
          :title="item.icon ? `Icon: ${item.icon} (click to change)` : 'Set custom icon'"
          @click.stop="openIconPicker(item.id)"
        >
          <component :is="getItemIcon(item)" class="h-3.5 w-3.5" />
        </button>
        <button
          v-else-if="showIcons && !getItemIcon(item)"
          type="button"
          class="shrink-0 w-5 h-5 flex items-center justify-center rounded text-muted-foreground/30 hover:text-muted-foreground/60 hover:bg-accent transition-colors opacity-0 group-hover:opacity-100"
          title="Set icon"
          @click.stop="openIconPicker(item.id)"
        >
          <ImageIcon class="h-3.5 w-3.5" />
        </button>

        <!-- Title: display mode (draggable) or edit mode (input) -->
        <div v-if="editingId !== item.id" :class="['flex-1 min-w-0 flex items-center h-full select-none', item.imported && item.locked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing']" @dblclick.stop="!(item.imported && item.locked) && startEditing(item.id)">
          <!-- Lock icon for imported locked items -->
          <Lock v-if="item.imported && item.locked" class="h-3 w-3 shrink-0 text-muted-foreground/60 mr-0.5" />
          <span
            v-if="item.title"
            :class="[
              'truncate text-sm px-1.5',
              item.depth === 0 ? 'font-medium' : 'text-muted-foreground',
              item.imported && item.locked ? 'text-muted-foreground/80' : '',
            ]"
          >{{ item.title }}</span>
          <span
            v-else
            class="truncate text-sm px-1.5 text-muted-foreground/40 italic"
          >{{ item.depth === 0 ? 'Section title…' : 'Item title…' }}</span>
        </div>
        <input
          v-else
          :ref="(el) => setItemRef(item.id, el)"
          :value="item.title"
          :placeholder="item.depth === 0 ? 'Section title…' : 'Item title…'"
          :class="[
            'flex-1 min-w-0 border outline-none text-sm h-6 my-auto px-1.5 rounded-md',
            'bg-background border-border/60 focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/40',
            item.depth === 0 ? 'font-medium' : 'text-muted-foreground',
          ]"
          @input="updateTitle(item.id, ($event.target as HTMLInputElement).value)"
          @keydown="handleKeydown($event, item)"
          @keydown.escape.prevent="stopEditing()"
        />

        <!-- Edit toggle: pencil (hover only) to enter edit, checkmark to confirm -->
        <button
          v-if="!(item.imported && item.locked)"
          type="button"
          :class="[
            'shrink-0 p-1 rounded text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-colors',
            editingId === item.id ? '' : 'opacity-0 group-hover:opacity-100',
          ]"
          :title="editingId === item.id ? 'Done editing' : 'Edit title'"
          @click.stop="editingId === item.id ? stopEditing() : startEditing(item.id)"
        >
          <Check v-if="editingId === item.id" class="h-3 w-3" />
          <Pencil v-else class="h-3 w-3" />
        </button>

        <!-- Lock/unlock toggle for imported items -->
        <button
          v-if="item.imported"
          type="button"
          class="shrink-0 p-1 rounded text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-colors opacity-0 group-hover:opacity-100"
          :title="item.locked ? 'Unlock item' : 'Lock item'"
          @click.stop="toggleLock(item.id)"
        >
          <Lock v-if="item.locked" class="h-3 w-3" />
          <Unlock v-else class="h-3 w-3" />
        </button>

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
          :title="item.content + (item.version ? ` (v${item.version})` : '')"
          @click.stop="!(item.imported && item.locked) && openPicker(item.id)"
        >
          <component :is="getContentIcon(item.content)" class="h-3 w-3" />
          <span class="max-w-30 truncate">{{ item.content.includes('/v/') ? item.content.split('/').slice(1, item.content.split('/').indexOf('v')).join('/') : item.content.split('/').slice(1).join('/') }}</span>
        </button>

        <!-- Version badge -->
        <span
          v-if="item.version"
          class="shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 px-1.5 py-0 text-[10px] font-medium text-blue-700 dark:text-blue-300 mr-1"
          :title="`Pinned to version ${item.version}`"
        >
          v{{ item.version }}
        </span>

        <!-- Loading indicator while importing lesson sub-items -->
        <span
          v-if="importingId === item.id"
          class="shrink-0 p-1 text-primary animate-pulse mr-0.5"
          title="Importing lesson items…"
        >
          <Loader2 class="h-3 w-3 animate-spin" />
        </span>

        <!-- Refresh imported lesson sub-items (already imported) -->
        <button
          v-else-if="isLessonContent(item) && !item.imported && item.importChildren"
          type="button"
          :class="[
            'shrink-0 p-1 rounded transition-colors mr-0.5',
            'text-primary hover:text-primary/80 hover:bg-accent',
          ]"
          title="Refresh lesson sub-items"
          @click.stop="promptRefreshChildren(item.id)"
        >
          <RefreshCw class="h-3 w-3" />
        </button>

        <!-- Import lesson sub-items (not yet imported) -->
        <button
          v-else-if="isLessonContent(item) && !item.imported && !item.importChildren"
          type="button"
          :class="[
            'shrink-0 p-1 rounded transition-colors mr-0.5',
            'text-muted-foreground/50 hover:text-foreground hover:bg-accent opacity-0 group-hover:opacity-100',
          ]"
          title="Import lesson sub-items"
          @click.stop="importLessonChildren(item.id)"
        >
          <PackageOpen class="h-3 w-3" />
        </button>

        <!-- Hover actions -->
        <div :class="['shrink-0 flex items-center transition-opacity', item.imported && item.locked ? 'opacity-0 group-hover:opacity-80' : 'opacity-0 group-hover:opacity-100']">
          <button
            v-if="!item.content && !(item.imported && item.locked)"
            type="button"
            class="p-1 rounded text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-colors"
            title="Link content"
            @click.stop="openPicker(item.id)"
          >
            <Link class="h-3 w-3" />
          </button>
          <button
            v-if="item.content && !(item.imported && item.locked)"
            type="button"
            class="p-1 rounded text-muted-foreground/50 hover:text-destructive transition-colors"
            title="Unlink"
            @click.stop="unlinkContent(item.id)"
          >
            <X class="h-3 w-3" />
          </button>
          <button
            v-if="item.depth < 3 && !(item.imported && item.locked)"
            type="button"
            class="p-1 rounded text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-colors"
            title="Add child"
            @click.stop="addChild(item.id, true)"
          >
            <Plus class="h-3 w-3" />
          </button>
          <button
            v-if="!(item.imported && item.locked)"
            type="button"
            class="p-1 rounded text-muted-foreground/50 hover:text-destructive transition-colors"
            title="Delete"
            @click.stop="removeItem(item.id)"
          >
            <Trash2 class="h-3 w-3" />
          </button>
        </div>
      </div>

      <!-- Ghost add-rows: one per closing depth, from deepest to shallowest -->
      <div
        v-for="row in closingRows(vIdx)"
        :key="`add-${item.id}-${row.depth}`"
        role="button"
        :title="`Add ${row.depth === 0 ? 'section' : 'item'} here`"
        class="group/add relative flex items-center h-6 cursor-pointer select-none bg-background transition-colors hover:bg-accent/40"
        @click="addItemAfter(row.afterId)"
      >
        <!-- Tree indent with ancestor lines -->
        <div class="flex items-center shrink-0 h-full pl-2" :style="{ width: `${8 + row.depth * 20}px` }">
          <template v-for="d in row.depth" :key="d">
            <div class="relative w-5 h-full shrink-0">
              <!-- Ancestor vertical line: only if siblings continue below at that depth -->
              <div
                v-if="d < row.depth && hasNextSiblingAtDepth(row.realIndex, d)"
                class="absolute left-2 top-0 bottom-0 w-px bg-border"
              />
              <!-- Elbow connector at the row's own depth -->
              <template v-if="d === row.depth">
                <!-- Top half: connects from parent line above -->
                <div class="absolute left-2 top-0 h-1/2 w-px bg-border" />
                <!-- No bottom half: this is the last position, so line ends here -->
                <!-- Horizontal connector -->
                <div class="absolute left-2 top-1/2 h-px bg-border" style="right: -10px" />
              </template>
            </div>
          </template>
        </div>

        <!-- Dot → Plus icon on hover -->
        <div class="w-5 h-full flex items-center justify-center shrink-0 relative">
          <div class="w-1.5 h-1.5 rounded-full bg-border group-hover/add:opacity-0 transition-opacity" />
          <Plus class="h-3 w-3 text-muted-foreground absolute opacity-0 group-hover/add:opacity-100 transition-opacity" />
        </div>

        <!-- Label, visible only on hover -->
        <span class="text-[11px] text-muted-foreground pl-1 opacity-0 group-hover/add:opacity-100 transition-opacity">
          Add {{ row.depth === 0 ? 'section' : 'item' }}
        </span>
      </div>
      </template>
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
      <span><kbd class="font-mono">↵</kbd> edit</span>
      <span><kbd class="font-mono">⇥</kbd> indent</span>
      <span><kbd class="font-mono">⇧⇥</kbd> outdent</span>
      <span><kbd class="font-mono">⌥↑↓</kbd> move</span>
      <span><kbd class="font-mono">↑↓</kbd> navigate</span>
      <span><kbd class="font-mono">←→</kbd> collapse</span>
      <span>drag ↔ indent</span>
    </div>

    <!-- ═══ Refresh Confirmation Dialog ═══ -->
    <Dialog v-model:open="showRefreshConfirm">
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <DialogTitle>Refresh Lesson Items?</DialogTitle>
          <DialogDescription>
            This will remove the current imported sub-items and re-import them from the lesson. Any manual changes to the imported items will be lost.
          </DialogDescription>
        </DialogHeader>
        <div class="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" @click="cancelRefreshChildren">Cancel</Button>
          <Button variant="default" size="sm" @click="confirmRefreshChildren">
            <RefreshCw class="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- ═══ Icon Picker Dialog ═══ -->
    <Dialog v-model:open="showIconPicker">
      <DialogContent class="max-w-lg max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose Icon</DialogTitle>
          <DialogDescription>
            Search the Lucide icon library to assign a custom icon.
          </DialogDescription>
        </DialogHeader>

        <div class="relative">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            v-model="iconPickerQuery"
            placeholder="Search icons…"
            class="pl-10"
          />
        </div>

        <div class="flex-1 overflow-y-auto min-h-0 -mx-2 px-2">
          <div v-if="filteredIcons.length === 0" class="flex flex-col items-center justify-center py-8 text-center">
            <Search class="h-6 w-6 text-muted-foreground/40 mb-2" />
            <p class="text-sm text-muted-foreground">No icons match &ldquo;{{ iconPickerQuery }}&rdquo;</p>
          </div>
          <div v-else class="grid grid-cols-6 gap-1 py-2">
            <button
              v-for="ic in filteredIcons"
              :key="ic.name"
              type="button"
              class="flex flex-col items-center justify-center gap-1 rounded-md p-2 transition-colors hover:bg-accent group/icon"
              :title="ic.name"
              @click="selectIcon(ic.name)"
            >
              <component :is="resolveIconComponent(ic.name)" class="h-5 w-5 text-foreground" />
              <span class="text-[9px] text-muted-foreground truncate w-full text-center">{{ ic.name }}</span>
            </button>
          </div>
        </div>

        <div class="flex justify-between items-center pt-2 border-t">
          <button
            type="button"
            class="text-xs text-destructive hover:underline"
            @click="() => { if (iconPickerTargetId) { clearIcon(iconPickerTargetId); showIconPicker = false; iconPickerTargetId = null } }"
          >
            Remove icon
          </button>
          <Button variant="ghost" size="sm" @click="showIconPicker = false">Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>

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
              :class="[
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors',
                pickerCurrentKey === `${r.collection}/${r.baseSlug}`
                  ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800'
                  : 'hover:bg-accent'
              ]"
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
