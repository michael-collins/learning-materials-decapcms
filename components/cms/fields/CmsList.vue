<script setup lang="ts">
/**
 * CmsList — Repeatable field group widget.
 *
 * Handles three Decap list patterns:
 * 1. Simple string list (no field/fields) — e.g., tags
 * 2. Single field list (field: {...}) — e.g., skills, tools, learningObjectives
 * 3. Structured list (fields: [...]) — e.g., attachments, criteria
 *
 * Does NOT handle typed lists (types: [...]) — those go to CmsTypedList.
 *
 * Supports add/remove/reorder operations.
 */
import type { DecapField } from '~/lib/cms/config-types'
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-vue-next'

const props = defineProps<{
  field: DecapField
  modelValue: any
}>()

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

// Ensure value is always an array
const items = computed({
  get: () => (Array.isArray(props.modelValue) ? props.modelValue : []),
  set: (val) => emit('update:modelValue', val),
})

/**
 * Determine list mode:
 * - 'simple': no field/fields → plain string items
 * - 'single': field → one widget per item
 * - 'structured': fields → object with multiple widgets per item
 */
const mode = computed(() => {
  if (props.field.fields && props.field.fields.length > 0) return 'structured'
  if (props.field.field) return 'single'
  return 'simple'
})

/** The single sub-field definition (for 'single' mode) */
const singleField = computed(() => props.field.field)

/** Sub-fields array (for 'structured' mode) */
const structuredFields = computed(() => props.field.fields ?? [])

// ─── CRUD operations ─────────────────────────────────────

function addItem() {
  const newItem = createEmptyItem()
  items.value = [...items.value, newItem]
}

function removeItem(index: number) {
  const copy = [...items.value]
  copy.splice(index, 1)
  items.value = copy
}

function moveItem(index: number, direction: -1 | 1) {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= items.value.length) return

  const copy = [...items.value]
  const temp = copy[index]
  copy[index] = copy[targetIndex]
  copy[targetIndex] = temp
  items.value = copy
}

function updateItem(index: number, value: any) {
  const copy = [...items.value]
  copy[index] = value
  items.value = copy
}

/** Update a single field within a structured item */
function updateStructuredField(index: number, fieldName: string, value: any) {
  const copy = [...items.value]
  copy[index] = { ...copy[index], [fieldName]: value }
  items.value = copy
}

// ─── Create empty items ──────────────────────────────────

function createEmptyItem(): any {
  if (mode.value === 'simple') return ''
  if (mode.value === 'single') return getEmptyFieldValue(singleField.value!)
  // structured: object with empty values for each sub-field
  const obj: Record<string, any> = {}
  for (const f of structuredFields.value) {
    obj[f.name] = getEmptyFieldValue(f)
  }
  return obj
}

function getEmptyFieldValue(f: DecapField): any {
  if (f.default !== undefined) return f.default
  switch (f.widget) {
    case 'boolean': return false
    case 'number': return ''
    case 'list': return []
    case 'object': return {}
    case 'select': return f.multiple ? [] : ''
    default: return ''
  }
}

// ─── Track collapsed state for structured items ──────────
const collapsedItems = ref<Set<number>>(new Set())

function toggleCollapse(index: number) {
  const copy = new Set(collapsedItems.value)
  if (copy.has(index)) copy.delete(index)
  else copy.add(index)
  collapsedItems.value = copy
}

function isCollapsed(index: number): boolean {
  return collapsedItems.value.has(index)
}

/** Get a display label for a structured item (first string-like field value) */
function getItemLabel(item: any, index: number): string {
  if (mode.value === 'simple') return String(item || `Item ${index + 1}`)
  if (mode.value === 'single') return String(item || `Item ${index + 1}`)

  // Structured: try to extract a readable label from common field names
  if (typeof item === 'object' && item) {
    const labelKeys = ['title', 'name', 'label', 'skill', 'tool', 'objective', 'change', 'tag']
    for (const key of labelKeys) {
      if (item[key]) return String(item[key])
    }
    // Fallback: first non-empty string value
    for (const val of Object.values(item)) {
      if (typeof val === 'string' && val.trim()) return val.trim().slice(0, 60)
    }
  }
  return `Item ${index + 1}`
}

const canAdd = computed(() => props.field.allow_add !== false)
</script>

<template>
  <div>
    <!-- Label -->
    <label class="mb-2 block text-sm font-medium">
      {{ field.label }}
      <span v-if="field.required !== false" class="text-destructive">*</span>
    </label>
    <p v-if="field.hint" class="mb-3 text-xs text-muted-foreground">{{ field.hint }}</p>

    <!-- Items list -->
    <div v-if="items.length > 0" class="space-y-2">
      <div
        v-for="(item, index) in items"
        :key="index"
        class="group rounded-md border bg-card"
      >
        <!-- Item header (for structured mode with collapsible sections) -->
        <div
          v-if="mode === 'structured'"
          class="flex items-center gap-2 border-b px-3 py-2"
          :class="{ 'border-b-0': isCollapsed(index) }"
        >
          <GripVertical class="h-4 w-4 shrink-0 text-muted-foreground/40" />
          <button
            type="button"
            @click="toggleCollapse(index)"
            class="flex-1 text-left text-sm font-medium truncate"
          >
            {{ getItemLabel(item, index) }}
          </button>
          <span class="text-xs text-muted-foreground">{{ index + 1 }}/{{ items.length }}</span>
          <div class="flex items-center gap-0.5">
            <button
              type="button"
              @click="moveItem(index, -1)"
              :disabled="index === 0"
              class="rounded p-1 hover:bg-muted disabled:opacity-30"
              title="Move up"
            >
              <ChevronUp class="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              @click="moveItem(index, 1)"
              :disabled="index === items.length - 1"
              class="rounded p-1 hover:bg-muted disabled:opacity-30"
              title="Move down"
            >
              <ChevronDown class="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              @click="removeItem(index)"
              class="rounded p-1 text-destructive/60 hover:bg-destructive/10 hover:text-destructive"
              title="Remove item"
            >
              <Trash2 class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <!-- Structured item fields (collapsible) -->
        <div
          v-if="mode === 'structured' && !isCollapsed(index)"
          class="space-y-4 p-3"
        >
          <CmsDynamicField
            v-for="subField in structuredFields"
            :key="subField.name"
            :field="subField"
            :model-value="item?.[subField.name]"
            @update:model-value="updateStructuredField(index, subField.name, $event)"
          />
        </div>

        <!-- Simple or single-field item -->
        <div
          v-if="mode === 'simple' || mode === 'single'"
          class="flex items-center gap-2 p-2"
        >
          <GripVertical class="h-4 w-4 shrink-0 text-muted-foreground/40" />

          <!-- Simple string input -->
          <input
            v-if="mode === 'simple'"
            type="text"
            :value="item"
            @input="updateItem(index, ($event.target as HTMLInputElement).value)"
            class="flex-1 rounded-md border bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Enter value..."
          />

          <!-- Single field widget -->
          <div v-else class="flex-1">
            <CmsDynamicField
              :field="{ ...singleField!, label: '', hint: '' }"
              :model-value="item"
              @update:model-value="updateItem(index, $event)"
            />
          </div>

          <div class="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              @click="moveItem(index, -1)"
              :disabled="index === 0"
              class="rounded p-1 hover:bg-muted disabled:opacity-30"
              title="Move up"
            >
              <ChevronUp class="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              @click="moveItem(index, 1)"
              :disabled="index === items.length - 1"
              class="rounded p-1 hover:bg-muted disabled:opacity-30"
              title="Move down"
            >
              <ChevronDown class="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              @click="removeItem(index)"
              class="rounded p-1 text-destructive/60 hover:bg-destructive/10 hover:text-destructive"
              title="Remove item"
            >
              <Trash2 class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else
      class="rounded-md border border-dashed border-muted-foreground/25 p-6 text-center"
    >
      <p class="text-sm text-muted-foreground">No items yet</p>
    </div>

    <!-- Add button -->
    <button
      v-if="canAdd"
      type="button"
      @click="addItem"
      class="mt-2 flex items-center gap-1.5 rounded-md border border-dashed px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
    >
      <Plus class="h-3.5 w-3.5" />
      Add {{ field.field?.label || 'item' }}
    </button>
  </div>
</template>
