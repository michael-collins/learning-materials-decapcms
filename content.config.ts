import { defineContentConfig, defineCollection, z } from '@nuxt/content'

// Fixed-depth outline node schema for book table of contents.
// Nuxt Content doesn't support z.lazy() recursive schemas, so we
// unroll to 4 levels deep (leaf → L3 → L2 → L1), which is sufficient
// for most book structures (Part > Chapter > Section > Subsection).
const outlineLeaf = z.object({
  title: z.string(),
  path: z.string().optional(),
  content: z.string().optional(),
  version: z.string().optional(),
  icon: z.string().optional(),
  imported: z.boolean().optional(),
  locked: z.boolean().optional(),
  importChildren: z.boolean().optional(),
})

const outlineL3 = outlineLeaf.extend({
  items: z.array(outlineLeaf).optional(),
})

const outlineL2 = outlineLeaf.extend({
  items: z.array(outlineL3).optional(),
})

const outlineNodeSchema = outlineLeaf.extend({
  items: z.array(outlineL2).optional(),
})

// Shared author entry schema
const authorEntrySchema = z.object({
  name: z.string(),
  url: z.string().optional(),
})

export default defineContentConfig({
  collections: {
    articles: defineCollection({
      type: 'page',
      source: 'articles/**/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        // Multi-author support (preferred)
        authors: z.array(authorEntrySchema).optional(),
        // Legacy single-author fields (kept for backward compat)
        author: z.string().optional(),
        authorUrl: z.string().optional(),
        date: z.string().optional(),
        license: z.string().optional(),
        course: z.string().optional(),
        allowEmbed: z.boolean().optional(),
        prerequisites: z.array(z.any()).optional(),
        // Version control fields
        version: z.string().optional(),
        versionStatus: z.enum(['latest', 'archived', 'deprecated']).optional(),
        publishEmbed: z.boolean().optional(),
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
        // Multi-author support (preferred)
        authors: z.array(authorEntrySchema).optional(),
        // Legacy single-author fields (kept for backward compat)
        author: z.string().optional(),
        authorUrl: z.string().optional(),
        date: z.string().optional(),
        license: z.string().optional(),
        course: z.string().optional(),
        allowEmbed: z.boolean().optional(),
        prerequisites: z.array(z.any()).optional(),
        // Version control fields
        version: z.string().optional(),
        versionStatus: z.enum(['latest', 'archived', 'deprecated']).optional(),
        publishEmbed: z.boolean().optional(),
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
        title: z.string(),
        date: z.string().optional(),
        difficulty: z.string().optional(),
        image: z.string().optional(),
        imageAlt: z.string().optional(),
        license: z.string().optional(),
        course: z.string().optional(),
        // Multi-author support (preferred)
        authors: z.array(authorEntrySchema).optional(),
        // Legacy single-author fields (kept for backward compat)
        author: z.string().optional(),
        authorUrl: z.string().optional(),
        aiLicense: z.union([z.string(), z.array(z.string())]).optional(),
        tags: z.array(z.string()).optional(),
        published: z.boolean().optional(),
        allowEmbed: z.boolean().optional(),
        prerequisites: z.array(z.any()).optional(),
        // Version control fields
        version: z.string().optional(),
        versionStatus: z.enum(['latest', 'archived', 'deprecated']).optional(),
        publishEmbed: z.boolean().optional(),
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
        // Legacy/override fields (optional, auto-generated if not provided)
        slug: z.string().optional(),
        recordId: z.string().optional(),
        type: z.string().optional(),
        rubric: z.string().optional(),
        lesson: z.string().optional(),
        specialization: z.string().optional(),
      })
    }),
    projects: defineCollection({
      type: 'page',
      source: 'projects/**/*.md',
      schema: z.object({
        title: z.string(),
        date: z.string().optional(),
        difficulty: z.string().optional(),
        image: z.string().optional(),
        imageAlt: z.string().optional(),
        license: z.string().optional(),
        course: z.string().optional(),
        // Multi-author support (preferred)
        authors: z.array(authorEntrySchema).optional(),
        // Legacy single-author fields (kept for backward compat)
        author: z.string().optional(),
        authorUrl: z.string().optional(),
        aiLicense: z.union([z.string(), z.array(z.string())]).optional(),
        tags: z.array(z.string()).optional(),
        published: z.boolean().optional(),
        allowEmbed: z.boolean().optional(),
        prerequisites: z.array(z.any()).optional(),
        // Version control fields
        version: z.string().optional(),
        versionStatus: z.enum(['latest', 'archived', 'deprecated']).optional(),
        publishEmbed: z.boolean().optional(),
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
        // Legacy/override fields (optional, auto-generated if not provided)
        slug: z.string().optional(),
        recordId: z.string().optional(),
        type: z.string().optional(),
        rubric: z.string().optional(),
        lesson: z.string().optional(),
        specialization: z.string().optional(),
        youtubePlaylistID: z.string().optional(),
      })
    }),
    specializations: defineCollection({
      type: 'page',
      source: 'specializations/*/index.md',
      schema: z.object({
        recordId: z.string().optional(),
        title: z.string(),
        date: z.string().optional(),
        slug: z.string().optional(),
        type: z.string().optional(),
        whoItsFor: z.string().optional(),
        targetRole: z.string().optional(),
        image: z.string().optional(),
        imageAlt: z.string().optional(),
        author: z.string().optional(),
        authorUrl: z.string().optional(),
        license: z.string().optional(),
        aiLicense: z.union([z.string(), z.array(z.string())]).optional(),
        published: z.boolean().optional(),
        oer: z.any().optional(),
        lessons: z.array(z.string()).optional(),
      })
    }),
    pathways: defineCollection({
      type: 'page',
      source: 'pathways/*/index.md',
      schema: z.object({
        recordId: z.string().optional(),
        title: z.string(),
        date: z.string().optional(),
        slug: z.string().optional(),
        type: z.string().optional(),
        description: z.string().optional(),
        difficulty: z.string().optional(),
        estimatedDuration: z.string().optional(),
        specializations: z.array(z.string()).optional(),
        learningObjectives: z.array(z.string()).optional(),
        prerequisites: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        image: z.string().optional(),
        imageAlt: z.string().optional(),
        author: z.string().optional(),
        authorUrl: z.string().optional(),
        license: z.string().optional(),
        aiLicense: z.union([z.string(), z.array(z.string())]).optional(),
        published: z.boolean().optional(),
        oer: z.any().optional(),
      })
    }),
    lectures: defineCollection({
      type: 'page',
      source: 'lectures/*/index.md',
      schema: z.object({
        title: z.string(),
        date: z.string().optional(),
        course: z.string().optional(),
        author: z.string().optional(),
        authorUrl: z.string().optional(),
        license: z.string().optional(),
        aiLicense: z.union([z.string(), z.array(z.string())]).optional(),
        allowEmbed: z.boolean().optional(),
        image: z.string().optional(),
        imageAlt: z.string().optional(),
        tags: z.array(z.string()).optional(),
        published: z.boolean().optional(),
        prerequisites: z.array(z.any()).optional(),
        // Version control fields
        version: z.string().optional(),
        versionStatus: z.enum(['latest', 'archived', 'deprecated']).optional(),
        publishEmbed: z.boolean().optional(),
        attachments: z.array(z.object({
          file: z.string().optional(),
          url: z.string().optional(),
          name: z.string(),
          description: z.string().optional(),
        })).optional(),
        // Legacy/override fields (optional, auto-generated if not provided)
        slug: z.string().optional(),
        recordId: z.string().optional(),
        type: z.string().optional(),
        googleSlidesID: z.string().optional(),
        topics: z.union([z.string(), z.array(z.string())]).optional(),
        lesson: z.string().optional(),
        specialization: z.string().optional(),
      })
    }),
    lessons: defineCollection({
      type: 'page',
      source: 'lessons/*/index.md',
      schema: z.object({
        title: z.string(),
        date: z.string().optional(),
        slug: z.string().optional(),
        type: z.string().optional(),
        description: z.string().optional(),
        estimatedDuration: z.string().optional(),
        specialization: z.string().optional(),
        order: z.number().optional(),
        learningObjectives: z.array(z.string()).optional(),
        lectures: z.array(z.string()).optional(),
        tutorials: z.array(z.string()).optional(),
        exercises: z.array(z.string()).optional(),
        articles: z.array(z.string()).optional(),
        resources: z.array(z.string()).optional(),
        projects: z.array(z.string()).optional(),
        items: z.array(z.any()).optional(),
        // Outline-based content structure (preferred, replaces flat arrays)
        outline: z.array(outlineNodeSchema).optional(),
        prerequisites: z.array(z.any()).optional(),
        published: z.boolean().optional(),
        allowEmbed: z.boolean().optional(),
        author: z.string().optional(),
        authorUrl: z.string().optional(),
        license: z.string().optional(),
        aiLicense: z.union([z.string(), z.array(z.string())]).optional(),
        image: z.string().optional(),
        imageAlt: z.string().optional(),
        tags: z.array(z.string()).optional(),
        // Version control fields
        version: z.string().optional(),
        versionStatus: z.enum(['latest', 'archived', 'deprecated']).optional(),
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
    }),
    books: defineCollection({
      type: 'page',
      source: 'books/*/index.md',
      schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        // Multi-author support (preferred)
        authors: z.array(authorEntrySchema).optional(),
        // Legacy single-author fields (kept for backward compat)
        author: z.string().optional(),
        authorUrl: z.string().optional(),
        date: z.string().optional(),
        license: z.string().optional(),
        course: z.string().optional(),
        coverImage: z.string().optional(),
        coverImageAlt: z.string().optional(),
        published: z.boolean().optional(),
        theme: z.enum(['default', 'lambda', 'minimal']).optional(),
        tags: z.array(z.string()).optional(),
        introductionTitle: z.string().optional(),
        // Per-book color overrides — short var names (without --color-) mapped to oklch values
        themeOverrides: z.object({
          light: z.record(z.string(), z.string()).optional(),
          dark: z.record(z.string(), z.string()).optional(),
        }).optional(),
        // Book outline — hierarchical tree of chapters/sections
        outline: z.array(outlineNodeSchema).optional(),
      })
    })
  }
})
