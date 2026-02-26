<script setup lang="ts">
/**
 * CmsVersionSelect — Version picker for versioned content references.
 *
 * Works alongside a sibling CmsRelation field. Given:
 *  - collection: which Nuxt Content collection to query
 *  - relation_field: name of the sibling field holding the selected slug
 *
 * It queries all versions (both index.md = latest AND v/*.md = archived)
 * for that specific content item and presents them as a select dropdown.
 *
 * modelValue stores: "latest" (default) or a specific version string like "0.9.0"
 */
import type { DecapField } from '~/lib/cms/config-types'
import { GitBranch, Loader2 } from 'lucide-vue-next'

const props = defineProps<{
  field: DecapField
  modelValue: any
  /** The parent object data — used to read the sibling relation field */
  parentData?: Record<string, any>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

// ─── Config extraction ─────────────────────────────────────
const collectionName = computed(() => props.field.collection ?? '')
const relationFieldName = computed(() => props.field.relation_field ?? '')

// ─── Read sibling slug from parent data ────────────────────
const selectedSlug = computed(() => {
  if (!props.parentData || !relationFieldName.value) return ''
  return props.parentData[relationFieldName.value] ?? ''
})

// ─── State ──────────────────────────────────────────────────
const loading = ref(false)
const versions = ref<{ label: string; value: string }[]>([])

const currentValue = computed({
  get: () => props.modelValue || 'latest',
  set: (val: string) => emit('update:modelValue', val),
})

// ─── Fetch versions for the selected content item ──────────
async function fetchVersions() {
  if (!collectionName.value || !selectedSlug.value) {
    versions.value = []
    return
  }

  loading.value = true
  try {
    // Query ALL items in the collection (including archived versions)
    const result = await queryCollection(collectionName.value as any)
      .all()

    // Filter to items that match the selected slug
    // Latest: stem = "{collection}/{slug}/index"
    // Archived: stem = "{collection}/{slug}/v/{version}"
    const matching = (result as any[]).filter((item: any) => {
      const stem: string = item.stem ?? ''
      // Extract the slug part from stem
      const slugFromStem = stem
        .replace(/\/index$/, '')
        .replace(/\/v\/[^/]+$/, '')
        .split('/')
        .pop() ?? ''
      return slugFromStem === selectedSlug.value
    })

    // Build version options
    const versionOptions: { label: string; value: string; sortKey: string }[] = []

    for (const item of matching) {
      const stem: string = item.stem ?? ''
      const ver: string = item.version ?? ''

      if (stem.endsWith('/index')) {
        // This is the latest version
        versionOptions.push({
          label: ver ? `Latest (${ver})` : 'Latest',
          value: 'latest',
          sortKey: '\uffff', // Sort last (display first)
        })
      } else {
        // Archived version — extract from stem or version field
        const archivedVer = ver || stem.split('/').pop() || 'unknown'
        versionOptions.push({
          label: `v${archivedVer}`,
          value: archivedVer,
          sortKey: archivedVer,
        })
      }
    }

    // Sort: latest first, then archived versions in descending order
    versionOptions.sort((a, b) => b.sortKey.localeCompare(a.sortKey, undefined, { numeric: true }))

    versions.value = versionOptions.map(({ label, value }) => ({ label, value }))

    // If only one version exists (latest), or no versions found, keep default
    if (versions.value.length === 0) {
      versions.value = [{ label: 'Latest', value: 'latest' }]
    }

    // If current selection is not in the version list, reset to latest
    if (!versions.value.some((v) => v.value === currentValue.value)) {
      currentValue.value = 'latest'
    }
  } catch (e) {
    console.warn(`[CmsVersionSelect] Failed to fetch versions:`, e)
    versions.value = [{ label: 'Latest', value: 'latest' }]
  } finally {
    loading.value = false
  }
}

// Fetch versions when the selected slug changes
watch(selectedSlug, () => {
  if (selectedSlug.value) {
    fetchVersions()
  } else {
    versions.value = []
  }
}, { immediate: true })
</script>

<template>
  <div>
    <!-- Label -->
    <label class="mb-1.5 block text-sm font-medium">
      <GitBranch class="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />
      {{ field.label || 'Version' }}
      <span v-if="field.required !== false" class="text-destructive">*</span>
    </label>
    <p v-if="field.hint" class="mb-2 text-xs text-muted-foreground">{{ field.hint }}</p>

    <!-- No slug selected state -->
    <div v-if="!selectedSlug" class="rounded-md border border-dashed border-muted-foreground/25 px-3 py-2">
      <p class="text-sm text-muted-foreground italic">Select content above first</p>
    </div>

    <!-- Version select -->
    <div v-else class="relative">
      <select
        :value="currentValue"
        @change="currentValue = ($event.target as HTMLSelectElement).value"
        class="w-full appearance-none rounded-md border bg-transparent px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        :disabled="loading || versions.length <= 1"
      >
        <option
          v-for="ver in versions"
          :key="ver.value"
          :value="ver.value"
        >
          {{ ver.label }}
        </option>
      </select>

      <!-- Loading indicator -->
      <div v-if="loading" class="pointer-events-none absolute inset-y-0 right-2 flex items-center">
        <Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    </div>

    <!-- Version count info -->
    <p v-if="selectedSlug && versions.length > 1" class="mt-1 text-xs text-muted-foreground">
      {{ versions.length }} version{{ versions.length === 1 ? '' : 's' }} available
    </p>
  </div>
</template>
