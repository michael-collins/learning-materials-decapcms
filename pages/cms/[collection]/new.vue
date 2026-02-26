<script setup lang="ts">
/**
 * CMS New Item — Create a new content item.
 * Auto-generates form from the collection's config.yml field definitions.
 */
import { ChevronLeft, CheckCircle, ExternalLink, AlertCircle } from 'lucide-vue-next'

definePageMeta({
  layout: 'cms',
  middleware: ['cms-auth'],
})

const route = useRoute()
const collectionName = computed(() => route.params.collection as string)

const { getCollection } = useCmsConfig()
const collection = computed(() => getCollection(collectionName.value))
const { save, saving, error: saveError, lastResult } = useCmsSave()

const slugInput = ref('')
const showSuccess = ref(false)

// Generate a slug from the title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

async function handleSubmit(data: { frontmatter: Record<string, any>; body: string }) {
  // Determine slug from input, title, or generate
  let slug = slugInput.value.trim()
  if (!slug) {
    slug = generateSlug(data.frontmatter.title || 'untitled')
  }

  if (!slug) {
    return
  }

  try {
    await save({
      collection: collectionName.value,
      slug,
      frontmatter: data.frontmatter,
      body: data.body,
      isNew: true,
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
        New {{ collection?.label?.replace(/s$/, '') || 'Item' }}
      </h1>
    </div>

    <!-- Success State -->
    <div
      v-if="showSuccess && lastResult"
      class="rounded-lg border border-green-500/50 bg-green-500/5 p-6"
    >
      <div class="flex items-start gap-3">
        <CheckCircle class="mt-0.5 h-5 w-5 text-green-600 dark:text-green-400" />
        <div>
          <h2 class="font-medium text-green-600 dark:text-green-400">
            {{ lastResult.mode === 'local' ? 'Saved to filesystem' : 'Content submitted' }}
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">
            <template v-if="lastResult.mode === 'editorial'">
              A pull request has been created for review.
            </template>
            <template v-else-if="lastResult.mode === 'direct'">
              Content has been committed directly to {{ lastResult.branch }}.
            </template>
            <template v-else>
              Content has been saved locally.
            </template>
          </p>

          <div class="mt-4 flex gap-3">
            <NuxtLink
              :to="`/cms/${collectionName}`"
              class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent"
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
              View Pull Request
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Save Error -->
    <div
      v-if="saveError"
      class="mb-6 flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-4"
    >
      <AlertCircle class="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <p class="text-sm text-destructive">{{ saveError }}</p>
    </div>

    <!-- Form -->
    <template v-if="collection?.fields && !showSuccess">
      <!-- Slug field -->
      <div class="mb-6 space-y-1.5">
        <label for="slug-input" class="text-sm font-medium">
          Slug
          <span class="text-xs font-normal text-muted-foreground">(URL-friendly name, auto-generated from title if blank)</span>
        </label>
        <input
          id="slug-input"
          v-model="slugInput"
          type="text"
          placeholder="auto-generated-from-title"
          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <CmsCollectionForm
        :collection="collection"
        :is-new="true"
        :saving="saving"
        @submit="handleSubmit"
      />
    </template>

    <!-- No collection found -->
    <div v-if="!collection" class="py-8 text-center">
      <p class="text-muted-foreground">Collection "{{ collectionName }}" not found.</p>
    </div>
  </div>
</template>
