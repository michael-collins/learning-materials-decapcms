<script setup lang="ts">
/**
 * ConflictResolver — User-friendly interface for resolving differences
 * between local and GitHub versions of a content file.
 *
 * Designed for non-developers: uses plain language, side-by-side cards
 * with simple radio toggles, and bulk actions.
 *
 * For each frontmatter field that differs, shows a card with:
 *   - "Your Version" (local) and "GitHub Version" (remote)
 *   - A radio toggle to pick which value to keep
 *
 * For the body (markdown content), shows a similar pick interface.
 *
 * Bulk actions: "Use all of mine" / "Use all of GitHub's"
 */
import {
  GitCompareArrows, Check, User, Globe, Merge,
  ChevronDown, ChevronUp, FileText, Layers,
} from 'lucide-vue-next'
import type { ContentVersion } from '~/composables/useCmsSync'

const props = defineProps<{
  localVersion: ContentVersion
  remoteVersion: ContentVersion
}>()

const emit = defineEmits<{
  resolve: [merged: { frontmatter: Record<string, any>; body: string }]
  cancel: []
}>()

// ─── Compute field diffs ──────────────────────────────────

interface FieldDiff {
  key: string
  label: string
  localValue: any
  remoteValue: any
  isDifferent: boolean
}

/** Which version is selected: 'local' or 'remote' */
type VersionChoice = 'local' | 'remote'

// Gather all unique keys from both versions
const allFieldKeys = computed(() => {
  const keys = new Set<string>()
  if (props.localVersion.frontmatter) {
    Object.keys(props.localVersion.frontmatter).forEach(k => keys.add(k))
  }
  if (props.remoteVersion.frontmatter) {
    Object.keys(props.remoteVersion.frontmatter).forEach(k => keys.add(k))
  }
  return Array.from(keys)
})

const fieldDiffs = computed<FieldDiff[]>(() => {
  return allFieldKeys.value.map(key => {
    const localVal = props.localVersion.frontmatter?.[key]
    const remoteVal = props.remoteVersion.frontmatter?.[key]
    return {
      key,
      label: formatFieldLabel(key),
      localValue: localVal,
      remoteValue: remoteVal,
      isDifferent: JSON.stringify(localVal) !== JSON.stringify(remoteVal),
    }
  })
})

const changedFields = computed(() => fieldDiffs.value.filter(f => f.isDifferent))
const unchangedFields = computed(() => fieldDiffs.value.filter(f => !f.isDifferent))
const bodyDiffers = computed(() => props.localVersion.body !== props.remoteVersion.body)

// ─── Selection state ──────────────────────────────────────

/** Per-field version choices (only for changed fields) */
const fieldChoices = ref<Record<string, VersionChoice>>({})

/** Body choice */
const bodyChoice = ref<VersionChoice>('local')

// Initialize choices — default to 'local' (user's version)
watch(
  changedFields,
  (fields) => {
    const choices: Record<string, VersionChoice> = {}
    for (const f of fields) {
      choices[f.key] = fieldChoices.value[f.key] || 'local'
    }
    fieldChoices.value = choices
  },
  { immediate: true },
)

// ─── Bulk actions ─────────────────────────────────────────

function useAllLocal() {
  const choices: Record<string, VersionChoice> = {}
  for (const f of changedFields.value) {
    choices[f.key] = 'local'
  }
  fieldChoices.value = choices
  bodyChoice.value = 'local'
}

function useAllRemote() {
  const choices: Record<string, VersionChoice> = {}
  for (const f of changedFields.value) {
    choices[f.key] = 'remote'
  }
  fieldChoices.value = choices
  bodyChoice.value = 'remote'
}

// ─── Summary counts ───────────────────────────────────────

const localCount = computed(() => {
  let count = Object.values(fieldChoices.value).filter(v => v === 'local').length
  if (bodyDiffers.value && bodyChoice.value === 'local') count++
  return count
})

const remoteCount = computed(() => {
  let count = Object.values(fieldChoices.value).filter(v => v === 'remote').length
  if (bodyDiffers.value && bodyChoice.value === 'remote') count++
  return count
})

const totalChanges = computed(() => changedFields.value.length + (bodyDiffers.value ? 1 : 0))

// ─── Resolve ──────────────────────────────────────────────

function handleResolve() {
  // Build merged frontmatter
  const merged: Record<string, any> = {}

  for (const diff of fieldDiffs.value) {
    if (diff.isDifferent) {
      const choice = fieldChoices.value[diff.key] || 'local'
      merged[diff.key] = choice === 'local' ? diff.localValue : diff.remoteValue
    } else {
      // Unchanged — keep as-is (prefer local, they're identical)
      merged[diff.key] = diff.localValue
    }
  }

  // Build merged body
  const mergedBody = bodyChoice.value === 'local'
    ? props.localVersion.body
    : props.remoteVersion.body

  emit('resolve', { frontmatter: merged, body: mergedBody })
}

// ─── UI toggles ───────────────────────────────────────────
const showUnchanged = ref(false)

// ─── Helpers ──────────────────────────────────────────────

function formatFieldLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, s => s.toUpperCase())
}

function formatValue(value: any): string {
  if (value === undefined || value === null) return '(empty)'
  if (value === '') return '(empty)'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) {
    if (value.length === 0) return '(empty list)'
    return value.map(v => typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)).join(', ')
  }
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

function truncateBody(text: string, maxLines = 12): string {
  const lines = text.split('\n')
  if (lines.length <= maxLines) return text
  return lines.slice(0, maxLines).join('\n') + `\n... (${lines.length - maxLines} more lines)`
}

function isComplex(value: any): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Header bar -->
    <div class="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 p-4">
      <div class="flex items-center gap-2">
        <Merge class="h-5 w-5 text-primary" />
        <h2 class="text-lg font-semibold">Resolve Differences</h2>
        <span class="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
          {{ totalChanges }} {{ totalChanges === 1 ? 'difference' : 'differences' }} found
        </span>
      </div>

      <!-- Bulk actions -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="useAllLocal"
          class="flex items-center gap-1.5 rounded-md border bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50"
        >
          <User class="h-3.5 w-3.5" />
          Use all of mine
        </button>
        <button
          type="button"
          @click="useAllRemote"
          class="flex items-center gap-1.5 rounded-md border bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
        >
          <Globe class="h-3.5 w-3.5" />
          Use all of GitHub's
        </button>
      </div>
    </div>

    <!-- Legend / help text -->
    <div class="border-b bg-muted/10 px-4 py-2.5 text-xs text-muted-foreground">
      For each difference below, choose which version you want to keep.
      <strong class="text-blue-600 dark:text-blue-400">Your Version</strong> is what you have locally, and
      <strong class="text-emerald-600 dark:text-emerald-400">GitHub Version</strong> is what's currently on GitHub.
    </div>

    <!-- Scrollable content area -->
    <UiScrollArea class="flex-1">
      <div class="space-y-3 p-4">

        <!-- ═══ Changed Frontmatter Fields ═══ -->
        <template v-if="changedFields.length > 0">
          <div class="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Layers class="h-3.5 w-3.5" />
            Fields with differences
          </div>

          <div
            v-for="field in changedFields"
            :key="field.key"
            class="rounded-lg border bg-card shadow-sm"
          >
            <!-- Field header -->
            <div class="flex items-center justify-between border-b px-4 py-2.5">
              <span class="text-sm font-medium">{{ field.label }}</span>
              <span class="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {{ fieldChoices[field.key] === 'local' ? 'Keeping yours' : 'Keeping GitHub\'s' }}
              </span>
            </div>

            <!-- Side-by-side values -->
            <div class="grid grid-cols-1 gap-0 sm:grid-cols-2">
              <!-- Your Version (local) -->
              <button
                type="button"
                @click="fieldChoices[field.key] = 'local'"
                class="group relative border-b p-4 text-left transition-colors sm:border-b-0 sm:border-r"
                :class="fieldChoices[field.key] === 'local'
                  ? 'bg-blue-50/70 dark:bg-blue-950/20'
                  : 'hover:bg-muted/30'"
              >
                <!-- Selection indicator -->
                <div class="mb-2 flex items-center gap-2">
                  <div
                    class="flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors"
                    :class="fieldChoices[field.key] === 'local'
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-muted-foreground/30'"
                  >
                    <Check v-if="fieldChoices[field.key] === 'local'" class="h-3 w-3 text-white" />
                  </div>
                  <span class="text-xs font-medium" :class="fieldChoices[field.key] === 'local' ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'">
                    Your Version
                  </span>
                </div>

                <!-- Value display -->
                <div
                  class="rounded-md border bg-background/80 p-2.5 text-sm"
                  :class="isComplex(field.localValue) ? 'font-mono text-xs' : ''"
                >
                  <pre v-if="isComplex(field.localValue)" class="whitespace-pre-wrap">{{ formatValue(field.localValue) }}</pre>
                  <span v-else>{{ formatValue(field.localValue) }}</span>
                </div>
              </button>

              <!-- GitHub Version (remote) -->
              <button
                type="button"
                @click="fieldChoices[field.key] = 'remote'"
                class="group relative p-4 text-left transition-colors"
                :class="fieldChoices[field.key] === 'remote'
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/20'
                  : 'hover:bg-muted/30'"
              >
                <!-- Selection indicator -->
                <div class="mb-2 flex items-center gap-2">
                  <div
                    class="flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors"
                    :class="fieldChoices[field.key] === 'remote'
                      ? 'border-emerald-500 bg-emerald-500'
                      : 'border-muted-foreground/30'"
                  >
                    <Check v-if="fieldChoices[field.key] === 'remote'" class="h-3 w-3 text-white" />
                  </div>
                  <span class="text-xs font-medium" :class="fieldChoices[field.key] === 'remote' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'">
                    GitHub Version
                  </span>
                </div>

                <!-- Value display -->
                <div
                  class="rounded-md border bg-background/80 p-2.5 text-sm"
                  :class="isComplex(field.remoteValue) ? 'font-mono text-xs' : ''"
                >
                  <pre v-if="isComplex(field.remoteValue)" class="whitespace-pre-wrap">{{ formatValue(field.remoteValue) }}</pre>
                  <span v-else>{{ formatValue(field.remoteValue) }}</span>
                </div>
              </button>
            </div>
          </div>
        </template>

        <!-- ═══ Body Content ═══ -->
        <template v-if="bodyDiffers">
          <div class="mb-1 mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <FileText class="h-3.5 w-3.5" />
            Content body differences
          </div>

          <div class="rounded-lg border bg-card shadow-sm">
            <div class="flex items-center justify-between border-b px-4 py-2.5">
              <span class="text-sm font-medium">Main Content (Markdown)</span>
              <span class="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {{ bodyChoice === 'local' ? 'Keeping yours' : 'Keeping GitHub\'s' }}
              </span>
            </div>

            <div class="grid grid-cols-1 gap-0 sm:grid-cols-2">
              <!-- Your Version -->
              <button
                type="button"
                @click="bodyChoice = 'local'"
                class="group relative border-b p-4 text-left transition-colors sm:border-b-0 sm:border-r"
                :class="bodyChoice === 'local'
                  ? 'bg-blue-50/70 dark:bg-blue-950/20'
                  : 'hover:bg-muted/30'"
              >
                <div class="mb-2 flex items-center gap-2">
                  <div
                    class="flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors"
                    :class="bodyChoice === 'local'
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-muted-foreground/30'"
                  >
                    <Check v-if="bodyChoice === 'local'" class="h-3 w-3 text-white" />
                  </div>
                  <span class="text-xs font-medium" :class="bodyChoice === 'local' ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'">
                    Your Version
                  </span>
                  <span class="text-xs text-muted-foreground">
                    ({{ localVersion.body.split('\n').length }} lines)
                  </span>
                </div>

                <div class="rounded-md border bg-background/80 p-2.5 font-mono text-xs">
                  <pre class="whitespace-pre-wrap">{{ truncateBody(localVersion.body) }}</pre>
                </div>
              </button>

              <!-- GitHub Version -->
              <button
                type="button"
                @click="bodyChoice = 'remote'"
                class="group relative p-4 text-left transition-colors"
                :class="bodyChoice === 'remote'
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/20'
                  : 'hover:bg-muted/30'"
              >
                <div class="mb-2 flex items-center gap-2">
                  <div
                    class="flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors"
                    :class="bodyChoice === 'remote'
                      ? 'border-emerald-500 bg-emerald-500'
                      : 'border-muted-foreground/30'"
                  >
                    <Check v-if="bodyChoice === 'remote'" class="h-3 w-3 text-white" />
                  </div>
                  <span class="text-xs font-medium" :class="bodyChoice === 'remote' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'">
                    GitHub Version
                  </span>
                  <span class="text-xs text-muted-foreground">
                    ({{ remoteVersion.body.split('\n').length }} lines)
                  </span>
                </div>

                <div class="rounded-md border bg-background/80 p-2.5 font-mono text-xs">
                  <pre class="whitespace-pre-wrap">{{ truncateBody(remoteVersion.body) }}</pre>
                </div>
              </button>
            </div>
          </div>
        </template>

        <!-- ═══ Unchanged Fields (collapsible) ═══ -->
        <template v-if="unchangedFields.length > 0">
          <button
            type="button"
            @click="showUnchanged = !showUnchanged"
            class="mt-4 flex w-full items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <component :is="showUnchanged ? ChevronUp : ChevronDown" class="h-3.5 w-3.5" />
            {{ unchangedFields.length }} unchanged {{ unchangedFields.length === 1 ? 'field' : 'fields' }}
            <span class="flex-1 border-b border-dashed" />
          </button>

          <div v-if="showUnchanged" class="space-y-1.5 pl-5">
            <div
              v-for="field in unchangedFields"
              :key="field.key"
              class="flex items-center gap-2 rounded-md bg-muted/30 px-3 py-1.5 text-xs"
            >
              <Check class="h-3 w-3 text-green-500" />
              <span class="font-medium">{{ field.label }}:</span>
              <span class="truncate text-muted-foreground">{{ formatValue(field.localValue) }}</span>
            </div>
          </div>
        </template>

        <!-- ═══ No differences found ═══ -->
        <div v-if="totalChanges === 0" class="flex flex-col items-center py-8 text-center text-muted-foreground">
          <Check class="mb-2 h-8 w-8 text-green-500" />
          <p class="text-sm font-medium">No meaningful differences found</p>
          <p class="text-xs">The content is essentially the same.</p>
        </div>
      </div>
    </UiScrollArea>

    <!-- Footer with summary + actions -->
    <div class="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/30 p-4">
      <div class="text-xs text-muted-foreground">
        <template v-if="totalChanges > 0">
          Keeping <strong class="text-blue-600 dark:text-blue-400">{{ localCount }}</strong> of yours
          and <strong class="text-emerald-600 dark:text-emerald-400">{{ remoteCount }}</strong> from GitHub
        </template>
        <template v-else>
          No changes to resolve
        </template>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="emit('cancel')"
          class="rounded-md border px-4 py-2 text-sm transition-colors hover:bg-accent"
        >
          Cancel
        </button>
        <button
          type="button"
          @click="handleResolve"
          class="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Check class="h-4 w-4" />
          Save Resolved Version
        </button>
      </div>
    </div>
  </div>
</template>
