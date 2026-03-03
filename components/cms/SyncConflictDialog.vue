<script setup lang="ts">
/**
 * SyncConflictDialog — Shown when local and GitHub versions of a file diverge.
 *
 * Gives the user three options:
 * 1. Force Publish — overwrite GitHub with local version
 * 2. Pull from GitHub — discard local changes and use remote version
 * 3. Cancel — abort and keep editing
 */
import {
  AlertTriangle, Upload, Download, X, Loader2,
  GitCompareArrows, CheckCircle, Merge,
} from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  syncStatus: string
  syncMessage: string
  pulling?: boolean
  publishing?: boolean
  /** Whether parsed content is available for conflict resolution */
  canResolve?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'force-publish': []
  'pull': []
  'resolve': []
  'cancel': []
}>()

function close() {
  emit('update:open', false)
  emit('cancel')
}
</script>

<template>
  <UiDialog :open="open" @update:open="(val: boolean) => { if (!val) close() }">
    <UiDialogContent class="sm:max-w-lg">
      <UiDialogHeader>
        <UiDialogTitle class="flex items-center gap-2">
          <AlertTriangle class="h-5 w-5 text-yellow-500" />
          Sync Conflict Detected
        </UiDialogTitle>
        <UiDialogDescription>
          {{ syncMessage }}
        </UiDialogDescription>
      </UiDialogHeader>

      <div class="space-y-4 py-4">
        <!-- Status indicator -->
        <div
          class="flex items-start gap-3 rounded-lg border bg-muted/30 p-4"
        >
          <GitCompareArrows class="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
          <div class="text-sm">
            <template v-if="syncStatus === 'diverged'">
              <p class="font-medium">Local and GitHub versions have different content.</p>
              <p class="mt-1 text-muted-foreground">
                This can happen when changes were made directly on GitHub (or by another contributor)
                while you were editing locally.
              </p>
            </template>
            <template v-else-if="syncStatus === 'remote-only'">
              <p class="font-medium">This file only exists on GitHub.</p>
              <p class="mt-1 text-muted-foreground">
                Pull it from GitHub to start editing locally.
              </p>
            </template>
            <template v-else-if="syncStatus === 'error'">
              <p class="font-medium">Could not check sync status.</p>
              <p class="mt-1 text-muted-foreground">
                This might be an authentication issue. You can still attempt to publish,
                but be aware it may overwrite remote changes.
              </p>
            </template>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="flex flex-col gap-2">
          <!-- Force Publish -->
          <button
            v-if="syncStatus !== 'remote-only'"
            type="button"
            :disabled="publishing || pulling"
            @click="emit('force-publish')"
            class="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-left transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50"
          >
            <div class="flex h-9 w-9 items-center justify-center rounded-md bg-destructive/10">
              <Loader2 v-if="publishing" class="h-4 w-4 animate-spin text-destructive" />
              <Upload v-else class="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p class="text-sm font-medium">
                {{ publishing ? 'Publishing...' : 'Force Publish' }}
              </p>
              <p class="text-xs text-muted-foreground">
                Overwrite the GitHub version with your local changes
              </p>
            </div>
          </button>

          <!-- Resolve Differences (preferred option when available) -->
          <button
            v-if="canResolve && syncStatus === 'diverged'"
            type="button"
            :disabled="publishing || pulling"
            @click="emit('resolve')"
            class="flex items-center gap-3 rounded-lg border-2 border-primary/40 bg-primary/5 p-3 text-left transition-colors hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-50"
          >
            <div class="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
              <Merge class="h-4 w-4 text-primary" />
            </div>
            <div>
              <p class="text-sm font-medium text-primary">
                Resolve Differences
              </p>
              <p class="text-xs text-muted-foreground">
                Compare both versions side-by-side and choose which parts to keep
              </p>
            </div>
          </button>

          <!-- Pull from GitHub -->
          <button
            type="button"
            :disabled="publishing || pulling"
            @click="emit('pull')"
            class="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
          >
            <div class="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
              <Loader2 v-if="pulling" class="h-4 w-4 animate-spin text-primary" />
              <Download v-else class="h-4 w-4 text-primary" />
            </div>
            <div>
              <p class="text-sm font-medium">
                {{ pulling ? 'Pulling...' : 'Pull from GitHub' }}
              </p>
              <p class="text-xs text-muted-foreground">
                Discard local changes and use the GitHub version
              </p>
            </div>
          </button>

          <!-- Cancel -->
          <button
            type="button"
            :disabled="publishing || pulling"
            @click="close"
            class="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
          >
            <div class="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
              <X class="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p class="text-sm font-medium">Cancel</p>
              <p class="text-xs text-muted-foreground">
                Go back to editing without any changes
              </p>
            </div>
          </button>
        </div>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>
