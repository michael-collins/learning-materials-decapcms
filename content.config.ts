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
      })
    })
  }
})
