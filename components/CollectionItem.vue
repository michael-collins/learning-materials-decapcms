<script setup lang="ts">
import { ref, computed } from 'vue'
import Breadcrumb from '~/components/ui/breadcrumb/Breadcrumb.vue'
import BreadcrumbItem from '~/components/ui/breadcrumb/BreadcrumbItem.vue'
import BreadcrumbLink from '~/components/ui/breadcrumb/BreadcrumbLink.vue'
import BreadcrumbSeparator from '~/components/ui/breadcrumb/BreadcrumbSeparator.vue'
import { Download, ExternalLink, FileText, FileArchive, File, Copy, Check, ChevronDown } from 'lucide-vue-next'
import Button from '~/components/ui/button/Button.vue'

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
  difficulty?: string
  license?: string
  aiLicense?: string | string[]
  allowEmbed?: boolean
  attachments?: Attachment[]
  image?: string
  imageAlt?: string
  tags?: string[]
}

const props = defineProps<Props>()

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
  return route.path
})

const isEmbedOpen = ref(false)
const isCopied = ref(false)

const embedUrl = computed(() => {
  if (typeof window === 'undefined') return ''
  // Convert /exercises/slug to /embed/exercises/slug
  const embedPath = route.path.startsWith('/') 
    ? `/embed${route.path}` 
    : `/embed/${route.path}`
  return `${window.location.origin}${embedPath}`
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
</script>

<template>
  <div class="container max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
    <article>
      <header class="mb-8 pb-8" :class="{ 'border-b': breadcrumbs.length > 0 }">
        <NuxtImg
          v-if="image"
          :src="image"
          :alt="imageAlt || title"
          class="w-full object-cover rounded-lg mb-6"
          loading="eager"
        />
        
        <h1 class="text-4xl font-bold tracking-tight mb-4">{{ title }}</h1>
        
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

      <div class="prose dark:prose-invert max-w-none prose-headings:text-foreground prose-headings:font-bold prose-headings:tracking-tight prose-h2:text-3xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-foreground prose-p:text-base prose-p:leading-7 prose-li:text-foreground prose-li:text-base prose-code:text-foreground prose-code:text-sm prose-code:bg-muted/50 dark:prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:border prose-code:border-border/50 prose-pre:bg-muted dark:prose-pre:bg-[#0a0a0a] prose-pre:text-foreground prose-pre:border prose-pre:border-border/50 prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-blockquote:text-foreground prose-blockquote:border-l-primary">
        <slot />
      </div>



      <div v-if="allowEmbed" class="mt-12 pt-8 border-t">
        <button
          @click="isEmbedOpen = !isEmbedOpen"
          class="flex items-center justify-between w-full text-left group"
        >
          <h2 class="text-2xl font-bold text-foreground">Embed</h2>
          <ChevronDown
            :class="['w-5 h-5 text-muted-foreground transition-transform', isEmbedOpen ? 'rotate-180' : '']"
          />
        </button>
        <div v-if="isEmbedOpen" class="mt-6 space-y-4">
          <p class="text-sm text-muted-foreground">
            Copy the code below to embed this content on your website:
          </p>
          <div class="relative">
            <pre class="p-4 bg-muted dark:bg-[#0a0a0a] rounded-lg border border-border overflow-x-auto text-sm"><code>{{ embedCode }}</code></pre>
            <Button
              @click="copyEmbedCode"
              size="sm"
              variant="outline"
              class="absolute top-2 right-2"
            >
              <Check v-if="isCopied" class="w-4 h-4 mr-2" />
              <Copy v-else class="w-4 h-4 mr-2" />
              {{ isCopied ? 'Copied!' : 'Copy' }}
            </Button>
          </div>
          <div class="mt-4">
            <p class="text-xs text-muted-foreground mb-2">Preview:</p>
            <div class="border border-border rounded-lg p-2 bg-muted/30">
              <iframe
                :src="embedUrl"
                class="w-full h-96 rounded"
                frameborder="0"
              ></iframe>
            </div>
          </div>
        </div>
      </div>

      <!-- AI Usage License (AIUL) -->
      <AIULComponent v-if="aiLicense" :license="aiLicense" />

      <!-- Creative Commons License -->
      <div v-if="license" class="mt-12 pt-8 border-t">
        <p class="text-sm text-muted-foreground leading-relaxed">
          <a :href="currentUrl" class="font-medium text-foreground hover:text-primary transition-colors">{{ title }}</a>
          <span v-if="author"> by {{ author }}</span>
          is licensed under
          <a v-if="getLicenseUrl(license)" :href="getLicenseUrl(license)" target="_blank" rel="noopener noreferrer" class="font-medium text-primary hover:underline">{{ license }}</a>
          <span v-else class="font-medium text-foreground">{{ license }}</span>
        </p>
      </div>
    </article>
  </div>
</template>
