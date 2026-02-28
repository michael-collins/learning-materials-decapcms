<script setup>
import {
  flattenOutline,
  findChapter,
  getPrevNext,
  buildSidebarTree,
  parseContentRef,
} from '~/composables/useBookOutline'
import { useBookTheme } from '~/composables/useBookTheme'
import { ExternalLink, Download, FileText, FileArchive, FileSpreadsheet, FileImage, GitBranch } from 'lucide-vue-next'

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

// ── Content metadata extraction ───────────────────────────────────────
const contentImage = computed(() => content.value?.image || '')
const contentImageAlt = computed(() => content.value?.imageAlt || currentChapter.value?.title || '')
const contentDifficulty = computed(() => content.value?.difficulty || '')
const contentTags = computed(() => {
  const t = content.value?.tags
  return Array.isArray(t) ? t : []
})
const contentAttachments = computed(() => {
  let a = content.value?.attachments
  if (typeof a === 'string') { try { a = JSON.parse(a) } catch { a = [] } }
  return Array.isArray(a) ? a : []
})
const contentAiLicense = computed(() => content.value?.aiLicense || null)
const contentAuthor = computed(() => content.value?.author || '')
const contentAuthorUrl = computed(() => content.value?.authorUrl || '')
const contentLicense = computed(() => content.value?.license || '')
const contentDate = computed(() => content.value?.date || '')
const contentDescription = computed(() => content.value?.description || '')

// ── Version info ──────────────────────────────────────────────────────
// Pinned version from outline; falls back to version from the fetched content
const contentVersion = computed(() => {
  return currentChapter.value?.version || content.value?.version || ''
})
const contentVersionStatus = computed(() => {
  return content.value?.versionStatus || (contentVersion.value ? 'latest' : '')
})
// Build the "View original" link, including ?version= for non-latest
const viewOriginalLink = computed(() => {
  if (!contentRef.value) return ''
  const base = `/${contentRef.value.collection}/${contentRef.value.slug.split('/')[0]}`
  if (contentVersion.value && contentVersionStatus.value !== 'latest') {
    return `${base}?version=${contentVersion.value}`
  }
  return base
})

function formatDate(d) {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) }
  catch { return d }
}

function isImageFile(f) {
  return /\.(jpe?g|png|gif|svg|webp|avif|bmp|tiff?)$/i.test(f || '')
}

function isWebImageFile(f) {
  return /\.(jpe?g|png|gif|svg|webp|avif)$/i.test(f || '')
}

function getFileIcon(f) {
  if (!f) return FileText
  if (/\.zip$/i.test(f)) return FileArchive
  if (/\.(xlsx?|csv)$/i.test(f)) return FileSpreadsheet
  if (isImageFile(f)) return FileImage
  return FileText
}

function getLicenseUrl(license) {
  if (!license) return ''
  const l = license.toLowerCase().trim()
  if (l.startsWith('cc')) {
    const parts = l.replace(/^cc\s*/i, '').trim().split(/\s+/)
    const code = parts[0]?.toLowerCase()
    const version = parts[1] || '4.0'
    if (code) return `https://creativecommons.org/licenses/${code}/${version}/`
  }
  return ''
}
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
        <!-- Header image -->
        <NuxtImg
          v-if="contentImage"
          :src="contentImage"
          :alt="contentImageAlt"
          class="w-full object-cover rounded-lg mb-6"
          loading="eager"
        />

        <h1 class="text-3xl font-bold mb-2">{{ currentChapter.title }}</h1>

        <!-- Metadata row: source, version, date, difficulty, tags -->
        <div class="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
          <!-- Source indicator -->
          <div v-if="contentRef" class="flex items-center gap-2 text-xs">
            <span class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
              {{ contentRef.collection }}
            </span>
            <NuxtLink
              :to="viewOriginalLink"
              class="hover:text-foreground hover:underline transition-colors"
            >
              View original →
            </NuxtLink>
          </div>

          <!-- Version badge -->
          <span
            v-if="contentVersion"
            class="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300"
            :title="`Content version ${contentVersion}`"
          >
            <GitBranch class="h-3 w-3" />
            v{{ contentVersion }}
          </span>

          <div v-if="contentDate" class="flex items-center gap-2 text-xs">
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <time>{{ formatDate(contentDate) }}</time>
          </div>

          <span v-if="contentDifficulty" class="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-3 py-0.5 text-xs font-semibold text-primary">
            {{ contentDifficulty }}
          </span>

          <div v-if="contentTags.length > 0" class="flex flex-wrap gap-1.5">
            <span
              v-for="tag in contentTags"
              :key="tag"
              class="inline-flex items-center rounded-full bg-muted border border-border px-2.5 py-0.5 text-[10px] font-medium text-foreground"
            >
              {{ tag }}
            </span>
          </div>
        </div>

        <!-- Attachments -->
        <div v-if="contentAttachments.length > 0" class="mt-4 pt-4 border-t mb-6">
          <div class="space-y-2 max-w-2xl">
            <!-- External URL attachments -->
            <a
              v-for="(attachment, index) in contentAttachments.filter(a => a.url)"
              :key="`url-${index}`"
              :href="attachment.url"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors group"
            >
              <div class="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <ExternalLink class="w-4 h-4 text-primary" />
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">
                  {{ attachment.title }}
                </h4>
              </div>
              <ExternalLink class="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </a>
            <!-- Local file attachments -->
            <a
              v-for="(attachment, index) in contentAttachments.filter(a => a.file)"
              :key="`file-${index}`"
              :href="attachment.file"
              download
              class="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors group"
            >
              <div v-if="isWebImageFile(attachment.file)" class="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted">
                <NuxtImg
                  :src="attachment.file"
                  :alt="attachment.title"
                  class="w-full h-full object-cover pointer-events-none"
                  width="64"
                  height="64"
                  loading="lazy"
                />
              </div>
              <div v-else class="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <component :is="getFileIcon(attachment.file)" class="w-4 h-4 text-primary" />
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">
                  {{ attachment.title }}
                </h4>
              </div>
              <Download class="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </a>
          </div>
        </div>

        <!-- Description -->
        <p v-if="contentDescription" class="text-lg text-muted-foreground leading-relaxed">
          {{ contentDescription }}
        </p>
      </div>

      <!-- Render the referenced content body -->
      <div :class="[proseClass, 'max-w-none', contentClass]">
        <ContentRenderer :value="content" />
      </div>

      <!-- AI Usage License (AIUL) -->
      <AIULComponent v-if="contentAiLicense" :license="contentAiLicense" />

      <!-- License footer -->
      <div v-if="contentLicense || contentAuthor || book?.license" class="mt-12 pt-6 border-t text-xs text-muted-foreground">
        <p>
          <template v-if="contentLicense || contentAuthor">
            This content is licensed under
            <a v-if="getLicenseUrl(contentLicense)" :href="getLicenseUrl(contentLicense)" target="_blank" rel="noopener noreferrer" class="font-medium text-primary hover:underline">{{ contentLicense }}</a>
            <span v-else class="font-medium">{{ contentLicense || book?.license }}</span>
            <template v-if="contentAuthor">
              by
              <a v-if="contentAuthorUrl" :href="contentAuthorUrl" target="_blank" rel="noopener noreferrer" class="font-medium text-primary hover:underline">{{ contentAuthor }}</a>
              <span v-else class="font-medium">{{ contentAuthor }}</span>
            </template>.
          </template>
          <template v-else-if="book?.license">
            This content is licensed under
            <span class="font-medium">{{ book.license }}</span>
            <template v-if="book.author"> by {{ book.author }}</template>.
          </template>
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
