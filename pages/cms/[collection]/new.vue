<script setup lang="ts">
/**
 * CMS New Item — Create a new content item.
 * Auto-generates form from the collection's config.yml field definitions.
 */
import { ChevronLeft, CheckCircle, ExternalLink, AlertCircle, Pencil } from 'lucide-vue-next'

definePageMeta({
  layout: 'cms',
  middleware: ['cms-auth'],
})

const route = useRoute()
const collectionName = computed(() => route.params.collection as string)

const { getCollection, config } = useCmsConfig()
const collection = computed(() => getCollection(collectionName.value))
const { save, publishToGitHub, saving, publishing, error: saveError, lastResult, isLocalBackend } = useCmsSave()
const { prePublishCheck, syncStatus, syncMessage, pulling, pullFromGitHub, localVersion, remoteVersion } = useCmsSync()

const isEditorial = computed(() => !isLocalBackend.value && config.value?.publishMode === 'editorial_workflow')

const slugOverride = ref('')
const slugFromTitle = ref('')
const slugManualMode = ref(false)
const showSuccess = ref(false)
const showSyncDialog = ref(false)
const showResolver = ref(false)
const pendingPublish = ref<{ frontmatter: Record<string, any>; body: string; publishMode?: 'draft' | 'direct' } | null>(null)

// The effective slug: manual override if set, otherwise auto-generated from title
const effectiveSlug = computed(() => {
  if (slugManualMode.value && slugOverride.value.trim()) {
    return slugOverride.value.trim()
  }
  return slugFromTitle.value
})

// Generate a slug from the title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// Called when CollectionForm emits a title change
function onTitleUpdate(title: string) {
  slugFromTitle.value = generateSlug(title)
}

async function handleSubmit(data: { frontmatter: Record<string, any>; body: string; publishMode?: 'draft' | 'direct' }) {
  const slug = effectiveSlug.value || generateSlug(data.frontmatter.title || 'untitled')

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
      publishMode: data.publishMode,
    })
    showSuccess.value = true
  } catch {
    // Error is captured in the composable
  }
}

async function handlePublish(data: { frontmatter: Record<string, any>; body: string; publishMode?: 'draft' | 'direct' }) {
  const slug = effectiveSlug.value || generateSlug(data.frontmatter.title || 'untitled')

  if (!slug) {
    return
  }

  pendingPublish.value = { ...data }

  try {
    const check = await prePublishCheck(collectionName.value, slug)

    if (check.safe) {
      await doPublish(data, slug)
    } else {
      showSyncDialog.value = true
    }
  } catch {
    showSyncDialog.value = true
  }
}

async function doPublish(data: { frontmatter: Record<string, any>; body: string; publishMode?: 'draft' | 'direct' }, slug?: string) {
  const resolvedSlug = slug || effectiveSlug.value || generateSlug(data.frontmatter.title || 'untitled')
  if (!resolvedSlug) return

  try {
    await publishToGitHub({
      collection: collectionName.value,
      slug: resolvedSlug,
      frontmatter: data.frontmatter,
      body: data.body,
      isNew: true,
      publishMode: data.publishMode,
    })
    showSuccess.value = true
    showSyncDialog.value = false
    pendingPublish.value = null
  } catch {
    // Error captured in composable
  }
}

function handleForcePublish() {
  if (pendingPublish.value) {
    doPublish(pendingPublish.value)
  }
}

function handleSyncCancel() {
  showSyncDialog.value = false
  pendingPublish.value = null
}

function handleResolveOpen() {
  showSyncDialog.value = false
  showResolver.value = true
}

async function handleResolved(merged: { frontmatter: Record<string, any>; body: string }) {
  showResolver.value = false
  const slug = effectiveSlug.value || generateSlug(merged.frontmatter.title || 'untitled')
  if (!slug) return

  try {
    await publishToGitHub({
      collection: collectionName.value,
      slug,
      frontmatter: merged.frontmatter,
      body: merged.body,
      isNew: true,
      publishMode: pendingPublish.value?.publishMode,
    })
    showSuccess.value = true
    pendingPublish.value = null
  } catch {
    // Error captured in composable
  }
}

function handleResolverCancel() {
  showResolver.value = false
  showSyncDialog.value = true
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
              Content has been saved locally. Use the <strong>Publish to GitHub</strong> button to push changes to the repository.
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
      <!-- Slug display / override -->
      <div class="mb-6 space-y-1.5">
        <label class="text-sm font-medium">
          Slug
        </label>
        <div class="flex items-center gap-2">
          <div
            v-if="!slugManualMode"
            class="flex h-10 flex-1 items-center rounded-md border border-input bg-muted/50 px-3 text-sm font-mono text-muted-foreground"
          >
            {{ effectiveSlug || 'auto-generated-from-title' }}
          </div>
          <input
            v-else
            v-model="slugOverride"
            type="text"
            :placeholder="slugFromTitle || 'custom-slug'"
            class="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <button
            type="button"
            @click="slugManualMode = !slugManualMode"
            :class="[
              'flex h-10 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors',
              slugManualMode ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'
            ]"
          >
            <Pencil class="h-3.5 w-3.5" />
            {{ slugManualMode ? 'Auto' : 'Override' }}
          </button>
        </div>
        <p class="text-xs text-muted-foreground">
          {{ slugManualMode ? 'Enter a custom slug or switch back to auto-generate from title' : 'Auto-generated from title. Click Override to customize.' }}
        </p>
      </div>

      <CmsCollectionForm
        :collection="collection"
        :is-new="true"
        :saving="saving"
        :publishing="publishing"
        :editorial-workflow="isEditorial"
        :local-backend="isLocalBackend"
        @submit="handleSubmit"
        @publish="handlePublish"
        @update:title="onTitleUpdate"
      />
    </template>

    <!-- No collection found -->
    <div v-if="!collection" class="py-8 text-center">
      <p class="text-muted-foreground">Collection "{{ collectionName }}" not found.</p>
    </div>

    <!-- Sync Conflict Dialog -->
    <CmsSyncConflictDialog
      v-model:open="showSyncDialog"
      :sync-status="String(syncStatus)"
      :sync-message="String(syncMessage)"
      :pulling="pulling"
      :publishing="publishing"
      :can-resolve="!!(localVersion && remoteVersion)"
      @force-publish="handleForcePublish"
      @pull="handleSyncCancel"
      @resolve="handleResolveOpen"
      @cancel="handleSyncCancel"
    />

    <!-- Conflict Resolver (full-screen overlay) -->
    <Teleport to="body">
      <div
        v-if="showResolver && localVersion && remoteVersion"
        class="fixed inset-0 z-50 flex flex-col bg-background"
      >
        <CmsConflictResolver
          :local-version="localVersion"
          :remote-version="remoteVersion"
          @resolve="handleResolved"
          @cancel="handleResolverCancel"
        />
      </div>
    </Teleport>
  </div>
</template>
