<script setup lang="ts">
/**
 * BatchPublishDialog — Shows all local changes that differ from GitHub,
 * lets the user select which to publish, and pushes them in one commit.
 *
 * Designed for the workflow where a user works offline/locally, makes
 * many edits, then wants to push everything at once.
 */
import {
  Upload, Loader2, RefreshCw, Check, X,
  FilePlus, FileDiff, FileX, GitPullRequest,
  ChevronDown, CheckCircle, ExternalLink, GitBranch,
  AlertCircle, Package, Eye, Undo2,
} from 'lucide-vue-next'
import type { VersionFileEntry } from './VersionProtectionDialog.vue'

const props = defineProps<{
  open: boolean
  /** Limit scan to specific collections (omit to scan all) */
  collections?: string[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const {
  changes,
  scanning,
  publishing,
  discarding,
  scanError,
  publishError,
  discardError,
  lastResult,
  summary,
  hasChanges,
  hasSelection,
  scanChanges,
  publishSelected,
  toggleSelection,
  selectAll,
  discardChange,
  branchInfo,
  fetchingBranchInfo,
  fetchBranchInfo,
} = useBatchPublish()

// Computed branch display helpers
const currentBranch = computed(() => branchInfo.value?.currentBranch ?? 'main')
const isDefaultBranch = computed(() => branchInfo.value?.isDefaultBranch ?? true)
const existingPrUrl = computed(() => branchInfo.value?.prUrl)
const existingPrNumber = computed(() => branchInfo.value?.prNumber)

// Dropdown for publish mode
const showModeDropdown = ref(false)

// Discard confirmation state — stores the path of the item awaiting confirmation
const confirmDiscardPath = ref<string | null>(null)

// ═══ Version protection state ═══
const VERSION_FILE_PATTERN = /\/v\/\d+\.\d+\.\d+\.md$/
const showVersionProtection = ref(false)
const pendingPublishMode = ref<'direct' | 'draft'>('direct')

/** Detect selected version snapshot files that are being modified */
const selectedVersionFiles = computed<VersionFileEntry[]>(() => {
  return changes.value
    .filter(c => c.selected && c.status === 'modified' && VERSION_FILE_PATTERN.test(c.path))
    .map(c => ({
      path: c.path,
      title: c.title,
      collection: c.collection,
      slug: c.slug,
    }))
})

async function handleDiscard(path: string) {
  confirmDiscardPath.value = null
  await discardChange(path)
}

// Start scanning when dialog opens
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      fetchBranchInfo()
      if (!scanning.value && changes.value.length === 0) {
        scanChanges(props.collections)
      }
    }
  },
)

function close() {
  emit('update:open', false)
}

async function handlePublishDirect() {
  showModeDropdown.value = false
  // Check for version file modifications before publishing
  if (selectedVersionFiles.value.length > 0) {
    pendingPublishMode.value = 'direct'
    showVersionProtection.value = true
    return
  }
  await publishSelected({ publishMode: 'direct' })
}

async function handlePublishPR() {
  showModeDropdown.value = false
  // Check for version file modifications before publishing
  if (selectedVersionFiles.value.length > 0) {
    pendingPublishMode.value = 'draft'
    showVersionProtection.value = true
    return
  }
  await publishSelected({ publishMode: 'draft' })
}

/** Called when user confirms the version protection override */
async function handleVersionOverride() {
  showVersionProtection.value = false
  await publishSelected({ publishMode: pendingPublishMode.value })
}

function handleVersionCancel() {
  showVersionProtection.value = false
}

function statusIcon(status: string) {
  switch (status) {
    case 'modified': return FileDiff
    case 'added': return FilePlus
    case 'deleted': return FileX
    default: return FileDiff
  }
}

function statusColor(status: string) {
  switch (status) {
    case 'modified': return 'text-yellow-600 dark:text-yellow-400'
    case 'added': return 'text-green-600 dark:text-green-400'
    case 'deleted': return 'text-red-600 dark:text-red-400'
    default: return 'text-muted-foreground'
  }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'modified': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
    case 'added': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
    case 'deleted': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    default: return 'bg-muted text-muted-foreground'
  }
}
</script>

<template>
  <UiDialog :open="open" @update:open="(val: boolean) => { if (!val) close() }">
    <UiDialogContent class="sm:max-w-2xl max-h-[85vh] flex flex-col">
      <UiDialogHeader>
        <UiDialogTitle class="flex items-center gap-2">
          <Package class="h-5 w-5 text-primary" />
          Publish Changes to GitHub
        </UiDialogTitle>
        <UiDialogDescription class="flex items-center gap-1.5">
          <GitBranch class="h-3.5 w-3.5 shrink-0" />
          <span v-if="fetchingBranchInfo" class="text-muted-foreground/60">Detecting branch...</span>
          <span v-else>Branch: <code class="rounded bg-muted px-1 py-0.5 text-xs font-mono">{{ currentBranch }}</code></span>
        </UiDialogDescription>
      </UiDialogHeader>

      <!-- ═══ Success state ═══ -->
      <div v-if="lastResult" class="space-y-4 py-4">
        <div class="flex items-start gap-3 rounded-lg border border-green-500/30 bg-green-500/5 p-4">
          <CheckCircle class="mt-0.5 h-5 w-5 text-green-600 dark:text-green-400" />
          <div>
            <p class="text-sm font-medium text-green-600 dark:text-green-400">
              Successfully published {{ lastResult.fileCount }}
              {{ lastResult.fileCount === 1 ? 'file' : 'files' }}
            </p>
            <p class="mt-1 text-xs text-muted-foreground">
              <template v-if="lastResult.mode === 'editorial'">
                A pull request has been created for review.
              </template>
              <template v-else>
                All changes have been committed to <code class="rounded bg-muted px-1">{{ lastResult.branch }}</code>.
              </template>
            </p>

            <div class="mt-3 flex items-center gap-2">
              <a
                v-if="lastResult.prUrl"
                :href="lastResult.prUrl"
                target="_blank"
                class="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                <ExternalLink class="h-3 w-3" />
                View Pull Request
              </a>
              <button
                type="button"
                @click="close"
                class="rounded-md border px-3 py-1.5 text-xs transition-colors hover:bg-accent"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        <!-- Remaining changes (if any) -->
        <div v-if="changes.length > 0" class="text-xs text-muted-foreground">
          {{ changes.length }} more {{ changes.length === 1 ? 'change remains' : 'changes remain' }} unpublished.
          <button type="button" @click="() => { /* reset result to show list */ }" class="underline hover:text-foreground">
            View remaining
          </button>
        </div>
      </div>

      <!-- ═══ Scanning state ═══ -->
      <div v-else-if="scanning" class="flex flex-col items-center gap-3 py-12">
        <Loader2 class="h-8 w-8 animate-spin text-primary" />
        <p class="text-sm text-muted-foreground">Scanning for local changes...</p>
        <p class="text-xs text-muted-foreground">Comparing your local files with GitHub</p>
      </div>

      <!-- ═══ Scan error ═══ -->
      <div v-else-if="scanError" class="space-y-4 py-4">
        <div class="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle class="mt-0.5 h-5 w-5 text-destructive" />
          <div>
            <p class="text-sm font-medium text-destructive">Failed to scan for changes</p>
            <p class="mt-1 text-xs text-muted-foreground">{{ scanError }}</p>
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            @click="scanChanges(collections)"
            class="flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-accent"
          >
            <RefreshCw class="h-3.5 w-3.5" />
            Retry
          </button>
          <button
            type="button"
            @click="close"
            class="rounded-md border px-3 py-2 text-sm hover:bg-accent"
          >
            Cancel
          </button>
        </div>
      </div>

      <!-- ═══ No changes ═══ -->
      <div v-else-if="!hasChanges" class="flex flex-col items-center gap-3 py-12">
        <Check class="h-8 w-8 text-green-500" />
        <p class="text-sm font-medium">Everything is up to date</p>
        <p class="text-xs text-muted-foreground">
          Your local files match what's on GitHub. No changes to publish.
        </p>
        <div class="mt-2 flex items-center gap-2">
          <button
            type="button"
            @click="scanChanges(collections)"
            class="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
          >
            <RefreshCw class="h-3 w-3" />
            Re-scan
          </button>
          <button
            type="button"
            @click="close"
            class="rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
          >
            Close
          </button>
        </div>
      </div>

      <!-- ═══ Changes list ═══ -->
      <template v-else>
        <!-- Summary bar -->
        <div class="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2">
          <div class="flex items-center gap-3 text-xs">
            <span v-if="summary.modified" class="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
              <FileDiff class="h-3.5 w-3.5" />
              {{ summary.modified }} modified
            </span>
            <span v-if="summary.added" class="flex items-center gap-1 text-green-600 dark:text-green-400">
              <FilePlus class="h-3.5 w-3.5" />
              {{ summary.added }} new
            </span>
            <span v-if="summary.deleted" class="flex items-center gap-1 text-red-600 dark:text-red-400">
              <FileX class="h-3.5 w-3.5" />
              {{ summary.deleted }} deleted
            </span>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="selectAll(true)"
              class="text-xs text-primary hover:underline"
            >
              Select all
            </button>
            <span class="text-muted-foreground">·</span>
            <button
              type="button"
              @click="selectAll(false)"
              class="text-xs text-muted-foreground hover:underline"
            >
              Deselect all
            </button>
          </div>
        </div>

        <!-- Scrollable file list -->
        <UiScrollArea class="flex-1 -mx-6 max-h-[45vh]">
          <div class="divide-y px-6">
            <div
              v-for="change in changes"
              :key="change.path"
              class="group flex items-center gap-3 py-3 transition-colors hover:bg-muted/20"
              :class="{ 'opacity-50': change.status === 'deleted' }"
            >
              <!-- Checkbox -->
              <label class="flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  :checked="change.selected"
                  :disabled="change.status === 'deleted'"
                  @change="toggleSelection(change.path)"
                  class="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
              </label>

              <!-- Status icon -->
              <component
                :is="statusIcon(change.status)"
                class="h-4 w-4 shrink-0"
                :class="statusColor(change.status)"
              />

              <!-- File info -->
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="truncate text-sm font-medium">
                    {{ change.title || change.slug }}
                  </span>
                  <span
                    class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
                    :class="statusBadgeClass(change.status)"
                  >
                    {{ change.status }}
                  </span>
                </div>
                <p class="truncate text-xs text-muted-foreground">
                  {{ change.collection }} / {{ change.slug }}
                </p>
              </div>

              <!-- View button (appears on hover) -->
              <NuxtLink
                v-if="change.status !== 'deleted'"
                :to="`/cms/${change.collection}/edit/${change.slug}`"
                @click.stop
                class="shrink-0 rounded-md border p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
                title="View / Edit"
              >
                <Eye class="h-3.5 w-3.5" />
              </NuxtLink>

              <!-- Discard button (appears on hover) -->
              <button
                v-if="confirmDiscardPath !== change.path"
                type="button"
                @click.stop="confirmDiscardPath = change.path"
                :disabled="discarding"
                class="shrink-0 rounded-md border p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 disabled:opacity-50"
                title="Discard changes"
              >
                <Undo2 class="h-3.5 w-3.5" />
              </button>

              <!-- Discard confirmation inline -->
              <div
                v-if="confirmDiscardPath === change.path"
                class="flex shrink-0 items-center gap-1"
              >
                <button
                  type="button"
                  @click.stop="handleDiscard(change.path)"
                  :disabled="discarding"
                  class="rounded-md bg-destructive px-2 py-1 text-[11px] font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                >
                  <Loader2 v-if="discarding" class="h-3 w-3 animate-spin" />
                  <span v-else>Discard</span>
                </button>
                <button
                  type="button"
                  @click.stop="confirmDiscardPath = null"
                  class="rounded-md border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </UiScrollArea>

        <!-- Publish error -->
        <div
          v-if="publishError"
          class="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3"
        >
          <AlertCircle class="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p class="text-xs text-destructive">{{ publishError }}</p>
        </div>

        <!-- Discard error -->
        <div
          v-if="discardError"
          class="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3"
        >
          <AlertCircle class="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p class="text-xs text-destructive">{{ discardError }}</p>
        </div>

        <!-- Action bar -->
        <div class="flex items-center justify-between gap-3 border-t pt-4">
          <p class="text-xs text-muted-foreground">
            {{ summary.selected }} of {{ summary.total }} selected
          </p>

          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="scanChanges(collections)"
              :disabled="scanning || publishing"
              class="flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent disabled:opacity-50"
            >
              <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': scanning }" />
              Re-scan
            </button>

            <!-- Publish split button -->
            <div class="flex items-center">
              <button
                type="button"
                @click="handlePublishDirect"
                :disabled="!hasSelection || publishing"
                class="flex items-center gap-2 rounded-l-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <Loader2 v-if="publishing" class="h-4 w-4 animate-spin" />
                <Upload v-else class="h-4 w-4" />
                {{ publishing
                  ? 'Publishing...'
                  : `Publish ${summary.selected} ${summary.selected === 1 ? 'file' : 'files'}`
                }}
              </button>

              <div class="relative">
                <button
                  type="button"
                  @click="showModeDropdown = !showModeDropdown"
                  :disabled="!hasSelection || publishing"
                  class="rounded-r-md border-l border-primary-foreground/20 bg-primary px-2 py-2 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  <ChevronDown class="h-4 w-4" />
                </button>

                <div
                  v-if="showModeDropdown"
                  class="absolute bottom-full right-0 mb-2 w-52 rounded-md border bg-popover p-1 shadow-lg"
                >
                  <button
                    type="button"
                    @click="handlePublishDirect"
                    class="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
                  >
                    <Upload class="h-4 w-4" />
                    Commit to <code class="font-mono text-xs">{{ currentBranch }}</code>
                  </button>
                  <!-- View PR link if PR already open -->
                  <a
                    v-if="existingPrUrl"
                    :href="existingPrUrl"
                    target="_blank"
                    class="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent text-primary"
                    @click="showModeDropdown = false"
                  >
                    <ExternalLink class="h-4 w-4" />
                    View open PR #{{ existingPrNumber }}
                  </a>
                  <!-- Create PR button: disabled if on default branch or PR already exists -->
                  <button
                    v-else
                    type="button"
                    @click="handlePublishPR"
                    :disabled="isDefaultBranch"
                    class="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
                    :title="isDefaultBranch ? 'Switch to a feature branch to create a PR' : 'Commit and open a pull request'"
                  >
                    <GitPullRequest class="h-4 w-4" />
                    Create Pull Request
                    <span v-if="isDefaultBranch" class="ml-auto text-xs text-muted-foreground">on main</span>
                  </button>
                </div>
              </div>

              <Teleport to="body">
                <div
                  v-if="showModeDropdown"
                  class="fixed inset-0 z-9"
                  @click="showModeDropdown = false"
                />
              </Teleport>
            </div>
          </div>
        </div>
      </template>
    </UiDialogContent>
  </UiDialog>

  <!-- Version Protection Warning -->
  <CmsVersionProtectionDialog
    v-model:open="showVersionProtection"
    :version-files="selectedVersionFiles"
    @confirm="handleVersionOverride"
    @cancel="handleVersionCancel"
  />
</template>
