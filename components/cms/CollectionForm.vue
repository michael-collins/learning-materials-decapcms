<script setup lang="ts">
/**
 * CollectionForm — Auto-generates a full editing form from a collection's field definitions.
 *
 * Separates frontmatter fields from the body field, manages reactive form state,
 * and validates required fields before submission.
 */
import type { CmsFieldDef, CmsCollectionDef } from '~/lib/cms/config-types'
import { getFrontmatterFields, getBodyField, getVisibleFields } from '~/lib/cms/config-parser'
import { Save, Loader2, AlertCircle, GitPullRequest, ChevronDown, ChevronUp, Settings2, Eye, EyeOff, Github, Upload } from 'lucide-vue-next'
import { useWindowSize } from '@vueuse/core'

const props = defineProps<{
  /** The collection config from config.yml */
  collection: CmsCollectionDef
  /** Initial form data (for editing existing items) */
  initialData?: Record<string, any>
  /** Whether this is a new item (vs editing existing) */
  isNew?: boolean
  /** Whether save is in progress */
  saving?: boolean
  /** Whether GitHub publish is in progress */
  publishing?: boolean
  /** Whether editorial workflow is enabled */
  editorialWorkflow?: boolean
  /** Whether local backend is active (shows Publish to GitHub button) */
  localBackend?: boolean
  /** Whether local content differs from GitHub (set by parent after sync-check) */
  unpublishedChanges?: boolean
}>()

const emit = defineEmits<{
  submit: [data: { frontmatter: Record<string, any>; body: string; publishMode?: 'draft' | 'direct' }]
  publish: [data: { frontmatter: Record<string, any>; body: string; publishMode?: 'draft' | 'direct' }]
  'update:title': [title: string]
}>()

// ─── Derive fields from collection config ──────────────
const allFields = computed(() => props.collection.fields ?? [])
const frontmatterFields = computed(() => getVisibleFields(getFrontmatterFields(allFields.value)))
const bodyField = computed(() => getBodyField(allFields.value))

// Hidden fields (still need values in form data)
const hiddenFields = computed(() =>
  allFields.value.filter((f) => f.widget === 'hidden' && f.name !== 'body')
)

// ─── Reactive form data ─────────────────────────────────
const formData = reactive<Record<string, any>>({})
const bodyContent = ref('')
const validationErrors = ref<Record<string, string>>({})

// Initialize form data from initial data or defaults
function initializeForm() {
  const data = props.initialData ?? {}

  for (const field of allFields.value) {
    if (field.name === 'body') {
      bodyContent.value = data.body ?? data.content ?? ''
      continue
    }

    // Use existing value > field default > type-appropriate empty
    if (data[field.name] !== undefined) {
      formData[field.name] = data[field.name]
    } else if (field.default !== undefined) {
      formData[field.name] = field.default
    } else {
      formData[field.name] = getEmptyValue(field)
    }
  }
}

function getEmptyValue(field: CmsFieldDef): any {
  switch (field.widget) {
    case 'boolean': return false
    case 'number': return ''
    case 'list': return []
    case 'object': return {}
    case 'select': return field.multiple ? [] : ''
    default: return ''
  }
}

// Initialize on mount and when initial data changes
initializeForm()
watch(() => props.initialData, initializeForm, { deep: true })

// Emit title changes for slug auto-generation
watch(() => formData.title, (newTitle) => {
  if (newTitle) emit('update:title', newTitle)
})

// ─── Validation ─────────────────────────────────────────
function validate(): boolean {
  const errors: Record<string, string> = {}

  for (const field of allFields.value) {
    if (field.name === 'body') continue
    if (field.required === false) continue
    if (field.widget === 'hidden') continue

    const val = formData[field.name]
    if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
      errors[field.name] = `${field.label} is required`
    }

    // Pattern validation
    if (field.pattern && val) {
      const [regex, message] = field.pattern
      if (!new RegExp(regex).test(String(val))) {
        errors[field.name] = message
      }
    }
  }

  validationErrors.value = errors
  return Object.keys(errors).length === 0
}

// ─── Submit ─────────────────────────────────────────────
const showSaveDropdown = ref(false)
const showPublishDropdown = ref(false)

function handleSubmit(publishMode?: 'draft' | 'direct') {
  if (!validate()) return
  showSaveDropdown.value = false

  // Merge form data with hidden field values
  const frontmatter = { ...formData }

  emit('submit', {
    frontmatter,
    body: bodyContent.value,
    publishMode,
  })
}

function handlePublish(publishMode?: 'draft' | 'direct') {
  if (!validate()) return
  showPublishDropdown.value = false

  const frontmatter = { ...formData }

  emit('publish', {
    frontmatter,
    body: bodyContent.value,
    publishMode,
  })
}

// Check if a field has a validation error
function hasError(fieldName: string): boolean {
  return !!validationErrors.value[fieldName]
}

// Track dirty state
const isDirty = computed(() => {
  if (!props.initialData) return true // New items are always "dirty"

  // Check if any value differs from initial
  for (const field of allFields.value) {
    if (field.name === 'body') {
      if (bodyContent.value !== (props.initialData.body ?? '')) return true
      continue
    }
    if (JSON.stringify(formData[field.name]) !== JSON.stringify(props.initialData[field.name])) {
      return true
    }
  }
  return false
})

// Publish button should be active when the form has unsaved edits OR the
// saved local content differs from what's on GitHub.
const canPublish = computed(() => isDirty.value || !!props.unpublishedChanges)

// ─── Layout state ───────────────────────────────────────
const { width } = useWindowSize()
const isDesktop = computed(() => width.value >= 1024)
const configExpanded = ref(true)
const showPreview = ref(true)
</script>

<template>
  <form @submit.prevent="handleSubmit" class="flex flex-col">
    <!-- Validation error summary -->
    <div
      v-if="Object.keys(validationErrors).length > 0"
      class="mb-4 flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-4"
    >
      <AlertCircle class="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div>
        <p class="text-sm font-medium text-destructive">Please fix the following errors:</p>
        <ul class="mt-1 list-inside list-disc text-xs text-destructive/80">
          <li v-for="(msg, key) in validationErrors" :key="key">{{ msg }}</li>
        </ul>
      </div>
    </div>

    <!-- Hidden fields (applied silently) -->
    <CmsDynamicField
      v-for="field in hiddenFields"
      :key="field.name"
      :field="field"
      v-model="formData[field.name]"
    />

    <!-- Two-column layout: Editor (left) + Preview (right) -->
    <div :class="isDesktop && showPreview ? 'grid grid-cols-2 gap-6' : ''">
      <!-- Left Column: Config Fields + Body Editor -->
      <div class="min-w-0 space-y-4">
        <!-- Collapsible Config Settings -->
        <div class="rounded-lg border bg-card">
          <button
            type="button"
            @click="configExpanded = !configExpanded"
            class="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-accent/50 transition-colors"
          >
            <span class="flex items-center gap-2">
              <Settings2 class="h-4 w-4 text-muted-foreground" />
              Settings &amp; Metadata
              <span class="text-xs text-muted-foreground">({{ frontmatterFields.length }} fields)</span>
            </span>
            <component :is="configExpanded ? ChevronUp : ChevronDown" class="h-4 w-4 text-muted-foreground" />
          </button>

          <div v-show="configExpanded" class="border-t px-4 py-4 space-y-5">
            <div
              v-for="field in frontmatterFields"
              :key="field.name"
              :class="{ 'ring-2 ring-destructive/20 rounded-md p-2 -mx-2': hasError(field.name) }"
            >
              <CmsDynamicField
                :field="field"
                v-model="formData[field.name]"
              />
              <p
                v-if="hasError(field.name)"
                class="mt-1 text-xs text-destructive"
              >
                {{ validationErrors[field.name] }}
              </p>
            </div>
          </div>
        </div>

        <!-- Body / Markdown Editor -->
        <div v-if="bodyField">
          <CmsDynamicField
            :field="bodyField"
            v-model="bodyContent"
          />
        </div>
      </div>

      <!-- Right Column: Live Preview (desktop only) -->
      <div v-if="isDesktop && showPreview" class="min-w-0">
        <div class="sticky top-0 h-[calc(100vh-12rem)] rounded-lg border bg-card">
          <div class="flex items-center justify-between border-b px-4 py-2">
            <span class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Eye class="h-4 w-4" />
              Preview
            </span>
            <button
              type="button"
              @click="showPreview = false"
              class="rounded p-1 text-muted-foreground transition-colors hover:bg-accent"
              title="Hide preview"
            >
              <EyeOff class="h-3.5 w-3.5" />
            </button>
          </div>
          <CmsContentPreview
            :frontmatter="formData"
            :body="bodyContent"
            :collection="collection.label"
          />
        </div>
      </div>
    </div>

    <!-- Show preview toggle (when hidden) -->
    <button
      v-if="isDesktop && !showPreview"
      type="button"
      @click="showPreview = true"
      class="fixed right-4 top-16 z-20 flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:bg-accent"
    >
      <Eye class="h-3.5 w-3.5" />
      Show Preview
    </button>

    <!-- Submit Toolbar -->
    <div class="sticky bottom-0 z-10 -mx-6 mt-6 border-t bg-background px-6 py-4 md:-mx-8 md:px-8">
      <div class="flex items-center justify-between">
        <div class="text-sm text-muted-foreground">
          <span v-if="isDirty" class="flex items-center gap-1.5">
            <span class="h-2 w-2 rounded-full bg-yellow-500" />
            Unsaved changes
          </span>
          <span v-else-if="unpublishedChanges" class="flex items-center gap-1.5">
            <span class="h-2 w-2 rounded-full bg-orange-500" />
            Unpublished changes
          </span>
          <span v-else class="flex items-center gap-1.5">
            <span class="h-2 w-2 rounded-full bg-green-500" />
            No changes
          </span>
        </div>

        <!-- Editorial workflow: split button (Save Draft + Publish) -->
        <div v-if="editorialWorkflow" class="relative flex items-center">
          <!-- Primary: Save as Draft -->
          <button
            type="button"
            @click="handleSubmit('draft')"
            :disabled="saving || !isDirty"
            class="flex items-center gap-2 rounded-l-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
            <GitPullRequest v-else class="h-4 w-4" />
            {{ saving ? 'Saving...' : isNew ? 'Save as Draft' : 'Save Draft' }}
          </button>
          <!-- Orange notification badge when there are unpublished changes -->
          <span
            v-if="isDirty && !saving"
            class="absolute -right-1 -top-1 z-10 flex h-3 w-3 items-center justify-center"
          >
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
            <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-500" />
          </span>

          <!-- Dropdown toggle -->
          <div class="relative">
            <button
              type="button"
              @click="showSaveDropdown = !showSaveDropdown"
              :disabled="saving || !isDirty"
              class="rounded-r-md border-l border-primary-foreground/20 bg-primary px-2 py-2 text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              <ChevronDown class="h-4 w-4" />
            </button>

            <!-- Dropdown: Publish Directly -->
            <div
              v-if="showSaveDropdown"
              class="absolute bottom-full right-0 mb-2 w-48 rounded-md border bg-popover p-1 shadow-lg"
            >
              <button
                type="button"
                @click="handleSubmit('direct')"
                class="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
              >
                <Save class="h-4 w-4" />
                Publish Directly
              </button>
            </div>
          </div>

          <!-- Click-outside -->
          <Teleport to="body">
            <div
              v-if="showSaveDropdown"
              class="fixed inset-0 z-9"
              @click="showSaveDropdown = false"
            />
          </Teleport>
        </div>

        <!-- Non-editorial: save button + optional Publish to GitHub -->
        <div v-else class="flex items-center gap-3">
          <!-- Publish to GitHub (only in local backend mode) -->
          <div v-if="localBackend" class="relative flex items-center">
            <button
              type="button"
              @click="handlePublish('direct')"
              :disabled="publishing || saving || !canPublish"
              class="flex items-center gap-2 rounded-l-md border border-foreground/20 bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
            >
              <Loader2 v-if="publishing" class="h-4 w-4 animate-spin" />
              <Upload v-else class="h-4 w-4" />
              {{ publishing ? 'Publishing...' : 'Publish to GitHub' }}
            </button>
            <!-- Orange notification badge when there are unpublished changes -->
            <span
              v-if="canPublish && !publishing"
              class="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center"
            >
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
              <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-500" />
            </span>

            <!-- Dropdown for editorial option -->
            <div class="relative">
              <button
                type="button"
                @click="showPublishDropdown = !showPublishDropdown"
                :disabled="publishing || saving || !canPublish"
                class="rounded-r-md border border-l-0 border-foreground/20 bg-background px-2 py-2 transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
              >
                <ChevronDown class="h-4 w-4" />
              </button>

              <div
                v-if="showPublishDropdown"
                class="absolute bottom-full right-0 mb-2 w-52 rounded-md border bg-popover p-1 shadow-lg"
              >
                <button
                  type="button"
                  @click="handlePublish('direct')"
                  class="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
                >
                  <Upload class="h-4 w-4" />
                  Commit to main
                </button>
                <button
                  type="button"
                  @click="handlePublish('draft')"
                  class="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
                >
                  <GitPullRequest class="h-4 w-4" />
                  Create Pull Request
                </button>
              </div>
            </div>

            <Teleport to="body">
              <div
                v-if="showPublishDropdown"
                class="fixed inset-0 z-9"
                @click="showPublishDropdown = false"
              />
            </Teleport>
          </div>

          <!-- Save button -->
          <div class="relative">
            <button
              type="submit"
              :disabled="saving || publishing || !isDirty"
              class="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
              <Save v-else class="h-4 w-4" />
              {{ saving ? 'Saving...' : isNew ? 'Create' : 'Save' }}
            </button>
            <!-- Orange notification badge when there are unpublished changes -->
            <span
              v-if="isDirty && !saving && !localBackend"
              class="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center"
            >
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
              <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-500" />
            </span>
          </div>
        </div>
      </div>
    </div>
  </form>
</template>
