/**
 * Composable for querying and managing CMS content.
 *
 * Wraps Nuxt Content's queryCollection with CMS-specific utilities
 * like sorting, filtering, and search that align with CMS config.
 */
import type { CmsCollection } from '~/lib/cms/config-types'

export interface CmsContentItem {
  id: string
  path: string
  title: string
  slug: string
  // Common frontmatter fields
  date?: string
  description?: string
  draft?: boolean
  version?: string
  // Raw data for display
  [key: string]: any
}

interface UseCmsContentOptions {
  /** Number of items per page */
  perPage?: number
  /** Initial sort field */
  sortBy?: string
  /** Sort direction */
  sortDir?: 'asc' | 'desc'
  /** Search query */
  search?: string
}

export function useCmsContent(
  collectionName: Ref<string> | string,
  options: UseCmsContentOptions = {}
) {
  const name = toRef(collectionName)
  const { getCollection } = useCmsConfig()

  // Reactive options
  const page = ref(1)
  const perPage = ref(options.perPage ?? 20)
  const sortBy = ref(options.sortBy ?? 'title')
  const sortDir = ref<'asc' | 'desc'>(options.sortDir ?? 'asc')
  const search = ref(options.search ?? '')

  // Get the collection config
  const collection = computed(() => getCollection(name.value))

  // Fetch all items for a collection
  const {
    data: allItems,
    status,
    error,
    refresh,
  } = useAsyncData(
    `cms-content-${name.value}`,
    async () => {
      try {
        const items = await queryCollection(name.value as any).all()
        return (items || []).map((item: any) => normalizeItem(item))
      } catch {
        return []
      }
    },
    {
      watch: [name],
    }
  )

  /**
   * Normalize a content item into a consistent shape
   */
  function normalizeItem(item: any): CmsContentItem {
    const path = item._path || item.path || ''
    const segments = path.split('/').filter(Boolean)
    const slug = segments[segments.length - 1] || item.stem || ''

    return {
      ...item,
      id: item.id || item._id || path,
      path,
      title: item.title || slug || 'Untitled',
      slug,
      date: item.date || item.createdAt || undefined,
      description: item.description || undefined,
      draft: item.draft ?? false,
      version: item.version || undefined,
    }
  }

  // Filtered + sorted + paginated items
  const filteredItems = computed(() => {
    let items = allItems.value ?? []

    // Search filter
    if (search.value) {
      const q = search.value.toLowerCase()
      items = items.filter(
        (item) =>
          item.title?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.slug?.toLowerCase().includes(q)
      )
    }

    // Sort
    items = [...items].sort((a, b) => {
      const aVal = a[sortBy.value] ?? ''
      const bVal = b[sortBy.value] ?? ''
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
      return sortDir.value === 'asc' ? cmp : -cmp
    })

    return items
  })

  const totalItems = computed(() => filteredItems.value.length)
  const totalPages = computed(() => Math.ceil(totalItems.value / perPage.value))

  const paginatedItems = computed(() => {
    const start = (page.value - 1) * perPage.value
    return filteredItems.value.slice(start, start + perPage.value)
  })

  // Reset page when filters change
  watch([search, sortBy, sortDir], () => {
    page.value = 1
  })

  /**
   * Get available sort fields from config
   */
  const sortableFields = computed(() => {
    const col = collection.value
    if (!col) return ['title']

    // Use sortable_fields from config, or fall back to common fields
    const configFields = (col as any).sortableFields
    if (configFields?.length) return configFields

    return ['title', 'date']
  })

  return {
    // Data
    items: paginatedItems,
    allItems: filteredItems,
    totalItems,
    totalPages,
    collection,
    status,
    error,

    // Controls
    page,
    perPage,
    sortBy,
    sortDir,
    search,
    sortableFields,

    // Actions
    refresh,
  }
}
