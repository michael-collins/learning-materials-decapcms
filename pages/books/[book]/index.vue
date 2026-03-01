<script setup>
import { BookOpen } from 'lucide-vue-next'
import { flattenOutline, getNavigableChapters, buildSidebarTree } from '~/composables/useBookOutline'
import { useBookTheme } from '~/composables/useBookTheme'

const route = useRoute()
const bookSlug = route.params.book

definePageMeta({
  layout: false
})

const { data: book, pending } = await useAsyncData(`book-${bookSlug}`, () =>
  queryCollection('books').path(`/books/${bookSlug}`).first()
)

useHead({
  title: book.value ? book.value.title : 'Book'
})

// Provide book data to the layout via useState
const bookTitleState = useState('book-title', () => book.value?.title || '')
const bookIntroductionTitleState = useState('book-introduction-title', () => book.value?.introductionTitle || '')
const bookSlugState = useState('book-slug', () => bookSlug)
const bookThemeState = useState('book-theme', () => book.value?.theme || 'default')
const bookThemeOverridesState = useState('book-theme-overrides', () => book.value?.themeOverrides ?? null)
const sidebarTreeState = useState('book-sidebar-tree', () =>
  book.value?.outline ? buildSidebarTree(book.value.outline, '') : []
)
const prevState = useState('book-prev', () => null)
const nextState = useState('book-next', () => null)

watchEffect(() => {
  bookTitleState.value = book.value?.title || ''
  bookIntroductionTitleState.value = book.value?.introductionTitle || ''
  bookSlugState.value = bookSlug
  bookThemeState.value = book.value?.theme || 'default'
  bookThemeOverridesState.value = book.value?.themeOverrides ?? null
  sidebarTreeState.value = book.value?.outline
    ? buildSidebarTree(book.value.outline, '')
    : []
  prevState.value = null
  nextState.value = null
})

const flatChapters = computed(() => {
  if (!book.value?.outline) return []
  return getNavigableChapters(flattenOutline(book.value.outline))
})

const firstChapter = computed(() => flatChapters.value[0] || null)

function chapterCount() {
  return flatChapters.value.length
}

// Theme — reactive to both book.theme and light/dark mode
const bookThemeRef = computed(() => book.value?.theme || 'default')
const { config: themeConfig } = useBookTheme(bookThemeRef)
const proseClass = computed(() => themeConfig.value.content.proseClass)
const contentClass = computed(() => themeConfig.value.content.class)
</script>

<template>
  <NuxtLayout name="book">
    <div v-if="pending" class="container max-w-4xl mx-auto px-4 py-8">
      <div class="flex justify-center items-center min-h-100">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    </div>

    <div v-else-if="book" class="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Book header -->
      <div class="mb-8">
        <div v-if="book.coverImage" class="mb-6 rounded-lg overflow-hidden border bg-muted aspect-21/9">
          <img
            :src="book.coverImage"
            :alt="book.coverImageAlt || book.title"
            class="h-full w-full object-cover"
          />
        </div>

        <h1 class="text-4xl font-bold mb-3">{{ book.title }}</h1>

        <p v-if="book.description" class="text-lg text-muted-foreground mb-4">
          {{ book.description }}
        </p>

        <div class="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span v-if="book.author">By {{ book.author }}</span>
          <span v-if="book.license" class="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
            {{ book.license }}
          </span>
          <span v-if="chapterCount()" class="inline-flex items-center gap-1">
            <BookOpen class="h-3.5 w-3.5" />
            {{ chapterCount() }} chapters
          </span>
        </div>
      </div>

      <!-- Learning objectives -->
      <div v-if="book.learningObjectives?.length" class="mb-8 rounded-lg border p-5">
        <h2 class="text-lg font-semibold mb-3">Learning Objectives</h2>
        <ul class="space-y-2">
          <li
            v-for="(obj, i) in book.learningObjectives"
            :key="i"
            class="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <span class="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            {{ obj }}
          </li>
        </ul>
      </div>

      <!-- Book intro body content -->
      <div v-if="book.body" :class="[proseClass, 'max-w-none mb-8', contentClass]">
        <ContentRenderer :value="book" />
      </div>

      <!-- Start reading CTA -->
      <div v-if="firstChapter" class="flex justify-center">
        <NuxtLink
          :to="`/books/${bookSlug}/${firstChapter.fullPath}`"
          class="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Start Reading
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </NuxtLink>
      </div>
    </div>

    <div v-else class="container max-w-4xl mx-auto px-4 py-8 text-center">
      <h1 class="text-2xl font-bold mb-4">Book not found</h1>
      <NuxtLink to="/books" class="text-primary hover:underline">← Back to books</NuxtLink>
    </div>
  </NuxtLayout>
</template>
