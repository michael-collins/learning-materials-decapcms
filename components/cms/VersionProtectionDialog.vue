<script setup lang="ts">
/**
 * VersionProtectionDialog — Shows a serious warning when the user attempts
 * to publish modifications to archived version snapshot files (v/*.md).
 *
 * These files represent stable, immutable versions that other users may
 * depend on. Modifying them is destructive and should be intentional.
 */
import { ShieldAlert, AlertTriangle, FileWarning, X } from 'lucide-vue-next'

export interface VersionFileEntry {
  path: string
  title?: string
  collection: string
  slug: string
}

const props = defineProps<{
  open: boolean
  /** The version files that are about to be modified */
  versionFiles: VersionFileEntry[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  /** User confirmed override — proceed with publish */
  'confirm': []
  /** User cancelled — do not publish */
  'cancel': []
}>()

const confirmText = ref('')
const REQUIRED_TEXT = 'OVERRIDE'

const isConfirmed = computed(() => confirmText.value.trim() === REQUIRED_TEXT)

function handleCancel() {
  confirmText.value = ''
  emit('cancel')
  emit('update:open', false)
}

function handleOverride() {
  if (!isConfirmed.value) return
  confirmText.value = ''
  emit('confirm')
  emit('update:open', false)
}

// Reset when dialog closes
watch(() => props.open, (open) => {
  if (!open) {
    confirmText.value = ''
  }
})

/**
 * Extract a readable version label from a path like
 * content/articles/my-article/v/1.0.0.md → v1.0.0
 */
function extractVersionLabel(path: string): string {
  const match = path.match(/\/v\/(\d+\.\d+\.\d+)\.md$/)
  return match ? `v${match[1]}` : path
}
</script>

<template>
  <UiDialog :open="open" @update:open="(val: boolean) => { if (!val) handleCancel() }">
    <UiDialogContent class="sm:max-w-lg border-destructive/50">
      <!-- Red warning header -->
      <div class="flex flex-col items-center gap-3 pb-2 pt-2">
        <div class="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert class="h-7 w-7 text-destructive" />
        </div>
        <UiDialogHeader class="text-center">
          <UiDialogTitle class="text-destructive text-lg">
            Protected Version Files Detected
          </UiDialogTitle>
        </UiDialogHeader>
      </div>

      <div class="space-y-4">
        <!-- Warning message -->
        <div class="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <div class="flex gap-3">
            <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div class="space-y-2 text-sm">
              <p class="font-semibold text-destructive">
                You are about to modify archived version snapshots.
              </p>
              <p class="text-muted-foreground">
                These files represent <strong class="text-foreground">stable, published versions</strong>
                that other users and systems may currently depend on. Modifying them
                will change content for <strong class="text-foreground">everyone</strong> using these versions.
              </p>
            </div>
          </div>
        </div>

        <!-- Affected files list -->
        <div class="rounded-lg border bg-muted/30 p-3">
          <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Affected Version Files
          </p>
          <ul class="space-y-1.5">
            <li
              v-for="file in versionFiles"
              :key="file.path"
              class="flex items-center gap-2 text-sm"
            >
              <FileWarning class="h-4 w-4 shrink-0 text-destructive/70" />
              <span class="font-mono text-xs">
                {{ file.collection }}/{{ file.slug }}
              </span>
              <span class="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                {{ extractVersionLabel(file.path) }}
              </span>
            </li>
          </ul>
        </div>

        <!-- Recommendation -->
        <div class="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p class="text-sm font-medium text-primary">
            Recommended: Create a new version instead
          </p>
          <p class="mt-1 text-xs text-muted-foreground">
            Navigate to each content item, open the Version dialog, and create a
            new version. This preserves the archived snapshot and publishes your
            changes as a new version.
          </p>
        </div>

        <!-- Override confirmation -->
        <div class="space-y-3 rounded-lg border-2 border-dashed border-destructive/30 p-4">
          <p class="text-sm text-muted-foreground">
            To override this protection, type
            <code class="rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-bold text-destructive">{{ REQUIRED_TEXT }}</code>
            below:
          </p>
          <input
            v-model="confirmText"
            type="text"
            placeholder="Type OVERRIDE to confirm"
            autocomplete="off"
            class="w-full rounded-md border border-destructive/30 bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground/50 focus:border-destructive focus:outline-none focus:ring-1 focus:ring-destructive"
          />
        </div>

        <!-- Action buttons -->
        <div class="flex items-center justify-end gap-3 border-t pt-4">
          <button
            type="button"
            @click="handleCancel"
            class="rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            Cancel — Don't Publish
          </button>
          <button
            type="button"
            @click="handleOverride"
            :disabled="!isConfirmed"
            class="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Override &amp; Publish Anyway
          </button>
        </div>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>
