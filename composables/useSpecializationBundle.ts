import { ref, computed, watch } from 'vue'

interface LessonContent {
  type: string
  slug: string
  title: string
  description?: string
  estimatedDuration?: string
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

      // Fetch lessons for specialization
      const allLessons = await queryCollection('lessons').all()
      const filtered = allLessons
        .filter((lesson: any) => lesson.specialization === slug.value)
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))

      // Fetch linked content for each lesson
      const lessonBundles: LessonBundle[] = []
      for (const lesson of filtered) {
        const items: LessonContent[] = []

        const collect = async (field: string, type: string, basePath: string) => {
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

        await collect('lectures', 'lectures', '/lectures')
        await collect('tutorials', 'tutorials', '/tutorials')
        await collect('exercises', 'exercises', '/exercises')
        await collect('articles', 'articles', '/articles')
        await collect('projects', 'projects', '/projects')
        // resources is file list; skip for now or treat as resources without fetch

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
