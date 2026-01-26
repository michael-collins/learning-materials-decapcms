/**
 * useLessons - Composable for lesson queries and operations
 */

export function useLessons() {
  /**
   * Get a single lesson with all related content
   */
  const getLesson = async (slug: string) => {
    try {
      const lesson = await queryContent('lessons')
        .where({ slug, published: true })
        .findOne()

      if (!lesson) {
        throw new Error(`Lesson ${slug} not found`)
      }

      // Fetch parent specialization
      if (lesson.specialization) {
        lesson.specializationData = await queryContent('specializations')
          .where({ slug: lesson.specialization, published: true })
          .findOne()

        // Fetch grandparent pathway
        if (lesson.specializationData?.pathway) {
          lesson.pathwayData = await queryContent('pathways')
            .where({ slug: lesson.specializationData.pathway, published: true })
            .findOne()
        }
      }

      // Fetch all related content
      const contentPromises = []

      // Lectures
      if (lesson.lectures && lesson.lectures.length > 0) {
        contentPromises.push(
          queryContent('lectures')
            .where({
              slug: { $in: lesson.lectures },
              published: true
            })
            .find()
            .then(items => ({ type: 'lectures', items: Array.isArray(items) ? items : [] }))
        )
      } else {
        contentPromises.push(Promise.resolve({ type: 'lectures', items: [] }))
      }

      // Exercises
      if (lesson.exercises && lesson.exercises.length > 0) {
        contentPromises.push(
          queryContent('exercises')
            .where({
              slug: { $in: lesson.exercises },
              published: true
            })
            .find()
            .then(items => ({ type: 'exercises', items: Array.isArray(items) ? items : [] }))
        )
      } else {
        contentPromises.push(Promise.resolve({ type: 'exercises', items: [] }))
      }

      // Projects
      if (lesson.projects && lesson.projects.length > 0) {
        contentPromises.push(
          queryContent('projects')
            .where({
              slug: { $in: lesson.projects },
              published: true
            })
            .find()
            .then(items => ({ type: 'projects', items: Array.isArray(items) ? items : [] }))
        )
      } else {
        contentPromises.push(Promise.resolve({ type: 'projects', items: [] }))
      }

      const contentResults = await Promise.all(contentPromises)

      // Organize content by type
      lesson.content = {
        lectures: contentResults.find(r => r.type === 'lectures')?.items || [],
        exercises: contentResults.find(r => r.type === 'exercises')?.items || [],
        projects: contentResults.find(r => r.type === 'projects')?.items || []
      }

      return lesson
    } catch (error) {
      console.error('Error fetching lesson:', error)
      throw error
    }
  }

  /**
   * List lessons with optional filtering
   */
  const listLessons = async (filters?: {
    specialization?: string
    search?: string
    published?: boolean
  }) => {
    try {
      let query = queryContent('lessons')

      // Filter by published status
      if (filters?.published !== undefined) {
        query = query.where({ published: filters.published })
      } else {
        query = query.where({ published: true })
      }

      // Filter by specialization
      if (filters?.specialization) {
        query = query.where({ specialization: filters.specialization })
      }

      // Search in title and description
      if (filters?.search) {
        query = query.where({
          $or: [
            { title: { $contains: filters.search } },
            { description: { $contains: filters.search } }
          ]
        })
      }

      const lessons = await query.sort({ order: 1 }).find()

      return Array.isArray(lessons) ? lessons : []
    } catch (error) {
      console.error('Error listing lessons:', error)
      return []
    }
  }

  /**
   * Get previous and next lessons in a specialization
   */
  const getAdjacentLessons = async (currentSlug: string, specializationSlug: string) => {
    try {
      const lessons = await queryContent('lessons')
        .where({
          specialization: specializationSlug,
          published: true
        })
        .sort({ order: 1 })
        .find()

      if (!Array.isArray(lessons)) {
        return { previous: null, next: null }
      }

      const currentIndex = lessons.findIndex(l => l.slug === currentSlug)

      if (currentIndex === -1) {
        return { previous: null, next: null }
      }

      return {
        previous: currentIndex > 0 ? lessons[currentIndex - 1] : null,
        next: currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null
      }
    } catch (error) {
      console.error('Error getting adjacent lessons:', error)
      return { previous: null, next: null }
    }
  }

  /**
   * Get all lessons for a specialization grouped by content type count
   */
  const getLessonsSummary = async (specializationSlug: string) => {
    try {
      const lessons = await queryContent('lessons')
        .where({
          specialization: specializationSlug,
          published: true
        })
        .sort({ order: 1 })
        .find()

      if (!Array.isArray(lessons)) {
        return []
      }

      return lessons.map(lesson => ({
        ...lesson,
        contentCounts: {
          lectures: lesson.lectures?.length || 0,
          exercises: lesson.exercises?.length || 0,
          projects: lesson.projects?.length || 0
        }
      }))
    } catch (error) {
      console.error('Error getting lessons summary:', error)
      return []
    }
  }

  return {
    getLesson,
    listLessons,
    getAdjacentLessons,
    getLessonsSummary
  }
}
