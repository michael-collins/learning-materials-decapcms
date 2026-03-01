import { ref, computed, watch } from 'vue'

interface LessonContent {
  type: string
  slug: string
  title: string
  description?: string
  estimatedDuration?: string
  /** Primary category (top-level outline node title) this item belongs to */
  categoryTitle?: string
  /** Sub-category (second-level outline node title) this item belongs to */
  subCategoryTitle?: string
}

interface LessonBundle {
  title: string
  slug: string
  order?: number
  description?: string
  estimatedDuration?: string
  learningObjectives?: string[]
  items: LessonContent[]
}

interface SpecializationBundle {
  specialization: any
  lessons: any
  loading: any
  error: any
  refresh: () => Promise<void>
}

export function useSpecializationBundle(slug: any): SpecializationBundle {
  const specialization = ref<any>(null)
  const lessons = ref<LessonBundle[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const load = async () => {
    if (!slug.value) return
    loading.value = true
    error.value = null

    try {
      // Fetch specialization
      const spec = await queryCollection('specializations')
        .path(`/specializations/${slug.value}`)
        .first()
      specialization.value = spec

      // Get lesson slugs from specialization and fetch those lessons
      const lessonSlugs = Array.isArray(spec?.lessons) ? spec.lessons : []
      const lessonPromises = lessonSlugs.map((lessonSlug: string) =>
        queryCollection('lessons').path(`/lessons/${lessonSlug}`).first()
      )
      const fetchedLessons = await Promise.all(lessonPromises)
      const filtered = fetchedLessons
        .filter(Boolean)
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))

      // Fetch linked content for each lesson
      const lessonBundles: LessonBundle[] = []
      for (const lesson of filtered) {
        const items: LessonContent[] = []

        const collectLegacy = async (field: string, type: string, basePath: string) => {
          if (!lesson[field]) return
          const entries = await Promise.all(
            lesson[field].map((s: string) => queryCollection(type === 'articles' ? 'articles' : type).path(`${basePath}/${s}`).first())
          )
          entries.filter(Boolean).forEach((entry: any) => {
            items.push({
              type,
              slug: entry.slug,
              title: entry.title,
              description: entry.description,
              estimatedDuration: entry.estimatedDuration
            })
          })
        }

        const resolveItemType = (item: any) => {
          const rawType = item?.type || item?.__typename
          if (!rawType) return null
          if (rawType.endsWith('s')) return rawType
          return `${rawType}s`
        }

        const resolveItemSlug = (item: any) => {
          return (
            item?.lecture ||
            item?.tutorial ||
            item?.exercise ||
            item?.article ||
            item?.project ||
            item?.slug ||
            null
          )
        }

        /**
         * Walk a nested outline node list, collecting content items.
         * - Depth 0 nodes with children become primary category headers.
         * - Depth 1 nodes with children become sub-category headers.
         * - Leaf nodes (with `content`) become LessonContent entries tagged
         *   with their ancestor category and sub-category titles.
         * If a node has both `content` AND children, it emits an item for
         * itself before recursing into its children.
         */
        const collectOutline = async (nodes: any[], categoryTitle?: string, subCategoryTitle?: string) => {
          for (const node of nodes) {
            const hasChildren = Array.isArray(node.items) && node.items.length > 0

            if (node.content) {
              // Parse "collection/slug" ref
              const slashIdx = node.content.indexOf('/')
              if (slashIdx !== -1) {
                const collection = node.content.slice(0, slashIdx) as string
                const slug = node.content.slice(slashIdx + 1) as string
                try {
                  const entry = await queryCollection(collection as any)
                    .path(`/${collection}/${slug}`)
                    .first()
                  if (entry) {
                    items.push({
                      type: collection,
                      slug,
                      title: (entry as any).title,
                      description: (entry as any).description,
                      estimatedDuration: (entry as any).estimatedDuration,
                      // Only tag with category info when this is a leaf (no children)
                      categoryTitle: hasChildren ? undefined : (categoryTitle ?? node.title),
                      subCategoryTitle: hasChildren ? undefined : subCategoryTitle,
                    })
                  }
                } catch { /* skip unresolvable refs */ }
              }
            }

            if (hasChildren) {
              if (categoryTitle === undefined) {
                // This is a top-level category node — pass its title down
                await collectOutline(node.items, node.title, undefined)
              } else if (subCategoryTitle === undefined) {
                // This is a second-level node — becomes a sub-category
                await collectOutline(node.items, categoryTitle, node.title)
              } else {
                // Deeper levels — keep sub-category as the closest ancestor grouper
                await collectOutline(node.items, categoryTitle, node.title)
              }
            }
          }
        }

        const collectItems = async (lessonItems: any[]) => {
          const entries = await Promise.all(
            lessonItems.map(async (lessonItem: any) => {
              const type = resolveItemType(lessonItem)
              const slug = resolveItemSlug(lessonItem)
              if (!type || !slug) return null
              const basePath = type === 'articles' ? '/articles' : `/${type}`
              const entry = await queryCollection(type === 'articles' ? 'articles' : type)
                .path(`${basePath}/${slug}`)
                .first()
              return { entry, type, slug }
            })
          )

          entries.filter(Boolean).forEach((result: any) => {
            const { entry, type, slug } = result
            if (!entry) return
            items.push({
              type,
              slug,
              title: entry.title,
              description: entry.description,
              estimatedDuration: entry.estimatedDuration
            })
          })
        }

        if (Array.isArray(lesson.outline) && lesson.outline.length) {
          // Preferred: nested outline structure with categories
          await collectOutline(lesson.outline)
        } else if (Array.isArray(lesson.items) && lesson.items.length) {
          await collectItems(lesson.items)
        } else {
          await collectLegacy('lectures', 'lectures', '/lectures')
          await collectLegacy('tutorials', 'tutorials', '/tutorials')
          await collectLegacy('exercises', 'exercises', '/exercises')
          await collectLegacy('articles', 'articles', '/articles')
          await collectLegacy('projects', 'projects', '/projects')
          // resources is file list; skip for now or treat as resources without fetch
        }

        lessonBundles.push({
          title: lesson.title,
          slug: lesson.slug,
          order: lesson.order,
          description: lesson.description,
          estimatedDuration: lesson.estimatedDuration,
          learningObjectives: lesson.learningObjectives,
          items
        })
      }

      lessons.value = lessonBundles
    } catch (e: any) {
      console.error('Failed to load specialization bundle', e)
      error.value = e?.message || 'Failed to load specialization bundle'
    } finally {
      loading.value = false
    }
  }

  watch(slug, () => {
    lessons.value = []
    specialization.value = null
    load()
  }, { immediate: true })

  return {
    specialization: computed(() => specialization.value),
    lessons: computed(() => lessons.value),
    loading,
    error,
    refresh: load
  }
}
