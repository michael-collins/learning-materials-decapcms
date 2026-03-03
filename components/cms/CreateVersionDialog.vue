<script setup lang="ts">
/**
 * CreateVersionDialog — UI for creating a new version of a content item.
 *
 * Shows the current version, existing version history, quick bump buttons
 * (major/minor/patch), and a custom version input. Supports independent
 * version tracks (e.g., 1.0.x and 2.0.x can coexist).
 */
import { GitBranch, Plus, History, Loader2, AlertCircle, CheckCircle, ArrowUp, Tag } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  collection: string
  slug: string
  currentVersion: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'version-created': [data: { previousVersion: string; newVersion: string }]
}>()

// ─── State ──────────────────────────────────────────────
const { getToken } = useCmsAuth()
const loading = ref(false)
const creating = ref(false)
const error = ref<string | null>(null)
const success = ref(false)

const existingVersions = ref<Array<{
  version: string
  versionStatus: string
  createdAt?: string
  title?: string
}>>([])

// Version selection
const bumpType = ref<'major' | 'minor' | 'patch' | 'custom'>('minor')
const customVersion = ref('')
const changelog = ref('')

// ─── Computed version values ────────────────────────────
function parseSemver(v: string): [number, number, number] {
  const parts = v.split('.').map(Number)
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0]
}

const bumpedVersions = computed(() => {
  const [major, minor, patch] = parseSemver(props.currentVersion)
  return {
    major: `${major + 1}.0.0`,
    minor: `${major}.${minor + 1}.0`,
    patch: `${major}.${minor}.${patch + 1}`,
  }
})

const selectedVersion = computed(() => {
  if (bumpType.value === 'custom') return customVersion.value
  return bumpedVersions.value[bumpType.value]
})

const isValidVersion = computed(() => {
  return /^\d+\.\d+\.\d+$/.test(selectedVersion.value)
})

const versionConflict = computed(() => {
  return existingVersions.value.some(v => v.version === selectedVersion.value)
    || selectedVersion.value === props.currentVersion
})

// ─── Fetch existing versions ────────────────────────────
async function fetchVersions() {
  loading.value = true
  error.value = null
  try {
    const token = getToken()
    const data = await $fetch<{
      currentVersion: string
      versions: Array<{ version: string; versionStatus: string; createdAt?: string; title?: string }>
    }>('/api/cms/content/versions', {
      params: { collection: props.collection, slug: props.slug, ...(token ? { token } : {}) },
    })
    existingVersions.value = data.versions
  } catch (err: any) {
    error.value = err.data?.message || err.message || 'Failed to fetch versions'
  } finally {
    loading.value = false
  }
}

// Fetch versions when dialog opens
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    fetchVersions()
    // Reset state
    bumpType.value = 'minor'
    customVersion.value = ''
    changelog.value = ''
    creating.value = false
    success.value = false
    error.value = null
  }
})

// ─── Create version ─────────────────────────────────────
async function handleCreate() {
  if (!isValidVersion.value || versionConflict.value) return

  creating.value = true
  error.value = null

  try {
    const result = await $fetch<{
      success: boolean
      previousVersion: string
      newVersion: string
    }>('/api/cms/content/create-version', {
      method: 'POST',
      body: {
        collection: props.collection,
        slug: props.slug,
        newVersion: selectedVersion.value,
        changelog: changelog.value || undefined,
      },
    })

    success.value = true

    // Emit so the parent can reload the content
    emit('version-created', {
      previousVersion: result.previousVersion,
      newVersion: result.newVersion,
    })
  } catch (err: any) {
    error.value = err.data?.message || err.message || 'Failed to create version'
  } finally {
    creating.value = false
  }
}

function close() {
  emit('update:open', false)
}
</script>

<template>
  <UiDialog :open="open" @update:open="(val: boolean) => { if (!val) close() }">
    <UiDialogContent class="sm:max-w-lg max-h-[85vh] flex flex-col">
      <UiDialogHeader>
        <UiDialogTitle class="flex items-center gap-2">
          <GitBranch class="h-5 w-5 text-primary" />
          Create New Version
        </UiDialogTitle>
        <UiDialogDescription>
          Archive the current version and start a new one. Previous versions are preserved as read-only snapshots.
        </UiDialogDescription>
      </UiDialogHeader>

      <!-- ═══ Success state ═══ -->
      <div v-if="success" class="space-y-4 py-4">
        <div class="flex items-start gap-3 rounded-lg border border-green-500/30 bg-green-500/5 p-4">
          <CheckCircle class="mt-0.5 h-5 w-5 text-green-600 dark:text-green-400" />
          <div>
            <p class="text-sm font-medium text-green-600 dark:text-green-400">
              Version {{ selectedVersion }} created successfully
            </p>
            <p class="mt-1 text-xs text-muted-foreground">
              Version {{ currentVersion }} has been archived as a read-only snapshot.
              The content is now at version {{ selectedVersion }}.
            </p>
          </div>
        </div>

        <div class="flex justify-end gap-2">
          <button
            type="button"
            @click="close"
            class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Done
          </button>
        </div>
      </div>

      <!-- ═══ Loading state ═══ -->
      <div v-else-if="loading" class="flex items-center justify-center py-8">
        <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
      </div>

      <!-- ═══ Main form ═══ -->
      <div v-else class="space-y-5 py-4 overflow-y-auto">
        <!-- Current version badge -->
        <div class="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
          <Tag class="h-4 w-4 text-muted-foreground" />
          <div>
            <p class="text-xs text-muted-foreground">Current version</p>
            <p class="text-sm font-mono font-semibold">{{ currentVersion }}</p>
          </div>
        </div>

        <!-- Quick bump buttons -->
        <div>
          <label class="mb-2 block text-sm font-medium">Choose new version</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="type in (['patch', 'minor', 'major'] as const)"
              :key="type"
              type="button"
              @click="bumpType = type"
              :class="[
                'flex flex-col items-center gap-1 rounded-lg border px-3 py-3 text-center transition-all',
                bumpType === type
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'hover:border-foreground/30 hover:bg-accent/50'
              ]"
            >
              <span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {{ type }}
              </span>
              <span class="font-mono text-sm font-semibold">
                {{ bumpedVersions[type] }}
              </span>
              <span class="text-[10px] text-muted-foreground">
                {{ type === 'patch' ? 'Bug fixes' : type === 'minor' ? 'New content' : 'Major rewrite' }}
              </span>
            </button>
          </div>
        </div>

        <!-- Custom version option -->
        <div>
          <button
            type="button"
            @click="bumpType = 'custom'"
            :class="[
              'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all',
              bumpType === 'custom'
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'hover:border-foreground/30 hover:bg-accent/50'
            ]"
          >
            <Plus class="h-4 w-4 text-muted-foreground" />
            <span>Custom version number</span>
          </button>

          <div v-if="bumpType === 'custom'" class="mt-2">
            <input
              v-model="customVersion"
              type="text"
              placeholder="e.g., 3.0.0"
              class="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p v-if="customVersion && !isValidVersion" class="mt-1 text-xs text-destructive">
              Must be a valid semantic version (X.Y.Z)
            </p>
          </div>
        </div>

        <!-- Changelog (optional) -->
        <div>
          <label class="mb-1 block text-sm font-medium">
            Version notes
            <span class="text-muted-foreground">(optional)</span>
          </label>
          <textarea
            v-model="changelog"
            placeholder="Brief description of what changed in this version..."
            rows="2"
            class="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
        </div>

        <!-- Version history -->
        <div v-if="existingVersions.length > 0">
          <div class="flex items-center gap-2 mb-2">
            <History class="h-4 w-4 text-muted-foreground" />
            <span class="text-sm font-medium">Version history</span>
          </div>
          <div class="max-h-32 overflow-y-auto rounded-lg border">
            <div
              v-for="v in existingVersions"
              :key="v.version"
              class="flex items-center justify-between border-b px-3 py-2 last:border-0 text-sm"
            >
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs font-medium">{{ v.version }}</span>
                <span
                  :class="[
                    'inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                    v.versionStatus === 'latest'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  ]"
                >
                  {{ v.versionStatus }}
                </span>
              </div>
              <span v-if="v.createdAt" class="text-xs text-muted-foreground">
                {{ new Date(v.createdAt).toLocaleDateString() }}
              </span>
            </div>
          </div>
        </div>

        <!-- Conflict warning -->
        <div
          v-if="isValidVersion && versionConflict"
          class="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3"
        >
          <AlertCircle class="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p class="text-xs text-destructive">
            Version {{ selectedVersion }} already exists.
            {{ selectedVersion === currentVersion ? 'Choose a different version number.' : 'Choose a different version number or remove the existing snapshot first.' }}
          </p>
        </div>

        <!-- Error -->
        <div
          v-if="error"
          class="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3"
        >
          <AlertCircle class="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p class="text-xs text-destructive">{{ error }}</p>
        </div>

        <!-- Summary & action -->
        <div class="rounded-lg border bg-muted/20 px-4 py-3">
          <div class="flex items-center gap-2">
            <ArrowUp class="h-4 w-4 text-primary" />
            <p class="text-sm">
              <span class="font-mono font-medium">{{ currentVersion }}</span>
              <span class="mx-2 text-muted-foreground">&rarr;</span>
              <span class="font-mono font-semibold text-primary">
                {{ isValidVersion ? selectedVersion : '?.?.?' }}
              </span>
            </p>
          </div>
          <p class="mt-1 text-xs text-muted-foreground">
            The current content will be saved as a read-only v{{ currentVersion }} snapshot.
          </p>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            @click="close"
            class="rounded-md border px-4 py-2 text-sm transition-colors hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="handleCreate"
            :disabled="creating || !isValidVersion || versionConflict"
            class="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            <Loader2 v-if="creating" class="h-4 w-4 animate-spin" />
            <GitBranch v-else class="h-4 w-4" />
            {{ creating ? 'Creating...' : 'Create Version' }}
          </button>
        </div>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>
