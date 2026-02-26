<script setup lang="ts">
/**
 * CMS Edit Item — Edit an existing content item.
 * Loads raw markdown from the content API, parses frontmatter,
 * and renders the auto-generated form.
 */
import { ChevronLeft, CheckCircle, ExternalLink, AlertCircle, Loader2 } from 'lucide-vue-next'

definePageMeta({
  layout: 'cms',
  middleware: ['cms-auth'],
})

const route = useRoute()
const collectionName = computed(() => route.params.collection as string)
const slug = computed(() => {
  const s = route.params.slug
  if (Array.isArray(s)) return s.join('/')
  return s ?? ''
})

const { getCollection, config } = useCmsConfig()
const collection = computed(() => getCollection(collectionName.value))
const { save, loadRaw, saving, error: saveError, lastResult, isLocalBackend } = useCmsSave()

const isEditorial = computed(() => !isLocalBackend.value && config.value?.publishMode === 'editorial_workflow')

const showSuccess = ref(false)
const loadError = ref<string | null>(null)
const initialData = ref<Record<string, any> | null>(null)
const loading = ref(true)

// Load the existing content (frontmatter is parsed server-side to avoid
// gray-matter's Node.js Buffer dependency in the browser)
onMounted(async () => {
  try {
    const res = await $fetch<{ frontmatter: Record<string, any>; body: string }>('/api/cms/content/read', {
      params: { collection: collectionName.value, slug: slug.value },
    })

    initialData.value = {
      ...res.frontmatter,
      body: res.body,
    }
  } catch (err: any) {
    loadError.value = err.data?.message || err.message || 'Failed to load content'
  } finally {
    loading.value = false
  }
})

async function handleSubmit(data: { frontmatter: Record<string, any>; body: string; publishMode?: 'draft' | 'direct' }) {
  try {
    await save({
      collection: collectionName.value,
      slug: slug.value,
      frontmatter: data.frontmatter,
      body: data.body,
      isNew: false,
      publishMode: data.publishMode,
    })
    showSuccess.value = true
  } catch {
    // Error is captured in the composable
  }
}
</script>

<template>
  <div class="p-6 md:p-8">
    <!-- Header -->
    <div class="mb-6">
      <div class="mb-1 flex items-center gap-2">
        <NuxtLink
          :to="`/cms/${collectionName}`"
          class="text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft class="h-4 w-4" />
        </NuxtLink>
        <span class="text-sm text-muted-foreground">
          {{ collection?.label || collectionName }}
        </span>
      </div>
      <h1 class="text-2xl font-bold tracking-tight">
        Edit: {{ initialData?.title || slug }}
      </h1>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
    </div>

    <!-- Load Error -->
    <div
      v-else-if="loadError"
      class="flex flex-col items-center justify-center rounded-lg border border-destructive/50 bg-destructive/5 py-12"
    >
      <AlertCircle class="mb-3 h-8 w-8 text-destructive" />
      <p class="text-sm text-destructive">{{ loadError }}</p>
      <NuxtLink
        :to="`/cms/${collectionName}`"
        class="mt-4 flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
      >
        <ChevronLeft class="h-4 w-4" />
        Back to {{ collection?.label || collectionName }}
      </NuxtLink>
    </div>

    <!-- Success State -->
    <div
      v-else-if="showSuccess && lastResult"
      class="rounded-lg border border-green-500/50 bg-green-500/5 p-6"
    >
      <div class="flex items-start gap-3">
        <CheckCircle class="mt-0.5 h-5 w-5 text-green-600 dark:text-green-400" />
        <div>
          <h2 class="font-medium text-green-600 dark:text-green-400">
            {{ lastResult.mode === 'local' ? 'Saved to filesystem' : 'Changes submitted' }}
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">
            <template v-if="lastResult.mode === 'editorial'">
              A pull request has been created for review.
            </template>
            <template v-else-if="lastResult.mode === 'direct'">
              Changes have been committed directly to {{ lastResult.branch }}.
            </template>
            <template v-else>
              Changes have been saved locally.
            </template>
          </p>
          <div class="mt-4 flex gap-3">
            <button
              class="rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent"
              @click="showSuccess = false"
            >
              Continue Editing
            </button>
            <NuxtLink
              :to="`/cms/${collectionName}`"
              class="rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent"
            >
              Back to {{ collection?.label || collectionName }}
            </NuxtLink>
            <a
              v-if="lastResult.prUrl"
              :href="lastResult.prUrl"
              target="_blank"
              class="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <ExternalLink class="h-4 w-4" />
              View PR
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Save Error -->
    <div
      v-if="saveError && !showSuccess"
      class="mb-6 flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-4"
    >
      <AlertCircle class="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <p class="text-sm text-destructive">{{ saveError }}</p>
    </div>

    <!-- Form -->
    <CmsCollectionForm
      v-if="collection?.fields && initialData && !showSuccess"
      :collection="collection"
      :initial-data="initialData"
      :is-new="false"
      :saving="saving"
      :editorial-workflow="isEditorial"
      @submit="handleSubmit"
    />
  </div>
</template>
