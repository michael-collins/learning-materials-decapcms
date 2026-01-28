/**
 * usePathways - Composable for pathway queries and operations
 */

export function usePathways() {
  /**
   * Get a single pathway with all related data
   */
  const getPathway = async (slug: string) => {
    try {
      const pathway = await queryContent('pathways')
        .where({ slug, published: true })
        .findOne()

      if (!pathway) {
        throw new Error(`Pathway ${slug} not found`)
      }

      // Fetch related specializations in order
      if (pathway.specializations && pathway.specializations.length > 0) {
        const specSlugs = pathway.specializations.map((s: any) =>
          typeof s === 'string' ? s : s.slug
        )

        pathway.specializationsData = await queryContent('specializations')
          .where({
            slug: { $in: specSlugs },
            published: true
          })
          .sort({ order: 1 })
          .find()

        // Sort by the order in pathway.specializations
        if (Array.isArray(pathway.specializationsData)) {
          pathway.specializationsData.sort((a: any, b: any) => {
            const indexA = specSlugs.indexOf(a.slug)
            const indexB = specSlugs.indexOf(b.slug)
            return indexA - indexB
          })
        }
      }

      return pathway
    } catch (error) {
      console.error('Error fetching pathway:', error)
      throw error
    }
  }

  /**
   * Get pathway with progress calculation
   */
  const getPathwayWithProgress = async (slug: string, userId?: string) => {
    const pathway = await getPathway(slug)

    // If user tracking is enabled, calculate progress
    if (userId) {
      // TODO: Implement progress calculation when user tracking is added
      // pathway.progress = await calculatePathwayProgress(pathway, userId)
    }

    return pathway
  }

  /**
   * List all pathways with optional filtering
   */
  const listPathways = async (filters?: {
    difficulty?: string
    tags?: string[]
    search?: string
    published?: boolean
  }) => {
    try {
      let query = queryContent('pathways')

      // Filter by published status
      if (filters?.published !== undefined) {
        query = query.where({ published: filters.published })
      } else {
        query = query.where({ published: true })
      }

      // Filter by difficulty
      if (filters?.difficulty) {
        query = query.where({ difficulty: filters.difficulty })
      }

      // Filter by tags
      if (filters?.tags && filters.tags.length > 0) {
        query = query.where({
          tags: { $containsAny: filters.tags }
        })
      }

      // Search in title and description
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase()
        query = query.where({
          $or: [
            { title: { $contains: filters.search } },
            { description: { $contains: filters.search } }
          ]
        })
      }

      const pathways = await query.find()

      return Array.isArray(pathways) ? pathways : []
    } catch (error) {
      console.error('Error listing pathways:', error)
      return []
    }
  }

  /**
   * Get statistics about pathways
   */
  const getPathwayStats = async () => {
    try {
      const pathways = await queryContent('pathways')
        .where({ published: true })
        .find()

      let totalSpecializations = 0
      let totalLessons = 0
      const difficulties = { Beginner: 0, Intermediate: 0, Advanced: 0 }

      for (const pathway of pathways) {
        if (pathway.specializations) {
          totalSpecializations += pathway.specializations.length
        }

        if (pathway.difficulty && difficulties[pathway.difficulty as keyof typeof difficulties] !== undefined) {
          difficulties[pathway.difficulty as keyof typeof difficulties]++
        }
      }

      return {
        totalPathways: pathways.length,
        totalSpecializations,
        totalLessons,
        byDifficulty: difficulties
      }
    } catch (error) {
      console.error('Error getting pathway stats:', error)
      return {
        totalPathways: 0,
        totalSpecializations: 0,
        totalLessons: 0,
        byDifficulty: { Beginner: 0, Intermediate: 0, Advanced: 0 }
      }
    }
  }

  return {
    getPathway,
    getPathwayWithProgress,
    listPathways,
    getPathwayStats
  }
}
