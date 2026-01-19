<script setup lang="ts">
import Breadcrumb from '~/components/ui/breadcrumb/Breadcrumb.vue'
import BreadcrumbItem from '~/components/ui/breadcrumb/BreadcrumbItem.vue'
import BreadcrumbLink from '~/components/ui/breadcrumb/BreadcrumbLink.vue'
import BreadcrumbSeparator from '~/components/ui/breadcrumb/BreadcrumbSeparator.vue'

interface BreadcrumbSegment {
  label: string
  path?: string
}

interface Props {
  breadcrumbs: BreadcrumbSegment[]
  title: string
  description?: string
  date?: string
  author?: string
  difficulty?: string
}

const props = defineProps<Props>()

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<template>
  <div class="container max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
    

    <article>
      <header class="mb-8 pb-8 border-b">
        <h1 class="text-4xl font-bold tracking-tight mb-4">{{ title }}</h1>
        
        <div class="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div v-if="date" class="flex items-center gap-2">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <time>{{ formatDate(date) }}</time>
          </div>
          <div v-if="author" class="flex items-center gap-2">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>{{ author }}</span>
          </div>
          <div v-if="difficulty">
            <span class="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary">
              {{ difficulty }}
            </span>
          </div>
        </div>

        <p v-if="description" class="mt-4 text-lg text-muted-foreground leading-relaxed">
          {{ description }}
        </p>
      </header>

      <div class="prose dark:prose-invert max-w-none prose-headings:text-foreground prose-headings:font-bold prose-headings:tracking-tight prose-h2:text-3xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-foreground prose-p:text-base prose-p:leading-7 prose-li:text-foreground prose-li:text-base prose-code:text-foreground prose-code:text-sm prose-code:bg-muted/50 dark:prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:border prose-code:border-border/50 prose-pre:bg-muted dark:prose-pre:bg-[#0a0a0a] prose-pre:text-foreground prose-pre:border prose-pre:border-border/50 prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-blockquote:text-foreground prose-blockquote:border-l-primary">
        <slot />
      </div>
    </article>
  </div>
</template>
