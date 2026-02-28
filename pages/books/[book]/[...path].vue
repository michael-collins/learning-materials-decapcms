<script setup>
import {
  flattenOutline,
  findChapter,
  getPrevNext,
  buildSidebarTree,
  parseContentRef,
} from '~/composables/useBookOutline'
import { useBookTheme } from '~/composables/useBookTheme'

const route = useRoute()
const bookSlug = route.params.book
const pathParts = route.params.path
const chapterPath = Array.isArray(pathParts) ? pathParts.join('/') : pathParts || ''

definePageMeta({
  layout: false
})

// Fetch the book metadata
const { data: book } = await useAsyncData(`book-meta-${bookSlug}`, () =>
  queryCollection('books').path(`/books/${bookSlug}`).first()
)

// Flatten outline and find current chapter
const flatChapters = computed(() => {
  if (!book.value?.outline) return []
  return flattenOutline(book.value.outline)
})

const currentChapter = computed(() => findChapter(flatChapters.value, chapterPath))
const prevNext = computed(() => getPrevNext(flatChapters.value, chapterPath))

// Parse content reference
const contentRef = computed(() => {
  if (!currentChapter.value?.content) return null
  return parseContentRef(currentChapter.value.content)
})

// Fetch the referenced content
const { data: content, pending } = await useAsyncData(
  `book-content-${bookSlug}-${chapterPath}`,
  async () => {
    if (!contentRef.value) return null
    const { collection, slug } = contentRef.value
    try {
      return await queryCollection(collection).path(`/${collection}/${slug}`).first()
    } catch {
      return null
    }
  }
)

// Provide book data to the layout via useState
const bookTitleState = useState('book-title', () => book.value?.title || '')
const bookSlugState = useState('book-slug', () => bookSlug)
const bookThemeState = useState('book-theme', () => book.value?.theme || 'default')
const sidebarTreeState = useState('book-sidebar-tree', () =>
  book.value?.outline ? buildSidebarTree(book.value.outline, chapterPath) : []
)
const prevState = useState('book-prev', () =>
  prevNext.value.prev
    ? { title: prevNext.value.prev.title, fullPath: prevNext.value.prev.fullPath }
    : null
)
const nextState = useState('book-next', () =>
  prevNext.value.next
    ? { title: prevNext.value.next.title, fullPath: prevNext.value.next.fullPath }
    : null
)

watchEffect(() => {
  bookTitleState.value = book.value?.title || ''
  bookSlugState.value = bookSlug
  bookThemeState.value = book.value?.theme || 'default'
  sidebarTreeState.value = book.value?.outline
    ? buildSidebarTree(book.value.outline, chapterPath)
    : []
  prevState.value = prevNext.value.prev
    ? { title: prevNext.value.prev.title, fullPath: prevNext.value.prev.fullPath }
    : null
  nextState.value = prevNext.value.next
    ? { title: prevNext.value.next.title, fullPath: prevNext.value.next.fullPath }
    : null
})

useHead({
  title: computed(() => {
    const chapter = currentChapter.value?.title || ''
    const bookName = book.value?.title || 'Book'
    return chapter ? `${chapter} - ${bookName}` : bookName
  })
})

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

    <div v-else-if="content && currentChapter" class="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Chapter header -->
      <div class="mb-6">
        <h1 class="text-3xl font-bold mb-2">{{ currentChapter.title }}</h1>

        <!-- Source indicator -->
        <div v-if="contentRef" class="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <span class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
            {{ contentRef.collection }}
          </span>
          <NuxtLink
            :to="`/${contentRef.collection}/${contentRef.slug}`"
            class="hover:text-foreground hover:underline transition-colors"
          >
            View original →
          </NuxtLink>
        </div>
      </div>

      <!-- Render the referenced content body -->
      <div :class="[proseClass, 'max-w-none', contentClass]">
        <ContentRenderer :value="content" />
      </div>

      <!-- License footer -->
      <div v-if="book?.license" class="mt-12 pt-6 border-t text-xs text-muted-foreground">
        <p>
          This content is licensed under
          <span class="font-medium">{{ book.license }}</span>
          <template v-if="book.author"> by {{ book.author }}</template>.
        </p>
      </div>
    </div>

    <!-- Chapter not found or no content ref -->
    <div v-else-if="currentChapter && !currentChapter.content" class="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 class="text-3xl font-bold mb-4">{{ currentChapter.title }}</h1>
      <p class="text-muted-foreground">
        This section does not have content assigned yet. Use the CMS to add a content reference.
      </p>
    </div>

    <div v-else class="container max-w-4xl mx-auto px-4 py-8 text-center">
      <h1 class="text-2xl font-bold mb-4">Chapter not found</h1>
      <NuxtLink :to="`/books/${bookSlug}`" class="text-primary hover:underline">
        ← Back to book
      </NuxtLink>
    </div>
  </NuxtLayout>
</template>
