/**
 * Book outline composable
 *
 * Provides utilities for navigating a book's hierarchical outline tree,
 * resolving content references, and computing prev/next chapter links.
 */

import type { OutlineNode } from './useOutlineBuilder'

export interface FlatChapter {
  title: string
  /** Full path segments joined, e.g. "part-1/chapter-2" */
  fullPath: string
  /** Content reference string, e.g. "articles/my-article" */
  content?: string
  /** Depth level (0-based) */
  depth: number
  /** Whether this node has children (is a section heading) */
  isSection: boolean
  /** The original outline node */
  node: OutlineNode
}

/**
 * Flatten a nested outline tree into an ordered list of chapters.
 * Section headings (nodes with children but no content) are included
 * but marked as `isSection: true`.
 */
export function flattenOutline(
  nodes: OutlineNode[],
  parentPath: string = '',
  depth: number = 0
): FlatChapter[] {
  const result: FlatChapter[] = []

  for (const node of nodes) {
    const segment = node.path || slugify(node.title)
    const fullPath = parentPath ? `${parentPath}/${segment}` : segment
    const hasChildren = node.items && node.items.length > 0

    result.push({
      title: node.title,
      fullPath,
      content: node.content,
      depth,
      isSection: !!(hasChildren && !node.content),
      node,
    })

    if (hasChildren) {
      result.push(...flattenOutline(node.items!, fullPath, depth + 1))
    }
  }

  return result
}

/**
 * Get only navigable chapters (nodes that have content references).
 */
export function getNavigableChapters(flat: FlatChapter[]): FlatChapter[] {
  return flat.filter((ch) => !!ch.content)
}

/**
 * Find a chapter by its fullPath in the flat list.
 */
export function findChapter(flat: FlatChapter[], fullPath: string): FlatChapter | undefined {
  return flat.find((ch) => ch.fullPath === fullPath)
}

/**
 * Get prev/next navigable chapters relative to the current path.
 */
export function getPrevNext(
  flat: FlatChapter[],
  currentPath: string
): { prev: FlatChapter | null; next: FlatChapter | null } {
  const navigable = getNavigableChapters(flat)
  const idx = navigable.findIndex((ch) => ch.fullPath === currentPath)

  if (idx === -1) return { prev: null, next: null }

  return {
    prev: idx > 0 ? navigable[idx - 1] ?? null : null,
    next: idx < navigable.length - 1 ? navigable[idx + 1] ?? null : null,
  }
}

/**
 * Parse a content reference string into collection and slug.
 * Format: "collection/slug" (e.g., "articles/my-article")
 */
export function parseContentRef(ref: string): { collection: string; slug: string } | null {
  const slashIndex = ref.indexOf('/')
  if (slashIndex === -1) return null
  return {
    collection: ref.slice(0, slashIndex),
    slug: ref.slice(slashIndex + 1),
  }
}

/**
 * Build breadcrumb trail for a chapter within the book.
 * Returns array of { title, fullPath } from root to the current node.
 */
export function getChapterBreadcrumbs(
  nodes: OutlineNode[],
  targetPath: string,
  parentPath: string = ''
): Array<{ title: string; fullPath: string }> | null {
  for (const node of nodes) {
    const segment = node.path || slugify(node.title)
    const fullPath = parentPath ? `${parentPath}/${segment}` : segment

    if (fullPath === targetPath) {
      return [{ title: node.title, fullPath }]
    }

    if (node.items) {
      const found = getChapterBreadcrumbs(node.items, targetPath, fullPath)
      if (found) {
        return [{ title: node.title, fullPath }, ...found]
      }
    }
  }

  return null
}

/**
 * Build the sidebar tree structure with active/expanded state.
 */
export interface SidebarNode {
  title: string
  fullPath: string
  content?: string
  depth: number
  isSection: boolean
  isActive: boolean
  isExpanded: boolean
  children: SidebarNode[]
}

export function buildSidebarTree(
  nodes: OutlineNode[],
  currentPath: string,
  parentPath: string = '',
  depth: number = 0
): SidebarNode[] {
  return nodes.map((node) => {
    const segment = node.path || slugify(node.title)
    const fullPath = parentPath ? `${parentPath}/${segment}` : segment
    const hasChildren = node.items && node.items.length > 0
    const isActive = fullPath === currentPath
    const isAncestor = currentPath.startsWith(fullPath + '/')

    const children = hasChildren
      ? buildSidebarTree(node.items!, currentPath, fullPath, depth + 1)
      : []

    return {
      title: node.title,
      fullPath,
      content: node.content,
      depth,
      isSection: !!(hasChildren && !node.content),
      isActive,
      isExpanded: isActive || isAncestor || children.some((c) => c.isActive || c.isExpanded),
      children,
    }
  })
}

/**
 * Vue composable wrapping outline utilities for reactive use.
 */
export function useBookOutline(outline: Ref<OutlineNode[] | undefined>, currentPath: Ref<string>) {
  const flatChapters = computed(() => {
    if (!outline.value) return []
    return flattenOutline(outline.value)
  })

  const navigableChapters = computed(() => getNavigableChapters(flatChapters.value))

  const currentChapter = computed(() => findChapter(flatChapters.value, currentPath.value))

  const prevNext = computed(() => getPrevNext(flatChapters.value, currentPath.value))

  const breadcrumbs = computed(() => {
    if (!outline.value) return []
    return getChapterBreadcrumbs(outline.value, currentPath.value) || []
  })

  const sidebarTree = computed(() => {
    if (!outline.value) return []
    return buildSidebarTree(outline.value, currentPath.value)
  })

  return {
    flatChapters,
    navigableChapters,
    currentChapter,
    prevNext,
    breadcrumbs,
    sidebarTree,
  }
}

// ─── Utils ──────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}
