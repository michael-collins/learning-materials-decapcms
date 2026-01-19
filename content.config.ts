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
        attachments: z.array(z.object({
          file: z.string(),
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
        attachments: z.array(z.object({
          file: z.string(),
          title: z.string(),
          description: z.string().optional(),
        })).optional(),
      })
    })
  }
})
