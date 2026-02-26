<script setup lang="ts">
/**
 * Drafts page — Lists all open draft PRs created by the CMS.
 *
 * Shows each draft with its status, collection, timestamp,
 * and actions to publish (merge) or discard (close + delete branch).
 */
import {
  GitPullRequest, ChevronLeft, RefreshCw, CheckCircle,
  XCircle, ExternalLink, Clock, Loader2, AlertCircle,
  Trash2, Upload, FileEdit, Eye,
} from 'lucide-vue-next'

definePageMeta({
  layout: 'cms',
  middleware: ['cms-auth'],
})

useHead({ title: 'Drafts – CMS' })

const { drafts, loading, error, actionLoading, fetchDrafts, publishDraft, discardDraft } = useCmsDrafts()
const { isLocalBackend } = useCmsSave()

// Action state
const actionError = ref<string | null>(null)
const actionSuccess = ref<string | null>(null)
const confirmAction = ref<{ type: 'publish' | 'discard'; prNumber: number; title: string } | null>(null)

onMounted(() => {
  if (!isLocalBackend.value) {
    fetchDrafts()
  }
})

async function handlePublish(prNumber: number) {
  actionError.value = null
  actionSuccess.value = null
  confirmAction.value = null
  try {
    await publishDraft(prNumber)
    actionSuccess.value = 'Draft published successfully!'
    setTimeout(() => { actionSuccess.value = null }, 5000)
  } catch (err: any) {
    actionError.value = err.message
  }
}

async function handleDiscard(prNumber: number) {
  actionError.value = null
  actionSuccess.value = null
  confirmAction.value = null
  try {
    await discardDraft(prNumber)
    actionSuccess.value = 'Draft discarded'
    setTimeout(() => { actionSuccess.value = null }, 5000)
  } catch (err: any) {
    actionError.value = err.message
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function getStatusColor(draft: any): string {
  if (draft.reviewStatus === 'approved') return 'text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400'
  if (draft.reviewStatus === 'changes_requested') return 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400'
  if (draft.draft) return 'text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400'
  return 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400'
}

function getStatusLabel(draft: any): string {
  if (draft.reviewStatus === 'approved') return 'Approved'
  if (draft.reviewStatus === 'changes_requested') return 'Changes Requested'
  if (draft.draft) return 'Draft'
  return 'In Review'
}
</script>

<template>
  <div class="p-6 md:p-8">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Drafts</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Manage unpublished content changes and editorial workflow.
        </p>
      </div>
      <button
        v-if="!isLocalBackend"
        @click="fetchDrafts"
        :disabled="loading"
        class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent"
      >
        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
        Refresh
      </button>
    </div>

    <!-- Local backend notice -->
    <div
      v-if="isLocalBackend"
      class="flex flex-col items-center justify-center rounded-lg border py-12 text-center"
    >
      <FileEdit class="mb-3 h-12 w-12 text-muted-foreground/30" />
      <h2 class="text-lg font-medium">Local Development Mode</h2>
      <p class="mt-1 max-w-md text-sm text-muted-foreground">
        Drafts and editorial workflow are only available when connected to GitHub.
        In local mode, all changes save directly to the filesystem.
      </p>
    </div>

    <template v-else>
      <!-- Success message -->
      <div
        v-if="actionSuccess"
        class="mb-4 flex items-center gap-2 rounded-lg border border-green-500/50 bg-green-500/5 px-4 py-3 text-sm text-green-600 dark:text-green-400"
      >
        <CheckCircle class="h-4 w-4" />
        {{ actionSuccess }}
      </div>

      <!-- Error messages -->
      <div
        v-if="actionError || error"
        class="mb-4 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm text-destructive"
      >
        <AlertCircle class="h-4 w-4" />
        {{ actionError || error }}
        <button @click="actionError = null; " class="ml-auto text-xs underline">Dismiss</button>
      </div>

      <!-- Loading -->
      <div v-if="loading && drafts.length === 0" class="flex items-center justify-center py-16">
        <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
      </div>

      <!-- Empty state -->
      <div
        v-else-if="!loading && drafts.length === 0"
        class="flex flex-col items-center justify-center rounded-lg border py-12 text-center"
      >
        <GitPullRequest class="mb-3 h-12 w-12 text-muted-foreground/30" />
        <h2 class="text-lg font-medium">No Drafts</h2>
        <p class="mt-1 max-w-md text-sm text-muted-foreground">
          When you save content as a draft, it will create a pull request on GitHub
          that appears here for review and publishing.
        </p>
      </div>

      <!-- Draft list -->
      <div v-else class="space-y-3">
        <div
          v-for="draft in drafts"
          :key="draft.number"
          class="group rounded-lg border transition-colors hover:border-primary/30"
        >
          <div class="flex items-start gap-4 p-4">
            <!-- Icon -->
            <div class="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/30">
              <GitPullRequest class="h-5 w-5 text-blue-500" />
            </div>

            <!-- Content -->
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <h3 class="font-medium">{{ draft.title }}</h3>
                <span
                  :class="['rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(draft)]"
                >
                  {{ getStatusLabel(draft) }}
                </span>
              </div>

              <div class="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span class="rounded bg-muted px-1.5 py-0.5">{{ draft.collection }}</span>
                <span class="flex items-center gap-1">
                  <Clock class="h-3 w-3" />
                  {{ relativeTime(draft.updatedAt) }}
                </span>
                <span>#{{ draft.number }}</span>
                <span>by {{ draft.user.login }}</span>
              </div>

              <!-- Labels -->
              <div v-if="draft.labels.length > 0" class="mt-2 flex flex-wrap gap-1">
                <span
                  v-for="label in draft.labels"
                  :key="label"
                  class="rounded bg-muted px-1.5 py-0.5 text-xs"
                >
                  {{ label }}
                </span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2">
              <!-- View on GitHub -->
              <a
                :href="draft.url"
                target="_blank"
                class="rounded-md border p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="View on GitHub"
              >
                <ExternalLink class="h-4 w-4" />
              </a>

              <!-- Edit draft -->
              <NuxtLink
                :to="`/cms/${draft.collection}/edit/${draft.slug}`"
                class="rounded-md border p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Continue editing"
              >
                <Eye class="h-4 w-4" />
              </NuxtLink>

              <!-- Publish (merge) -->
              <button
                @click="confirmAction = { type: 'publish', prNumber: draft.number, title: draft.title }"
                :disabled="actionLoading === draft.number"
                class="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                title="Publish (merge to main)"
              >
                <Loader2 v-if="actionLoading === draft.number" class="h-3.5 w-3.5 animate-spin" />
                <Upload v-else class="h-3.5 w-3.5" />
                Publish
              </button>

              <!-- Discard -->
              <button
                @click="confirmAction = { type: 'discard', prNumber: draft.number, title: draft.title }"
                :disabled="actionLoading === draft.number"
                class="rounded-md border border-red-200 p-2 text-red-500 transition-colors hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30 disabled:opacity-50"
                title="Discard draft"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Confirmation modal -->
    <Teleport to="body">
      <div v-if="confirmAction" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="confirmAction = null" />
        <div class="relative z-10 mx-4 w-full max-w-sm rounded-lg border bg-background p-6 shadow-xl">
          <h3 class="mb-2 text-lg font-semibold">
            {{ confirmAction.type === 'publish' ? 'Publish Draft?' : 'Discard Draft?' }}
          </h3>
          <p class="mb-1 text-sm text-muted-foreground">
            <template v-if="confirmAction.type === 'publish'">
              This will merge the changes into the main branch and publish them.
            </template>
            <template v-else>
              This will close the pull request and delete the draft branch. This action cannot be undone.
            </template>
          </p>
          <p class="mb-4 truncate rounded bg-muted px-2 py-1 text-xs font-medium">
            {{ confirmAction.title }}
          </p>
          <div class="flex justify-end gap-2">
            <button
              @click="confirmAction = null"
              class="rounded-md border px-4 py-2 text-sm hover:bg-accent"
            >
              Cancel
            </button>
            <button
              v-if="confirmAction.type === 'publish'"
              @click="handlePublish(confirmAction.prNumber)"
              class="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
            >
              Publish
            </button>
            <button
              v-else
              @click="handleDiscard(confirmAction.prNumber)"
              class="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
            >
              Discard
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
