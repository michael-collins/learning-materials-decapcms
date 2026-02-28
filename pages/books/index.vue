<script setup>
import { BookOpen, Download } from 'lucide-vue-next'
import Button from '~/components/ui/button/Button.vue'
import { useBookExport } from '~/composables/useBookExport'

definePageMeta({
  layout: 'docs'
})

useHead({
  title: 'Books - Learning Materials'
})

const { data: rawBooks, pending } = await useAsyncData('books', () =>
  queryCollection('books').all()
)

const books = computed(() => {
  if (!rawBooks.value) return []
  return [...rawBooks.value].sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0
    const dateB = b.date ? new Date(b.date).getTime() : 0
    return dateB - dateA
  })
})

// Export
const { exportBook, exporting, progress } = useBookExport()

// Extract slug from path
function bookSlug(book) {
  const parts = book.path?.split('/').filter(Boolean) || []
  // Path is /books/{slug}
  return parts[1] || ''
}

function chapterCount(book) {
  if (!book.outline) return 0
  let count = 0
  function walk(nodes) {
    for (const n of nodes) {
      if (n.content) count++
      if (n.items) walk(n.items)
    }
  }
  walk(book.outline)
  return count
}

function handleExport(e, book) {
  e.preventDefault()
  e.stopPropagation()
  exportBook(bookSlug(book))
}
</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-4xl">
    <div class="mb-8">
      <h1 class="text-4xl font-bold mb-4">Books</h1>
      <p class="text-lg text-muted-foreground">
        Published books and open educational textbooks built from curated learning materials.
      </p>
    </div>

    <!-- Loading state -->
    <div v-if="pending" class="flex justify-center items-center min-h-75">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>

    <!-- Books grid -->
    <div v-else-if="books.length" class="grid gap-6 md:grid-cols-2">
      <div
        v-for="book in books"
        :key="book.path"
        class="group rounded-lg border bg-card hover:bg-muted/50 transition-all duration-200 hover:shadow-md overflow-hidden relative"
      >
        <NuxtLink :to="`/books/${bookSlug(book)}`" class="block">
          <!-- Cover image -->
          <div v-if="book.coverImage" class="aspect-video overflow-hidden bg-muted">
            <img
              :src="book.coverImage"
              :alt="book.coverImageAlt || book.title"
              class="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div v-else class="aspect-video bg-linear-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            <BookOpen class="h-12 w-12 text-primary/30" />
          </div>

          <div class="p-5">
            <h2 class="text-lg font-semibold group-hover:text-primary transition-colors mb-1">
              {{ book.title }}
            </h2>
            <p v-if="book.description" class="text-sm text-muted-foreground line-clamp-2 mb-3">
              {{ book.description }}
            </p>

            <div class="flex items-center gap-3 text-xs text-muted-foreground">
              <span v-if="book.author">{{ book.author }}</span>
              <span v-if="book.author && chapterCount(book)" class="text-border">·</span>
              <span v-if="chapterCount(book)">{{ chapterCount(book) }} chapters</span>
              <span v-if="book.license" class="ml-auto text-muted-foreground/60">{{ book.license }}</span>
            </div>
          </div>
        </NuxtLink>

        <!-- Download button -->
        <div class="absolute top-2 right-2">
          <Button
            variant="secondary"
            size="icon"
            class="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
            :disabled="exporting"
            @click="handleExport($event, book)"
            :aria-label="`Download ${book.title} as ZIP`"
          >
            <Download class="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="border border-border rounded-lg p-8 bg-muted/50">
      <div class="flex flex-col items-center justify-center space-y-4 text-center">
        <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <BookOpen class="w-8 h-8 text-primary" />
        </div>
        <div class="space-y-2">
          <h2 class="text-xl font-semibold">No books yet</h2>
          <p class="text-muted-foreground max-w-md">
            Books are published collections of learning materials organized as structured textbooks.
            Create a book in the CMS to get started.
          </p>
        </div>
      </div>
    </div>

    <!-- Export progress toast -->
    <Transition
      enter-active-class="transition-all duration-200"
      enter-from-class="translate-y-4 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition-all duration-200"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-4 opacity-0"
    >
      <div
        v-if="progress"
        class="fixed bottom-6 right-6 z-50 rounded-lg border bg-card px-4 py-3 shadow-lg text-sm flex items-center gap-3"
      >
        <div v-if="exporting" class="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
        {{ progress }}
      </div>
    </Transition>
  </div>
</template>
