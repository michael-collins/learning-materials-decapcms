import { defineContentConfig, defineCollection, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    articles: defineCollection({
      type: 'page',
      source: 'articles/**/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        author: z.string().optional(),
        date: z.string().optional(),
        license: z.string().optional(),
        allowEmbed: z.boolean().optional(),
        attachments: z.array(z.object({
          file: z.string().optional(),
          url: z.string().optional(),
          title: z.string(),
          description: z.string().optional(),
        })).optional(),
      })
    }),
    tutorials: defineCollection({
      type: 'page',
      source: 'tutorials/**/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        author: z.string().optional(),
        date: z.string().optional(),
        license: z.string().optional(),
        allowEmbed: z.boolean().optional(),
        attachments: z.array(z.object({
          file: z.string().optional(),
          url: z.string().optional(),
          title: z.string(),
          description: z.string().optional(),
        })).optional(),
      })
    }),
    exercises: defineCollection({
      type: 'page',
      source: 'exercises/**/*.md',
      schema: z.object({
        recordId: z.string().optional(),
        title: z.string(),
        slug: z.string().optional(),
        type: z.string().optional(),
        difficulty: z.string().optional(),
        youtubePlaylistID: z.string().optional(),
        image: z.string().optional(),
        imageAlt: z.string().optional(),
        license: z.string().optional(),
        aiLicense: z.union([z.string(), z.array(z.string())]).optional(),
        rubric: z.string().optional(),
        tags: z.array(z.string()).optional(),
        author: z.string().optional(),
        authorUrl: z.string().optional(),
        published: z.boolean().optional(),
        allowEmbed: z.boolean().optional(),
        attachments: z.array(z.object({
          file: z.string().optional(),
          url: z.string().optional(),
          title: z.string(),
          description: z.string().optional(),
          alt: z.string().optional(),
          citation: z.string().optional(),
          sourceUrl: z.string().optional(),
          type: z.string().optional(),
        })).optional(),
      })
    }),
    projects: defineCollection({
      type: 'page',
      source: 'projects/**/*.md',
      schema: z.object({
        recordId: z.string().optional(),
        title: z.string(),
        slug: z.string().optional(),
        type: z.string().optional(),
        difficulty: z.string().optional(),
        youtubePlaylistID: z.string().optional(),
        image: z.string().optional(),
        imageAlt: z.string().optional(),
        license: z.string().optional(),
        aiLicense: z.union([z.string(), z.array(z.string())]).optional(),
        rubric: z.string().optional(),
        tags: z.array(z.string()).optional(),
        author: z.string().optional(),
        authorUrl: z.string().optional(),
        published: z.boolean().optional(),
        allowEmbed: z.boolean().optional(),
        attachments: z.array(z.object({
          file: z.string().optional(),
          url: z.string().optional(),
          title: z.string(),
          description: z.string().optional(),
          alt: z.string().optional(),
          citation: z.string().optional(),
          sourceUrl: z.string().optional(),
          type: z.string().optional(),
        })).optional(),
      })
    }),
    specializations: defineCollection({
      type: 'page',
      source: 'specializations/**/*.md',
      schema: z.object({
        recordId: z.string().optional(),
        title: z.string(),
        slug: z.string().optional(),
        type: z.string().optional(),
        whoItsFor: z.string().optional(),
        targetRole: z.string().optional(),
        image: z.string().optional(),
        imageAlt: z.string().optional(),
        published: z.boolean().optional(),
        oer: z.any().optional(),
      })
    }),
    pathways: defineCollection({
      type: 'page',
      source: 'pathways/**/*.md',
      schema: z.object({
        recordId: z.string().optional(),
        title: z.string(),
        slug: z.string().optional(),
        type: z.string().optional(),
        description: z.string().optional(),
        image: z.string().optional(),
        imageAlt: z.string().optional(),
        published: z.boolean().optional(),
        oer: z.any().optional(),
      })
    }),
    lectures: defineCollection({
      type: 'page',
      source: 'lectures/**/*.md',
      schema: z.object({
        recordId: z.string().optional(),
        title: z.string(),
        slug: z.string().optional(),
        type: z.string().optional(),
        googleSlidesID: z.string().optional(),
        topics: z.string().optional(),
        author: z.string().optional(),
        license: z.string().optional(),
        aiLicense: z.union([z.string(), z.array(z.string())]).optional(),
        allowEmbed: z.boolean().optional(),
        image: z.string().optional(),
        imageAlt: z.string().optional(),
        tags: z.array(z.string()).optional(),
        published: z.boolean().optional(),
        attachments: z.array(z.object({
          file: z.string().optional(),
          url: z.string().optional(),
          title: z.string(),
          description: z.string().optional(),
        })).optional(),
        oer: z.any().optional(),
      })
    }),
    docs: defineCollection({
      type: 'page',
      source: 'docs/**/*.md',
      schema: z.object({
        title: z.string(),
        slug: z.string().optional(),
        document: z.string().optional(),
        published: z.boolean().optional(),
      })
    }),
    rubrics: defineCollection({
      type: 'page',
      source: 'rubrics/**/*.md',
      schema: z.object({
        recordId: z.string().optional(),
        name: z.string(),
        slug: z.string(),
        description: z.string().optional(),
        criteria: z.array(z.object({
          id: z.string().optional(),
          name: z.string(),
          description: z.string().optional(),
        })).optional(),
      })
    })
  }
})
