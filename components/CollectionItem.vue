<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick, provide } from 'vue'
import Breadcrumb from '~/components/ui/breadcrumb/Breadcrumb.vue'
import BreadcrumbItem from '~/components/ui/breadcrumb/BreadcrumbItem.vue'
import BreadcrumbLink from '~/components/ui/breadcrumb/BreadcrumbLink.vue'
import BreadcrumbSeparator from '~/components/ui/breadcrumb/BreadcrumbSeparator.vue'
import { Download, ExternalLink, FileText, FileArchive, File, Copy, Check, ChevronDown, Pencil, Share2, X } from 'lucide-vue-next'
import Button from '~/components/ui/button/Button.vue'
import Card from '~/components/ui/card/Card.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import CardHeader from '~/components/ui/card/CardHeader.vue'
import CardTitle from '~/components/ui/card/CardTitle.vue'
import CitationDropdown from '~/components/CitationDropdown.vue'
import { useBodyOverflow } from '~/composables/useBodyOverflow'
import { useContentReferences } from '~/composables/useContentReferences'

interface BreadcrumbSegment {
  label: string
  path?: string
}

interface Attachment {
  file?: string
  url?: string
  title: string
  description?: string
}

interface Props {
  breadcrumbs: BreadcrumbSegment[]
  title: string
  description?: string
  date?: string
  author?: string
  authorUrl?: string
  difficulty?: string
  license?: string
  aiLicense?: string | string[]
  allowEmbed?: boolean
  attachments?: Attachment[]
  image?: string
  imageAlt?: string
  tags?: string[]
  versionStatus?: string
  version?: string
  hideMenu?: boolean
  prerequisites?: Array<{
    __typename: string
    lesson?: string
    lecture?: string
    tutorial?: string
    exercise?: string
    article?: string
    project?: string
    specialization?: string
    pathway?: string
  }>
}

const props = defineProps<Props>()

console.log('[CollectionItem] Title:', props.title)
console.log('[CollectionItem] License prop:', props.license)
console.log('[CollectionItem] Author prop:', props.author)
console.log('[CollectionItem] Prerequisites prop:', props.prerequisites)

const { toggle: toggleBodyOverflow } = useBodyOverflow()

// Content references / citations system
const { references: contentRefs, hasReferences, addReference, clearReferences } = useContentReferences()
provide('contentReferences', { references: contentRefs, hasReferences, addReference, clearReferences })

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return FileText
  if (['zip', 'tar', 'gz', 'rar'].includes(ext || '')) return FileArchive
  return File
}

const isWebImageFile = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase()
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext || '')
}

const isImageFile = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase()
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tif', 'tiff'].includes(ext || '')
}

const getFileSize = (url: string) => {
  // This would typically come from the backend, but for now we'll show the extension
  const ext = url.split('.').pop()?.toUpperCase()
  return ext ? `${ext} file` : 'File'
}

const getLicenseUrl = (license: string) => {
  const licenseMap: Record<string, string> = {
    'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
    'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
    'CC BY-NC 4.0': 'https://creativecommons.org/licenses/by-nc/4.0/',
    'CC BY-NC-SA 4.0': 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    'CC BY-ND 4.0': 'https://creativecommons.org/licenses/by-nd/4.0/',
    'CC BY-NC-ND 4.0': 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
    'CC0 1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
  }
  return licenseMap[license] || ''
}

const route = useRoute()
const currentUrl = computed(() => {
  const versionParam = route.query.version
  if (versionParam && typeof versionParam === 'string') {
    return `${route.path}?version=${versionParam}`
  }
  return route.path
})

const isEmbed = computed(() => route.query.embed === 'true')

// Hide OER Schema badge in embed/preview contexts
const hideOerSchemaBadge = computed(() => {
  // Check if we're in embed mode via query param or in the /embed/ route
  return route.query.embed === 'true' || route.path.startsWith('/embed/')
})

const shouldShowRubric = computed(() => {
  // Show rubric unless hideRubric query param is set
  return route.query.hideRubric !== 'true'
})

const shouldShowAILicense = computed(() => {
  // Show AI license unless hideAILicense query param is set
  return route.query.hideAILicense !== 'true'
})

const getCmsEditUrl = computed(() => {
  // Don't show edit link in embed mode
  if (isEmbed.value) return null
  
  // Extract collection type and slug from the route path
  const pathParts = route.path.split('/').filter(Boolean)
  if (pathParts.length >= 2) {
    const collection = pathParts[0] // e.g., 'exercises', 'lectures', 'tutorials'
    const slug = pathParts.slice(1).join('/') // e.g., 'some-exercise'
    return `/cms/${collection}/edit/${slug}`
  }
  return null
})

const getContentTypeAndSlug = computed(() => {
  const pathParts = route.path.split('/').filter(Boolean)
  if (pathParts.length >= 2) {
    const contentType = pathParts[0] as 'exercises' | 'tutorials' | 'articles' | 'projects' | 'lectures' | 'lessons' | 'specializations' | 'pathways'
    const slug = pathParts.slice(1).join('/')
    return { contentType, slug }
  }
  return null
})

const isEmbedOpen = ref(false)
const isCopied = ref(false)
const isCitationCopied = ref(false)
const isEmbedConfigOpen = ref(false)
const isEmbedPreviewOpen = ref(false)
const isEmbedModalOpen = ref(false)
const isMoreMenuOpen = ref(false)
const moreMenuRef = ref<HTMLElement | null>(null)
const embedModalRef = ref<HTMLElement | null>(null)
const moreMenuButtonRef = ref<HTMLElement | null>(null)
let previousActiveElement: HTMLElement | null = null

// Close menu when clicking outside
const closeMenuOnClickOutside = (event: MouseEvent) => {
  if (moreMenuRef.value && !moreMenuRef.value.contains(event.target as Node)) {
    isMoreMenuOpen.value = false
  }
}

// Close menu on Escape key
const handleMenuKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isMoreMenuOpen.value) {
    isMoreMenuOpen.value = false
    moreMenuButtonRef.value?.focus()
  }
}

// Handle modal keyboard events
const handleModalKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isEmbedModalOpen.value) {
    isEmbedModalOpen.value = false
  }
}

watch(isMoreMenuOpen, (newVal) => {
  if (newVal) {
    document.addEventListener('click', closeMenuOnClickOutside)
    document.addEventListener('keydown', handleMenuKeydown)
  } else {
    document.removeEventListener('click', closeMenuOnClickOutside)
    document.removeEventListener('keydown', handleMenuKeydown)
  }
})

watch(isEmbedModalOpen, (newVal) => {
  if (newVal) {
    // Store currently focused element
    previousActiveElement = document.activeElement as HTMLElement
    // Focus modal on next tick after it's rendered
    nextTick(() => {
      embedModalRef.value?.focus()
      toggleBodyOverflow(true)
    })
    document.addEventListener('keydown', handleModalKeydown)
  } else {
    // Return focus to previous element
    if (previousActiveElement) {
      previousActiveElement.focus()
      previousActiveElement = null
    }
    toggleBodyOverflow(false)
    document.removeEventListener('keydown', handleModalKeydown)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenuOnClickOutside)
  document.removeEventListener('keydown', handleMenuKeydown)
  document.removeEventListener('keydown', handleModalKeydown)
})

// Watch embed modal state and toggle body overflow
watch(() => isEmbedModalOpen.value, (isOpen) => {
  toggleBodyOverflow(isOpen)
})
const embedShowRubric = ref(true)
const embedShowAILicense = ref(true)

const embedUrl = computed(() => {
  if (typeof window === 'undefined') return ''
  // Convert /exercises/slug to /embed/exercises/slug
  const embedPath = route.path.startsWith('/') 
    ? `/embed${route.path}` 
    : `/embed/${route.path}`
  
  // Add query parameters for config options
  const params = new URLSearchParams()
  
  // Include version parameter if present
  const versionParam = route.query.version
  if (versionParam && typeof versionParam === 'string') {
    params.append('version', versionParam)
  }
  
  if (!embedShowRubric.value) params.append('hideRubric', 'true')
  if (!embedShowAILicense.value) params.append('hideAILicense', 'true')
  
  const queryString = params.toString()
  const fullPath = queryString ? `${embedPath}?${queryString}` : embedPath
  
  const finalUrl = `${window.location.origin}${fullPath}`
  console.log('[CollectionItem] embedUrl computed:', { 
    routePath: route.path, 
    embedPath, 
    versionParam, 
    finalUrl 
  })
  
  return finalUrl
})

const embedCode = computed(() => {
  return `<iframe src="${embedUrl.value}" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`
})

const copyEmbedCode = async () => {
  try {
    await navigator.clipboard.writeText(embedCode.value)
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

const exportCommonCartridge = async () => {
  try {
    // Extract slug from route path
    const pathParts = route.path.split('/').filter(Boolean)
    if (pathParts.length < 2) return
    
    const slug = pathParts.slice(1).join('/')
    const response = await fetch(`/api/export-common-cartridge?slug=${slug}`)
    if (!response.ok) throw new Error('Export failed')
    
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug}-cartridge.zip`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } catch (error) {
    console.error('Failed to export Common Cartridge:', error)
  }
}

const generateCitation = () => {
  const currentYear = new Date().getFullYear()
  // Get current URL including version parameter
  let pageUrl = ''
  if (typeof window !== 'undefined') {
    pageUrl = window.location.href
  } else if (props.version && props.versionStatus !== 'latest') {
    // For SSR, construct URL with version parameter
    const route = useRoute()
    pageUrl = `${route.path}?version=${props.version}`
  } else {
    const route = useRoute()
    pageUrl = route.path
  }
  
  const accessDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  
  // Generate APA-style citation
  let citation = ''
  
  if (props.author) {
    citation += `${props.author}. `
  }
  
  if (props.date) {
    const year = new Date(props.date).getFullYear()
    citation += `(${year}). `
  } else {
    citation += `(n.d.). `
  }
  
  citation += `${props.title}. `
  
  if (props.license) {
    citation += `[${props.license}]. `
  }
  
  // Add version information if viewing a specific archived version
  if (props.version && props.versionStatus === 'archived') {
    citation += `[Version ${props.version}]. `
  }
  
  citation += `Retrieved ${accessDate}, from ${pageUrl}`
  
  return citation
}

const copyCitation = async () => {
  try {
    const citation = generateCitation()
    await navigator.clipboard.writeText(citation)
    isCitationCopied.value = true
    setTimeout(() => {
      isCitationCopied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy citation:', err)
  }
}
</script>

<template>
  <div class="container max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
    <article>
      <header class="mb-8 pb-8" :class="{ 'border-b': breadcrumbs.length > 0 }">
        <!-- More menu dropdown -->
        <div v-if="!isEmbed && !hideMenu" class="flex justify-end mb-4">
          <div ref="moreMenuRef" class="relative">
            <Button
              ref="moreMenuButtonRef"
              size="icon"
              variant="ghost"
              :aria-label="isMoreMenuOpen ? 'Close options menu' : 'Open options menu'"
              :aria-expanded="isMoreMenuOpen"
              aria-haspopup="true"
              @click="isMoreMenuOpen = !isMoreMenuOpen"
            >
              <ChevronDown class="w-5 h-5 text-foreground" />
            </Button>
            <div 
              v-if="isMoreMenuOpen" 
              class="absolute right-0 mt-0 w-56 bg-background border border-border rounded-lg shadow-lg z-50"
              role="menu"
              aria-orientation="vertical"
            >
              <!-- Edit button -->
              <NuxtLink
                v-if="getCmsEditUrl"
                :to="getCmsEditUrl"
                class="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted rounded-t-lg transition-colors"
                @click.stop
              >
                <Pencil class="w-4 h-4" />
                Edit page
              </NuxtLink>
              <div v-if="getCmsEditUrl" class="h-px bg-border" />
              
              <!-- Versions submenu -->
              <VersionsDropdown 
                v-if="getContentTypeAndSlug"
                :content-type="getContentTypeAndSlug.contentType"
                :slug="getContentTypeAndSlug.slug"
                :current-version="undefined"
              />
              <div class="h-px bg-border" />
              
              <button
                v-if="allowEmbed"
                @click.stop="isEmbedModalOpen = true"
                class="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors text-left"
              >
                <Share2 class="w-4 h-4" />
                Embed
              </button>
              <div v-if="allowEmbed" class="h-px bg-border" />
              
              <button
                @click.stop="exportCommonCartridge"
                class="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted rounded-b-lg transition-colors text-left"
              >
                <Download class="w-4 h-4" />
                Export Common Cartridge
              </button>
            </div>
          </div>
        </div>
        
        <NuxtImg
          v-if="image"
          :src="image"
          :alt="imageAlt || title"
          class="w-full object-cover rounded-lg mb-6"
          loading="eager"
        />
        
        <h1 class="text-4xl font-bold tracking-tight mb-4 flex items-center gap-3">
          {{ title }}
          <span
            v-if="versionStatus === 'archived' && !version"
            class="inline-flex items-center rounded-full bg-warning/10 border border-warning/20 px-3 py-1 text-xs font-semibold text-warning"
          >
            Archived
          </span>
        </h1>
        
        <div class="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div v-if="date" class="flex items-center gap-2">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <time>{{ formatDate(date) }}</time>
          </div>
          <div v-if="difficulty">
            <span class="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary">
              {{ difficulty }}
            </span>
          </div>
          <div v-if="difficulty && tags && tags.length > 0" class="h-4 w-px bg-border"></div>
          <div v-if="tags && tags.length > 0" class="flex flex-wrap gap-2">
            <span
              v-for="tag in tags"
              :key="tag"
              class="inline-flex items-center rounded-full bg-muted border border-border px-3 py-1 text-xs font-medium text-foreground"
            >
              {{ tag }}
            </span>
          </div>
        </div>

        <div v-if="attachments && attachments.length > 0" class="mt-6 pt-6 border-t">
          <div class="space-y-2 max-w-2xl">
            <!-- External URL attachments -->
            <a
              v-for="(attachment, index) in attachments.filter(a => a.url)"
              :key="`url-${index}`"
              :href="attachment.url"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors group"
            >
              <div class="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <ExternalLink class="w-4 h-4 text-primary" />
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">
                  {{ attachment.title }}
                </h4>
              </div>
              <ExternalLink class="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            </a>
            <!-- Local file attachments -->
            <a
              v-for="(attachment, index) in attachments.filter(a => a.file)"
              :key="`file-${index}`"
              :href="attachment.file"
              download
              class="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors group"
            >
              <div v-if="isWebImageFile(attachment.file)" class="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted">
                <NuxtImg
                  :src="attachment.file"
                  :alt="attachment.title"
                  class="w-full h-full object-cover pointer-events-none"
                  width="64"
                  height="64"
                  loading="lazy"
                />
              </div>
              <div v-else-if="isImageFile(attachment.file)" class="flex-shrink-0 w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div v-else class="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <component :is="getFileIcon(attachment.file)" class="w-4 h-4 text-primary" />
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">
                  {{ attachment.title }}
                </h4>
              </div>
              <Download class="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            </a>
          </div>
        </div>

        <p v-if="description" class="mt-4 text-lg text-muted-foreground leading-relaxed">
          {{ description }}
        </p>
      </header>

      <!-- Prerequisites Section -->
      <PrerequisiteSection v-if="prerequisites && prerequisites.length > 0" :prerequisites="prerequisites" />

      <div class="prose dark:prose-invert max-w-none prose-headings:text-foreground prose-headings:font-bold prose-headings:tracking-tight prose-h2:text-3xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-foreground prose-p:text-base prose-p:leading-7 prose-li:text-foreground prose-li:text-base prose-code:text-foreground prose-code:text-sm prose-code:bg-muted/50 dark:prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:border prose-code:border-border/50 prose-pre:bg-muted dark:prose-pre:bg-[#0a0a0a] prose-pre:text-foreground prose-pre:border prose-pre:border-border/50 prose-a:text-primary prose-a:font-medium prose-a:no-underline prose-strong:text-foreground prose-blockquote:text-foreground prose-blockquote:border-l-primary">
        <slot />
      </div>

      <!-- Content References / Citations Footer -->
      <ContentReferencesFooter />
    </article>

    <!-- AI Usage License (AIUL) -->
    <AIULComponent v-if="aiLicense && shouldShowAILicense" :license="aiLicense" />

    <!-- License or Copyright -->
    <div v-if="license || author" class="container max-w-4xl mx-auto mt-12 pt-4 border-t">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p class="text-sm text-muted-foreground leading-relaxed">
            <a :href="currentUrl" class="font-medium text-foreground hover:text-primary transition-colors" :aria-label="`View ${title}`">{{ title }}</a>
            <span v-if="author">
              by 
              <a v-if="authorUrl" :href="authorUrl" target="_blank" rel="noopener noreferrer" class="font-medium text-primary hover:underline transition-colors">{{ author }}</a>
              <span v-else class="font-medium text-foreground">{{ author }}</span>
            </span>
            <span v-if="license">
              is licensed under
              <a v-if="getLicenseUrl(license)" :href="getLicenseUrl(license)" target="_blank" rel="noopener noreferrer" class="font-medium text-primary hover:underline" :aria-label="`View ${license} license details`" :title="`View ${license} license details`">{{ license }}</a>
              <span v-else class="font-medium text-foreground">{{ license }}</span>
            </span>
          </p>
          <CitationDropdown 
            :title="title"
            :author="author"
            :author-url="authorUrl"
            :date="date"
            :license="license"
            :version="version"
            :version-status="versionStatus"
          />
        </div>
      </div>

    <!-- OER Schema Curriculum Graph -->
    <OERSchemaGraphWrapper v-if="!isEmbed && !hideOerSchemaBadge" />
    
    <!-- Embed Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="isEmbedModalOpen"
          class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          @click.self="isEmbedModalOpen = false"
          role="presentation"
        >
          <div
            ref="embedModalRef"
            class="relative w-full max-w-7xl h-[95vh] flex flex-col bg-background border border-border rounded-lg shadow-xl overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="embed-modal-title"
            tabindex="-1"
            @click.stop
          >
            <!-- Header -->
            <div class="flex items-start justify-between gap-4 p-6 border-b border-border bg-background shrink-0">
              <div class="flex-1">
                <h2 id="embed-modal-title" class="text-2xl font-bold text-foreground">Embed Content</h2>
                <p class="mt-2 text-sm text-muted-foreground">
                  Embed this content on your website
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                @click="isEmbedModalOpen = false"
                aria-label="Close modal"
                class="shrink-0"
              >
                <X class="w-5 h-5" />
              </Button>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto p-6 bg-background">
              <div class="flex flex-col lg:flex-row gap-6 h-full">
                <!-- Left Column: Configuration and Embed Code -->
                <div class="flex-1 space-y-6 min-w-0 lg:max-w-[45%]">
                  <!-- Configuration Section -->
                  <div class="border border-border rounded-lg overflow-hidden bg-card">
                    <button
                      @click="isEmbedConfigOpen = !isEmbedConfigOpen"
                      class="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors bg-card border-b border-border"
                      :aria-label="isEmbedConfigOpen ? 'Hide embed configuration' : 'Show embed configuration'"
                      :aria-expanded="isEmbedConfigOpen"
                    >
                      <div class="flex items-center gap-3">
                        <Icon name="lucide:settings" class="w-4 h-4 text-primary shrink-0" />
                        <h3 class="text-sm font-semibold text-foreground">Configuration</h3>
                      </div>
                      <ChevronDown
                        :class="['w-4 h-4 text-muted-foreground transition-transform', isEmbedConfigOpen ? 'rotate-180' : '']"
                      />
                    </button>
                    <div v-if="isEmbedConfigOpen" class="px-4 py-4 space-y-3 bg-card">
                      <label class="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          v-model="embedShowRubric"
                          class="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
                        />
                        <span class="text-sm text-foreground group-hover:text-primary transition-colors">Display rubric</span>
                      </label>
                      <label class="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          v-model="embedShowAILicense"
                          class="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
                        />
                        <span class="text-sm text-foreground group-hover:text-primary transition-colors">Display AI license</span>
                      </label>
                    </div>
                  </div>

                  <!-- Embed Code -->
                  <div class="border border-border rounded-lg overflow-hidden bg-card">
                    <div class="flex items-center justify-between gap-4 p-4 bg-card border-b border-border">
                      <div class="flex items-center gap-3">
                        <Icon name="lucide:code" class="w-4 h-4 text-primary shrink-0" />
                        <h3 class="text-sm font-semibold text-foreground">Embed Code</h3>
                      </div>
                      <Button
                        @click="copyEmbedCode"
                        size="sm"
                        variant="outline"
                        class="shrink-0"
                        aria-label="Copy embed code"
                      >
                        <Check v-if="isCopied" class="w-4 h-4 mr-2 text-green-600" />
                        <Copy v-else class="w-4 h-4 mr-2" />
                        {{ isCopied ? 'Copied' : 'Copy' }}
                      </Button>
                    </div>
                    <div class="relative max-h-64 overflow-auto bg-muted">
                      <pre class="p-4 text-sm leading-relaxed text-foreground font-mono"><code>{{ embedCode }}</code></pre>
                    </div>
                    <div class="p-4 bg-card border-t border-border">
                      <p class="text-sm text-muted-foreground leading-relaxed">
                        Copy the code above to embed this content on your website
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Right Column: Preview -->
                <div class="flex-1 min-w-0 lg:min-h-[600px]">
                  <div class="border border-border rounded-lg overflow-hidden bg-card h-full flex flex-col min-h-[500px]">
                    <div class="flex items-center justify-between w-full px-4 py-3 bg-card border-b border-border">
                      <div class="flex items-center gap-3">
                        <Icon name="lucide:monitor" class="w-4 h-4 text-primary shrink-0" />
                        <h3 class="text-sm font-semibold text-foreground">Preview</h3>
                      </div>
                    </div>
                    <div class="flex-1 bg-muted/30 overflow-hidden">
                      <iframe
                        :key="embedUrl"
                        :src="embedUrl"
                        class="w-full h-full min-h-[400px] lg:min-h-full"
                        frameborder="0"
                        title="Embed preview"
                      ></iframe>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    
    <!-- Citation copied toast -->
    <Transition name="fade">
      <div
        v-if="isCitationCopied"
        class="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50"
        role="status"
        aria-live="polite"
      >
        <Check class="w-4 h-4" />
        <span class="text-sm font-medium">Citation copied to clipboard</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
:deep(.prose a) {
  text-decoration: none;
}

:deep(.prose a:hover) {
  text-decoration: underline;
  text-decoration-color: hsl(var(--primary) / 0.6);
  text-underline-offset: 3px;
}

:deep(.prose h1 a),
:deep(.prose h2 a),
:deep(.prose h3 a),
:deep(.prose h4 a),
:deep(.prose h5 a),
:deep(.prose h6 a) {
  color: hsl(var(--foreground));
  text-decoration: none;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.modal-enter-active, .modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from, .modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
