<script setup lang="ts">
/**
 * ContentPreview — Live preview of content as it will appear on the published page.
 * Shows rendered frontmatter metadata + markdown body in a card layout.
 */
import { Calendar, Tag, BookOpen, Shield, FileText } from 'lucide-vue-next'

const props = defineProps<{
  /** Reactive frontmatter data */
  frontmatter: Record<string, any>
  /** Raw markdown body content */
  body: string
  /** Collection name for context */
  collection?: string
}>()

// Simple markdown-to-HTML renderer (basic subset for preview)
const renderedBody = computed(() => {
  if (!props.body) return '<p class="text-muted-foreground italic">No content yet...</p>'

  let html = props.body
    // Code blocks (fenced)
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    // Headers
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-md max-w-full" />')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr />')
    // Paragraphs (remaining lines)
    .replace(/\n\n/g, '</p><p>')

  // Wrap in paragraph if not already block-level
  if (!html.startsWith('<')) {
    html = `<p>${html}</p>`
  }

  return html
})

const formattedDate = computed(() => {
  const d = props.frontmatter.date
  if (!d) return null
  try {
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return d
  }
})

const tags = computed(() => {
  const t = props.frontmatter.tags
  if (Array.isArray(t)) return t
  return []
})
</script>

<template>
  <div class="h-full overflow-auto">
    <div class="mx-auto max-w-2xl p-6">
      <!-- Page Header -->
      <article>
        <!-- Category / Collection badge -->
        <div v-if="collection" class="mb-3">
          <span class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <BookOpen class="h-3 w-3" />
            {{ collection }}
          </span>
        </div>

        <!-- Title -->
        <h1 class="text-3xl font-bold tracking-tight">
          {{ frontmatter.title || 'Untitled' }}
        </h1>

        <!-- Description -->
        <p v-if="frontmatter.description" class="mt-3 text-lg text-muted-foreground">
          {{ frontmatter.description }}
        </p>

        <!-- Meta row -->
        <div class="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span v-if="formattedDate" class="flex items-center gap-1.5">
            <Calendar class="h-3.5 w-3.5" />
            {{ formattedDate }}
          </span>
          <span v-if="frontmatter.difficulty" class="flex items-center gap-1.5">
            <FileText class="h-3.5 w-3.5" />
            {{ frontmatter.difficulty }}
          </span>
          <span v-if="frontmatter.license" class="flex items-center gap-1.5">
            <Shield class="h-3.5 w-3.5" />
            {{ frontmatter.license }}
          </span>
          <span v-if="frontmatter.version" class="flex items-center gap-1.5 rounded bg-muted px-2 py-0.5 font-mono text-xs">
            v{{ frontmatter.version }}
          </span>
        </div>

        <!-- Tags -->
        <div v-if="tags.length > 0" class="mt-3 flex flex-wrap gap-1.5">
          <span
            v-for="tag in tags"
            :key="tag"
            class="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
          >
            <Tag class="h-3 w-3" />
            {{ tag }}
          </span>
        </div>

        <!-- Featured Image -->
        <div v-if="frontmatter.image" class="mt-6">
          <img
            :src="frontmatter.image"
            :alt="frontmatter.imageAlt || frontmatter.title"
            class="w-full rounded-lg border object-cover"
          />
        </div>

        <!-- Divider -->
        <hr class="my-6 border-border" />

        <!-- Body Content -->
        <div
          class="prose prose-sm dark:prose-invert max-w-none"
          v-html="renderedBody"
        />
      </article>
    </div>
  </div>
</template>
