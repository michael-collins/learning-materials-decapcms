/**
 * useSpecializations - Composable for specialization queries and operations
 */

export function useSpecializations() {
  /**
   * Get a single specialization with all related data
   */
  const getSpecialization = async (slug: string) => {
    try {
      const specialization = await queryContent('specializations')
        .where({ slug, published: true })
        .findOne()

      if (!specialization) {
        throw new Error(`Specialization ${slug} not found`)
      }

      // Fetch parent pathway
      if (specialization.pathway) {
        specialization.pathwayData = await queryContent('pathways')
          .where({ slug: specialization.pathway, published: true })
          .findOne()
      }

      // Fetch related lessons in order
      if (specialization.lessons && specialization.lessons.length > 0) {
        const lessonSlugs = specialization.lessons.map((l: any) =>
          typeof l === 'string' ? l : l.slug
        )

        specialization.lessonsData = await queryContent('lessons')
          .where({
            slug: { $in: lessonSlugs },
            published: true
          })
          .sort({ order: 1 })
          .find()

        // Sort by the order in specialization.lessons
        if (Array.isArray(specialization.lessonsData)) {
          specialization.lessonsData.sort((a: any, b: any) => {
            const indexA = lessonSlugs.indexOf(a.slug)
            const indexB = lessonSlugs.indexOf(b.slug)
            return indexA - indexB
          })
        }
      }

      return specialization
    } catch (error) {
      console.error('Error fetching specialization:', error)
      throw error
    }
  }

  /**
   * List specializations with optional filtering
   */
  const listSpecializations = async (filters?: {
    pathway?: string
    difficulty?: string
    targetRole?: string
    search?: string
    published?: boolean
  }) => {
    try {
      let query = queryContent('specializations')

      // Filter by published status
      if (filters?.published !== undefined) {
        query = query.where({ published: filters.published })
      } else {
        query = query.where({ published: true })
      }

      // Filter by pathway
      if (filters?.pathway) {
        query = query.where({ pathway: filters.pathway })
      }

      // Filter by difficulty
      if (filters?.difficulty) {
        query = query.where({ difficulty: filters.difficulty })
      }

      // Filter by target role
      if (filters?.targetRole) {
        query = query.where({ targetRole: filters.targetRole })
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

      const specializations = await query.find()

      return Array.isArray(specializations) ? specializations : []
    } catch (error) {
      console.error('Error listing specializations:', error)
      return []
    }
  }

  /**
   * Get specializations grouped by pathway
   */
  const getSpecializationsByPathway = async () => {
    try {
      const specializations = await queryContent('specializations')
        .where({ published: true })
        .find()

      const grouped: Record<string, any[]> = {}

      for (const spec of specializations) {
        const pathwaySlug = spec.pathway || 'uncategorized'

        if (!grouped[pathwaySlug]) {
          grouped[pathwaySlug] = []
        }

        grouped[pathwaySlug].push(spec)
      }

      return grouped
    } catch (error) {
      console.error('Error grouping specializations:', error)
      return {}
    }
  }

  /**
   * Get all available target roles
   */
  const getTargetRoles = async () => {
    try {
      const specializations = await queryContent('specializations')
        .where({ published: true })
        .find()

      const roles = new Set<string>()

      for (const spec of specializations) {
        if (spec.targetRole) {
          roles.add(spec.targetRole)
        }
      }

      return Array.from(roles).sort()
    } catch (error) {
      console.error('Error getting target roles:', error)
      return []
    }
  }

  return {
    getSpecialization,
    listSpecializations,
    getSpecializationsByPathway,
    getTargetRoles
  }
}
