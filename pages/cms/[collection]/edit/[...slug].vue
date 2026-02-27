<script setup lang="ts">
/**
 * CMS Edit Item — Edit an existing content item.
 * Loads raw markdown from the content API, parses frontmatter,
 * and renders the auto-generated form.
 *
 * Publish-to-GitHub flow includes a sync check to prevent
 * accidental overwrites when local and remote diverge.
 */
import { ChevronLeft, CheckCircle, ExternalLink, AlertCircle, Loader2, GitBranch, Archive } from 'lucide-vue-next'

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

/** When editing an archived version, e.g. '1.0.0' */
const editVersion = computed(() => route.query.version as string | undefined)

const { getCollection, config } = useCmsConfig()
const collection = computed(() => getCollection(collectionName.value))
const { save, publishToGitHub, loadRaw, saving, publishing, error: saveError, lastResult, isLocalBackend } = useCmsSave()
const { checkSync, prePublishCheck, pullFromGitHub, syncStatus, syncMessage, pulling, localVersion, remoteVersion } = useCmsSync()
const { getToken, restoreSession } = useCmsAuth()

const isEditorial = computed(() => !isLocalBackend.value && config.value?.publishMode === 'editorial_workflow')

const showSuccess = ref(false)
const loadError = ref<string | null>(null)
const initialData = ref<Record<string, any> | null>(null)
const loading = ref(true)

/** Whether local content differs from what's on GitHub */
const unpublishedChanges = ref(false)

/** Whether a discard operation is in progress */
const discarding = ref(false)
const discardError = ref<string | null>(null)

// ─── Sync conflict dialog state ─────────────────────────
const showSyncDialog = ref(false)
const showResolver = ref(false)
/** The pending publish data (held while conflict dialog is open) */
const pendingPublish = ref<{ frontmatter: Record<string, any>; body: string; publishMode?: 'draft' | 'direct' } | null>(null)

// ─── Version creation dialog state ──────────────────────
const showVersionDialog = ref(false)

/** Whether this collection has a version field (used to show/hide the Create Version button) */
const hasVersionField = computed(() => {
  return collection.value?.fields?.some((f: any) => f.name === 'version') ?? false
})

/** The current version from the loaded content (or form data) */
const currentVersion = computed(() => {
  return initialData.value?.version || '1.0.0'
})

/**
 * Handle version creation — reload the content from disk since
 * the server endpoint updated both index.md and created the snapshot.
 */
async function handleVersionCreated(data: { previousVersion: string; newVersion: string }) {
  try {
    const token = getToken()
    const res = await $fetch<{ frontmatter: Record<string, any>; body: string }>('/api/cms/content/read', {
      params: {
        collection: collectionName.value,
        slug: slug.value,
        ...(token ? { token } : {}),
        ...(editVersion.value ? { version: editVersion.value } : {}),
      },
    })
    initialData.value = {
      ...res.frontmatter,
      body: res.body,
    }
    // The file on disk changed, so mark as unpublished
    unpublishedChanges.value = true
  } catch (err: any) {
    loadError.value = err.data?.message || err.message || 'Failed to reload content after version creation'
  }
}

/**
 * Background sync check — determines whether the locally saved
 * content differs from GitHub so the Publish button stays active
 * even when the form itself has no unsaved edits.
 */
async function checkUnpublishedChanges() {
  try {
    const result = await checkSync(collectionName.value, slug.value, editVersion.value)
    // Any status other than 'in-sync' means there are unpublished changes
    unpublishedChanges.value = result.status !== 'in-sync'
  } catch {
    // If the check fails (e.g. no token), don't block the user
    unpublishedChanges.value = false
  }
}

// Load the existing content (frontmatter is parsed server-side to avoid
// gray-matter's Node.js Buffer dependency in the browser)
onMounted(async () => {
  try {
    // Ensure auth session is restored before making API calls
    await restoreSession()
    const token = getToken()
    const res = await $fetch<{ frontmatter: Record<string, any>; body: string }>('/api/cms/content/read', {
      params: {
        collection: collectionName.value,
        slug: slug.value,
        ...(token ? { token } : {}),
        ...(editVersion.value ? { version: editVersion.value } : {}),
      },
    })

    initialData.value = {
      ...res.frontmatter,
      body: res.body,
    }

    // Run a background sync check so the Publish button reflects
    // whether saved-but-unpublished changes exist.
    if (isLocalBackend.value) {
      checkUnpublishedChanges()
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
      ...(editVersion.value ? { version: editVersion.value } : {}),
    })
    showSuccess.value = true

    // Update initialData so the form's isDirty resets to false after
    // "Continue Editing" — the form data now matches what's on disk.
    initialData.value = {
      ...data.frontmatter,
      body: data.body,
    }

    // After a local save, the file now differs from GitHub,
    // so the Publish button should stay active.
    if (isLocalBackend.value) {
      unpublishedChanges.value = true
    }
  } catch {
    // Error is captured in the composable
  }
}

/**
 * Publish handler — runs a sync check first, then either
 * publishes directly or shows a conflict dialog.
 */
async function handlePublish(data: { frontmatter: Record<string, any>; body: string; publishMode?: 'draft' | 'direct' }) {
  // Save the data in case we need it after the conflict dialog
  pendingPublish.value = data

  try {
    const check = await prePublishCheck(collectionName.value, slug.value, editVersion.value)

    if (check.safe) {
      // No conflict — publish immediately
      await doPublish(data)
    } else {
      // Conflict detected — show dialog
      showSyncDialog.value = true
    }
  } catch {
    // Sync check failed — show dialog so user can decide
    showSyncDialog.value = true
  }
}

/** Actually push to GitHub (called directly or after force-publish) */
async function doPublish(data: { frontmatter: Record<string, any>; body: string; publishMode?: 'draft' | 'direct' }) {
  try {
    await publishToGitHub({
      collection: collectionName.value,
      slug: slug.value,
      frontmatter: data.frontmatter,
      body: data.body,
      isNew: false,
      publishMode: data.publishMode,
      ...(editVersion.value ? { version: editVersion.value } : {}),
    })
    showSuccess.value = true
    showSyncDialog.value = false
    pendingPublish.value = null
    // Content is now on GitHub — clear the unpublished flag
    unpublishedChanges.value = false
  } catch {
    // Error is captured in the composable
  }
}

/** Force publish — user chose to overwrite despite conflict */
async function handleForcePublish() {
  if (pendingPublish.value) {
    await doPublish(pendingPublish.value)
  }
}

/** Pull from GitHub — discard local, reload with remote content */
async function handlePull() {
  const success = await pullFromGitHub(collectionName.value, slug.value, editVersion.value)
  if (success) {
    showSyncDialog.value = false
    pendingPublish.value = null

    // Reload the content from the (now-updated) local file
    try {
      const token = getToken()
      const res = await $fetch<{ frontmatter: Record<string, any>; body: string }>('/api/cms/content/read', {
        params: {
          collection: collectionName.value,
          slug: slug.value,
          ...(token ? { token } : {}),
          ...(editVersion.value ? { version: editVersion.value } : {}),
        },
      })
      initialData.value = {
        ...res.frontmatter,
        body: res.body,
      }
    } catch (err: any) {
      loadError.value = err.data?.message || err.message || 'Failed to reload content after pull'
    }
  }
}

function handleSyncCancel() {
  showSyncDialog.value = false
  pendingPublish.value = null
}

/** Open the conflict resolver UI */
function handleResolveOpen() {
  showSyncDialog.value = false
  showResolver.value = true
}

/** Handle the merged result from the conflict resolver */
async function handleResolved(merged: { frontmatter: Record<string, any>; body: string }) {
  showResolver.value = false

  // Update the form with the merged content
  initialData.value = {
    ...merged.frontmatter,
    body: merged.body,
  }

  // Save merged version locally first
  try {
    await save({
      collection: collectionName.value,
      slug: slug.value,
      frontmatter: merged.frontmatter,
      body: merged.body,
      isNew: false,
      ...(editVersion.value ? { version: editVersion.value } : {}),
    })
  } catch {
    // Error captured in composable — the form data is already updated
    // so the user can still manually retry
    return
  }

  // Now publish the resolved version to GitHub
  try {
    await publishToGitHub({
      collection: collectionName.value,
      slug: slug.value,
      frontmatter: merged.frontmatter,
      body: merged.body,
      isNew: false,
      publishMode: pendingPublish.value?.publishMode,
      ...(editVersion.value ? { version: editVersion.value } : {}),
    })
    showSuccess.value = true
    pendingPublish.value = null
  } catch {
    // Error captured in composable
  }
}

function handleResolverCancel() {
  showResolver.value = false
  // Re-open the sync dialog so the user can choose another option
  showSyncDialog.value = true
}

/**
 * Discard all local changes — revert the file to its last committed (GitHub) state.
 * Calls the discard API and reloads the content from disk.
 */
async function handleDiscard() {
  discarding.value = true
  discardError.value = null

  try {
    // Construct the file path: content/{collection}/{slug}/index.md
    // or content/{collection}/{slug}/v/{version}.md for archived versions
    const col = collection.value
    const folder = col?.folder ?? `content/${collectionName.value}`
    const ext = col?.extension ?? 'md'
    let filePath: string
    if (editVersion.value) {
      filePath = `${folder}/${slug.value}/v/${editVersion.value}.${ext}`
    } else {
      const pathPattern = col?.path ?? '{{slug}}/index'
      filePath = `${folder}/${pathPattern.replace('{{slug}}', slug.value)}.${ext}`
    }

    await $fetch('/api/cms/content/discard', {
      method: 'POST',
      body: {
        files: [{ path: filePath, status: 'modified' }],
      },
    })

    // Reload content from the now-reverted file
    const token = getToken()
    const res = await $fetch<{ frontmatter: Record<string, any>; body: string }>('/api/cms/content/read', {
      params: {
        collection: collectionName.value,
        slug: slug.value,
        ...(token ? { token } : {}),
        ...(editVersion.value ? { version: editVersion.value } : {}),
      },
    })
    initialData.value = {
      ...res.frontmatter,
      body: res.body,
    }
    unpublishedChanges.value = false
  } catch (err: any) {
    discardError.value = err.data?.message || err.message || 'Failed to discard changes'
  } finally {
    discarding.value = false
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
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold tracking-tight">
          Edit: {{ initialData?.title || slug }}
        </h1>

        <!-- Create Version button (only for collections with version field, not when editing archived version) -->
        <button
          v-if="hasVersionField && !editVersion && initialData && !loading && !showSuccess"
          type="button"
          @click="showVersionDialog = true"
          class="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
          title="Create a new version of this content"
        >
          <GitBranch class="h-4 w-4" />
          <span class="hidden sm:inline">v{{ currentVersion }}</span>
        </button>
      </div>
    </div>

    <!-- Archived Version Banner -->
    <div
      v-if="editVersion"
      class="mb-6 flex items-start gap-3 rounded-lg border border-amber-500/50 bg-amber-500/5 p-4"
    >
      <Archive class="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div>
        <p class="font-medium text-amber-600 dark:text-amber-400">
          Editing archived version v{{ editVersion }}
        </p>
        <p class="mt-0.5 text-sm text-muted-foreground">
          This is a historical snapshot. Changes will be saved to the archived version file.
          <NuxtLink
            :to="`/cms/${collectionName}/${slug}`"
            class="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            Edit latest version instead
          </NuxtLink>
        </p>
      </div>
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
              Changes have been saved locally. Use the <strong>Publish to GitHub</strong> button to push changes to the repository.
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

    <!-- Discard Error -->
    <div
      v-if="discardError && !showSuccess"
      class="mb-6 flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-4"
    >
      <AlertCircle class="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <p class="text-sm text-destructive">{{ discardError }}</p>
    </div>

    <!-- Form -->
    <CmsCollectionForm
      v-if="collection?.fields && initialData && !showSuccess"
      :collection="collection"
      :initial-data="initialData"
      :is-new="false"
      :saving="saving"
      :publishing="publishing"
      :editorial-workflow="isEditorial"
      :local-backend="isLocalBackend"
      :unpublished-changes="unpublishedChanges"
      :discarding="discarding"
      @submit="handleSubmit"
      @publish="handlePublish"
      @discard="handleDiscard"
    />

    <!-- Sync Conflict Dialog -->
    <CmsSyncConflictDialog
      v-model:open="showSyncDialog"
      :sync-status="String(syncStatus)"
      :sync-message="String(syncMessage)"
      :pulling="pulling"
      :publishing="publishing"
      :can-resolve="!!(localVersion && remoteVersion)"
      @force-publish="handleForcePublish"
      @pull="handlePull"
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

    <!-- Create Version Dialog -->
    <CmsCreateVersionDialog
      v-if="hasVersionField"
      v-model:open="showVersionDialog"
      :collection="collectionName"
      :slug="slug"
      :current-version="currentVersion"
      @version-created="handleVersionCreated"
    />
  </div>
</template>
