/**
 * useOutlineBuilder — Core composable for the Outline Builder tool.
 *
 * Manages an in-progress book outline as a flat list with depth levels,
 * supporting drag-and-drop reorder, indent/outdent, content linking,
 * and draft persistence via localStorage.
 *
 * The flat list renders with visual indentation and converts to/from
 * the nested `outline[]` structure used in book frontmatter.
 */

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

import { useLocalStorage } from '@vueuse/core'

/** A linked content reference (e.g. "lessons/3d-modeling-fundamentals") */
export interface LinkedContent {
  /** Collection name, e.g. "lessons" */
  collection: string
  /** Item slug within that collection */
  slug: string
  /** Resolved title (for display) */
  title: string
  /** Optional description */
  description?: string
}

/** A single row in the flat outline editor */
export interface OutlineItem {
  id: string
  /** Section / chapter title */
  title: string
  /** URL path segment (auto-derived from title when blank) */
  path: string
  /** Linked content reference string like "lessons/slug" */
  content: string
  /** Pinned content version, e.g. "1.2.0" */
  version?: string
  /** Depth: 0 = Part, 1 = Chapter, 2 = Section, 3 = Subsection (max 4 levels) */
  depth: number
  /** Optional linked content metadata (resolved) */
  linkedContent?: LinkedContent
}

/** A complete draft stored in localStorage */
export interface OutlineDraft {
  id: string
  /** Book title */
  title: string
  description: string
  author: string
  license: string
  coverImage: string
  learningObjectives: string[]
  tags: string[]
  items: OutlineItem[]
  createdAt: string
  updatedAt: string
}

/** Nested outline node matching the book frontmatter schema */
export interface OutlineNode {
  title: string
  path?: string
  content?: string
  version?: string
  icon?: string
  items?: OutlineNode[]
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2, 11)
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function createBlankItem(depth = 0): OutlineItem {
  return {
    id: generateId(),
    title: '',
    path: '',
    content: '',
    depth,
  }
}

function createBlankDraft(): OutlineDraft {
  return {
    id: generateId(),
    title: '',
    description: '',
    author: '',
    license: 'CC BY 4.0',
    coverImage: '',
    learningObjectives: [],
    tags: [],
    items: [createBlankItem(0)],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// --------------------------------------------------------------------------
// Flat → Nested conversion
// --------------------------------------------------------------------------

/**
 * Convert a flat item list (with depth) into a nested outline tree.
 * Depth 0 items become top-level nodes; depth 1+ become children of the
 * preceding shallower item.
 */
function flatToNested(items: OutlineItem[]): OutlineNode[] {
  const root: OutlineNode[] = []
  // Stack of { node, depth } tracking the current nesting path
  const stack: { node: OutlineNode; depth: number }[] = []

  for (const item of items) {
    const node: OutlineNode = {
      title: item.title,
      ...(item.path ? { path: item.path } : {}),
      ...(item.content ? { content: item.content } : {}),
      ...(item.version ? { version: item.version } : {}),
    }

    // Pop stack until we find the parent (depth < current)
    while (stack.length > 0 && stack[stack.length - 1]!.depth >= item.depth) {
      stack.pop()
    }

    if (stack.length === 0) {
      // Top-level node
      root.push(node)
    } else {
      // Child of the top of the stack
      const parent = stack[stack.length - 1]!.node
      if (!parent.items) parent.items = []
      parent.items.push(node)
    }

    stack.push({ node, depth: item.depth })
  }

  return root
}

/**
 * Convert a nested outline tree back into a flat item list with depths.
 */
function nestedToFlat(nodes: OutlineNode[], depth = 0): OutlineItem[] {
  const result: OutlineItem[] = []
  for (const node of nodes) {
    result.push({
      id: generateId(),
      title: node.title,
      path: node.path || '',
      content: node.content || '',
      version: node.version || '',
      depth,
    })
    if (node.items?.length) {
      result.push(...nestedToFlat(node.items, depth + 1))
    }
  }
  return result
}

// --------------------------------------------------------------------------
// Composable
// --------------------------------------------------------------------------

export function useOutlineBuilder() {
  // ── Draft list management (localStorage) ────────────────────────────
  const drafts = useLocalStorage<OutlineDraft[]>('outline-builder-drafts', [])
  const activeDraftId = useLocalStorage<string | null>('outline-builder-active-draft', null)

  // ── Active draft state ──────────────────────────────────────────────
  const draft = ref<OutlineDraft>(createBlankDraft())
  const isDirty = ref(false)
  const lastSaved = ref<string | null>(null)

  // Convenience accessors
  const items = computed(() => draft.value.items)
  const itemCount = computed(() => draft.value.items.length)
  const moduleCount = computed(() => draft.value.items.filter(i => i.depth === 0).length)

  // ── Draft CRUD ──────────────────────────────────────────────────────

  function newDraft() {
    const d = createBlankDraft()
    draft.value = d
    activeDraftId.value = d.id
    isDirty.value = false
    saveDraft()
  }

  function saveDraft() {
    draft.value.updatedAt = new Date().toISOString()
    const idx = drafts.value.findIndex((d: OutlineDraft) => d.id === draft.value.id)
    if (idx >= 0) {
      drafts.value[idx] = JSON.parse(JSON.stringify(draft.value))
    } else {
      drafts.value.push(JSON.parse(JSON.stringify(draft.value)))
    }
    activeDraftId.value = draft.value.id
    isDirty.value = false
    lastSaved.value = new Date().toISOString()
  }

  function loadDraft(id: string) {
    const d = drafts.value.find((d: OutlineDraft) => d.id === id)
    if (d) {
      draft.value = JSON.parse(JSON.stringify(d))
      activeDraftId.value = id
      isDirty.value = false
    }
  }

  function deleteDraft(id: string) {
    drafts.value = drafts.value.filter((d: OutlineDraft) => d.id !== id)
    if (activeDraftId.value === id) {
      activeDraftId.value = null
      newDraft()
    }
  }

  /** Restore last active draft on init */
  function restoreSession() {
    if (activeDraftId.value) {
      const d = drafts.value.find((d: OutlineDraft) => d.id === activeDraftId.value)
      if (d) {
        draft.value = JSON.parse(JSON.stringify(d))
        isDirty.value = false
        return true
      }
    }
    return false
  }

  // ── Item operations ─────────────────────────────────────────────────

  function markDirty() {
    isDirty.value = true
  }

  function addItem(afterId?: string, depth?: number) {
    const items = draft.value.items
    if (!afterId || items.length === 0) {
      const newItem = createBlankItem(depth ?? 0)
      items.push(newItem)
      markDirty()
      return newItem.id
    }
    const idx = items.findIndex(i => i.id === afterId)
    if (idx < 0) {
      const newItem = createBlankItem(depth ?? 0)
      items.push(newItem)
      markDirty()
      return newItem.id
    }
    const newItem = createBlankItem(depth ?? items[idx]!.depth)
    items.splice(idx + 1, 0, newItem)
    markDirty()
    return newItem.id
  }

  function addModule() {
    const newItem = createBlankItem(0)
    draft.value.items.push(newItem)
    markDirty()
    return newItem.id
  }

  function addChild(parentId: string) {
    const items = draft.value.items
    const parentIdx = items.findIndex(i => i.id === parentId)
    if (parentIdx < 0) return null

    const parentDepth = items[parentIdx]!.depth
    const childDepth = Math.min(parentDepth + 1, 3)

    // Find insertion point: after parent and all its existing children
    let insertIdx = parentIdx + 1
    while (insertIdx < items.length && items[insertIdx]!.depth > parentDepth) {
      insertIdx++
    }

    const newItem = createBlankItem(childDepth)
    items.splice(insertIdx, 0, newItem)
    markDirty()
    return newItem.id
  }

  function removeItem(id: string) {
    const items = draft.value.items
    const idx = items.findIndex(i => i.id === id)
    if (idx < 0) return

    // Remove item and all children at deeper depth
    const removedDepth = items[idx]!.depth
    let endIdx = idx + 1
    while (endIdx < items.length && items[endIdx]!.depth > removedDepth) {
      endIdx++
    }
    items.splice(idx, endIdx - idx)
    markDirty()
  }

  function updateItem(id: string, patch: Partial<OutlineItem>) {
    const item = draft.value.items.find(i => i.id === id)
    if (!item) return
    Object.assign(item, patch)
    // Auto-derive path from title if path is empty
    if (patch.title && !item.path) {
      item.path = slugify(patch.title)
    }
    markDirty()
  }

  function indent(id: string) {
    const items = draft.value.items
    const idx = items.findIndex(i => i.id === id)
    if (idx <= 0) return false
    const item = items[idx]
    // Can't exceed depth 3 or go deeper than previous item + 1
    const prevDepth = items[idx - 1]!.depth
    if (item!.depth >= 3 || item!.depth > prevDepth) return false
    item!.depth++
    markDirty()
    return true
  }

  function outdent(id: string) {
    const items = draft.value.items
    const idx = items.findIndex(i => i.id === id)
    if (idx < 0) return false
    const item = items[idx]
    if (item!.depth <= 0) return false
    item!.depth--
    markDirty()
    return true
  }

  function moveUp(id: string) {
    const items = draft.value.items
    const idx = items.findIndex(i => i.id === id)
    if (idx <= 0) return false
    ;[items[idx - 1], items[idx]] = [items[idx]!, items[idx - 1]!]
    markDirty()
    return true
  }

  function moveDown(id: string) {
    const items = draft.value.items
    const idx = items.findIndex(i => i.id === id)
    if (idx < 0 || idx >= items.length - 1) return false
    ;[items[idx], items[idx + 1]] = [items[idx + 1]!, items[idx]!]
    markDirty()
    return true
  }

  function reorder(fromIndex: number, toIndex: number) {
    const items = draft.value.items
    if (fromIndex < 0 || fromIndex >= items.length) return
    if (toIndex < 0 || toIndex >= items.length) return
    const [moved] = items.splice(fromIndex, 1)
    items.splice(toIndex, 0, moved!)
    markDirty()
  }

  function linkContent(id: string, linked: LinkedContent) {
    const item = draft.value.items.find(i => i.id === id)
    if (!item) return
    item.content = `${linked.collection}/${linked.slug}`
    item.linkedContent = linked
    if (!item.title && linked.title) {
      item.title = linked.title
    }
    markDirty()
  }

  function unlinkContent(id: string) {
    const item = draft.value.items.find(i => i.id === id)
    if (!item) return
    item.content = ''
    item.linkedContent = undefined
    markDirty()
  }

  // ── Conversion ──────────────────────────────────────────────────────

  /** Convert current flat items to nested outline for frontmatter */
  function toOutline(): OutlineNode[] {
    return flatToNested(draft.value.items)
  }

  /** Import a nested outline (e.g. from existing book) into flat items */
  function importOutline(nodes: OutlineNode[], meta?: Partial<OutlineDraft>) {
    draft.value.items = nestedToFlat(nodes)
    if (meta) {
      if (meta.title) draft.value.title = meta.title
      if (meta.description) draft.value.description = meta.description
      if (meta.author) draft.value.author = meta.author
      if (meta.license) draft.value.license = meta.license
      if (meta.coverImage) draft.value.coverImage = meta.coverImage
      if (meta.learningObjectives) draft.value.learningObjectives = meta.learningObjectives
      if (meta.tags) draft.value.tags = meta.tags
    }
    markDirty()
  }

  // ── Markdown generation ─────────────────────────────────────────────

  /** Generate a complete book markdown file from the current draft */
  function generateMarkdown(): string {
    const d = draft.value
    const outline = toOutline()

    // Build YAML frontmatter
    const fm: Record<string, any> = {
      title: d.title || 'Untitled Book',
      description: d.description || '',
      author: d.author || '',
      date: new Date().toISOString().split('T')[0],
      license: d.license || 'CC BY 4.0',
      published: false,
    }
    if (d.coverImage) fm.coverImage = d.coverImage
    if (d.learningObjectives?.length) fm.learningObjectives = d.learningObjectives
    if (d.tags?.length) fm.tags = d.tags
    if (outline.length) fm.outline = outline

    const yamlLines: string[] = ['---']
    yamlLines.push(...serializeYaml(fm))
    yamlLines.push('---')
    yamlLines.push('')
    yamlLines.push(d.description || '')
    yamlLines.push('')

    return yamlLines.join('\n')
  }

  /** Download the generated markdown as a file */
  function downloadMarkdown() {
    const md = generateMarkdown()
    const slug = slugify(draft.value.title || 'untitled-book')
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug}-index.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  /** Copy generated markdown to clipboard */
  async function copyToClipboard(): Promise<boolean> {
    try {
      const md = generateMarkdown()
      await navigator.clipboard.writeText(md)
      return true
    } catch {
      return false
    }
  }

  // ── Auto-save ───────────────────────────────────────────────────────

  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null

  function scheduleAutoSave() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    autoSaveTimer = setTimeout(() => {
      if (isDirty.value) {
        saveDraft()
      }
    }, 2000) // auto-save after 2 seconds of inactivity
  }

  // Watch for changes and schedule auto-save
  watch(
    () => draft.value,
    () => {
      if (isDirty.value) {
        scheduleAutoSave()
      }
    },
    { deep: true }
  )

  return {
    // State
    draft,
    drafts: computed(() => drafts.value),
    activeDraftId: computed(() => activeDraftId.value),
    items,
    itemCount,
    moduleCount,
    isDirty,
    lastSaved,

    // Draft management
    newDraft,
    saveDraft,
    loadDraft,
    deleteDraft,
    restoreSession,

    // Item operations
    addItem,
    addModule,
    addChild,
    removeItem,
    updateItem,
    indent,
    outdent,
    moveUp,
    moveDown,
    reorder,
    linkContent,
    unlinkContent,

    // Conversion & generation
    toOutline,
    importOutline,
    generateMarkdown,
    downloadMarkdown,
    copyToClipboard,

    // Utilities
    flatToNested,
    nestedToFlat,
  }
}

// --------------------------------------------------------------------------
// YAML serializer (simple, for frontmatter output)
// --------------------------------------------------------------------------

function serializeYaml(obj: Record<string, any>, indent = 0): string[] {
  const lines: string[] = []
  const pad = '  '.repeat(indent)

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue

    if (typeof value === 'string') {
      if (value.includes('\n') || value.includes(':') || value.includes('"') || value.includes("'")) {
        lines.push(`${pad}${key}: "${value.replace(/"/g, '\\"')}"`)
      } else {
        lines.push(`${pad}${key}: "${value}"`)
      }
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      lines.push(`${pad}${key}: ${value}`)
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${pad}${key}: []`)
      } else if (typeof value[0] === 'string') {
        lines.push(`${pad}${key}:`)
        for (const item of value) {
          lines.push(`${pad}  - "${item}"`)
        }
      } else if (typeof value[0] === 'object') {
        lines.push(`${pad}${key}:`)
        for (const item of value) {
          const childLines = serializeYaml(item, indent + 2)
          if (childLines.length > 0) {
            // First line of each object gets the list marker
            lines.push(`${pad}  - ${childLines[0]!.trimStart()}`)
            for (let i = 1; i < childLines.length; i++) {
              lines.push(`${pad}  ${childLines[i]!.slice(indent * 2)}`)
            }
          }
        }
      }
    } else if (typeof value === 'object') {
      lines.push(`${pad}${key}:`)
      lines.push(...serializeYaml(value, indent + 1))
    }
  }

  return lines
}
