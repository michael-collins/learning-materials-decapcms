<script setup lang="ts">
/**
 * CmsRelation — Content reference picker widget.
 *
 * Queries Nuxt Content for items in the referenced collection,
 * provides a searchable dropdown (combobox), and supports both
 * single and multiple selection modes.
 *
 * For multiple mode, selected items are displayed as reorderable tags.
 *
 * Config properties used:
 *  - collection: which collection to reference
 *  - value_field: field to store (e.g., "{{slug}}" or "slug")
 *  - search_fields: fields to search against (e.g., ["title"])
 *  - display_fields: fields to show in the picker (e.g., ["title"])
 *  - multiple: whether to allow selecting multiple items
 */
import type { DecapField } from '~/lib/cms/config-types'
import { Search, X, ChevronDown, ChevronUp, Loader2, Link } from 'lucide-vue-next'

const props = defineProps<{
  field: DecapField
  modelValue: any
}>()

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

// ─── Config extraction ─────────────────────────────────────
const collectionName = computed(() => props.field.collection ?? '')
const isMultiple = computed(() => !!props.field.multiple)
const valueField = computed(() => {
  // value_field can be "{{slug}}" or "slug" — strip template syntax
  const raw = props.field.value_field ?? 'slug'
  return raw.replace(/\{\{(.+?)\}\}/g, '$1')
})
const searchFieldNames = computed(() => props.field.search_fields ?? ['title'])
const displayFieldNames = computed(() => props.field.display_fields ?? ['title'])

// ─── State ──────────────────────────────────────────────────
const searchQuery = ref('')
const isOpen = ref(false)
const loading = ref(false)
const allItems = ref<Record<string, any>[]>([])

// Selected values (always work with arrays internally)
const selectedValues = computed({
  get: () => {
    if (isMultiple.value) {
      return Array.isArray(props.modelValue) ? props.modelValue : (props.modelValue ? [props.modelValue] : [])
    }
    return props.modelValue ? [props.modelValue] : []
  },
  set: (val: string[]) => {
    if (isMultiple.value) {
      emit('update:modelValue', val)
    } else {
      emit('update:modelValue', val[0] ?? '')
    }
  },
})

// ─── Fetch collection items via Nuxt Content ───────────────
async function fetchItems() {
  if (!collectionName.value) return

  loading.value = true
  try {
    // Use queryCollection to get all items from the referenced collection
    // We need basic fields: the value field + display fields + search fields
    const result = await queryCollection(collectionName.value as any)
      .select(['title', 'slug', 'description', 'stem', 'path'] as any)
      .order('title' as any, 'ASC')
      .all()

    allItems.value = (result as any[]).map((item: any) => {
      // Normalize: extract slug from the path/stem if not available directly
      const slug = item[valueField.value]
        ?? item.slug
        ?? item.stem?.split('/').pop()
        ?? ''

      return {
        ...item,
        _resolvedValue: slug,
        _displayLabel: getDisplayLabel(item),
      }
    })
  } catch (e) {
    console.warn(`[CmsRelation] Failed to fetch items from collection "${collectionName.value}":`, e)
    allItems.value = []
  } finally {
    loading.value = false
  }
}

/** Construct display label from display_fields */
function getDisplayLabel(item: Record<string, any>): string {
  const parts = displayFieldNames.value.map((f) => item[f] ?? '').filter(Boolean)
  return parts.join(' — ') || item.title || item.slug || 'Untitled'
}

// Fetch items on mount and when collection changes
onMounted(fetchItems)
watch(collectionName, fetchItems)

// ─── Filtered items (search) ───────────────────────────────
const filteredItems = computed(() => {
  if (!searchQuery.value.trim()) return allItems.value

  const q = searchQuery.value.toLowerCase()
  return allItems.value.filter((item) => {
    // Search across all search_fields
    return searchFieldNames.value.some((field) => {
      const val = item[field]
      return typeof val === 'string' && val.toLowerCase().includes(q)
    }) || item._displayLabel?.toLowerCase().includes(q)
      || item._resolvedValue?.toLowerCase().includes(q)
  })
})

// ─── Selection management ──────────────────────────────────

function selectItem(value: string) {
  if (isMultiple.value) {
    if (!selectedValues.value.includes(value)) {
      selectedValues.value = [...selectedValues.value, value]
    }
    searchQuery.value = ''
  } else {
    selectedValues.value = [value]
    isOpen.value = false
    searchQuery.value = ''
  }
}

function removeItem(value: string) {
  selectedValues.value = selectedValues.value.filter((v) => v !== value)
}

function clearSelection() {
  selectedValues.value = []
  searchQuery.value = ''
}

function moveItem(index: number, direction: -1 | 1) {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= selectedValues.value.length) return

  const copy = [...selectedValues.value]
  const temp = copy[index]
  copy[index] = copy[targetIndex]
  copy[targetIndex] = temp
  selectedValues.value = copy
}

/** Check if an item is already selected */
function isSelected(value: string): boolean {
  return selectedValues.value.includes(value)
}

/** Get display label for a selected value */
function getSelectedLabel(value: string): string {
  const item = allItems.value.find((i) => i._resolvedValue === value)
  return item?._displayLabel ?? value
}

// ─── Dropdown management ────────────────────────────────────
const inputRef = ref<HTMLInputElement>()

function openDropdown() {
  isOpen.value = true
  nextTick(() => inputRef.value?.focus())
}

function closeDropdown() {
  // Small delay to allow click events to fire
  setTimeout(() => {
    isOpen.value = false
    searchQuery.value = ''
  }, 150)
}

function handleInputKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    isOpen.value = false
    searchQuery.value = ''
  }
  if (e.key === 'Backspace' && !searchQuery.value && selectedValues.value.length > 0 && isMultiple.value) {
    // Remove last selected item on backspace in empty input
    selectedValues.value = selectedValues.value.slice(0, -1)
  }
}
</script>

<template>
  <div>
    <!-- Label -->
    <label class="mb-1.5 block text-sm font-medium">
      <Link class="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />
      {{ field.label }}
      <span v-if="field.required !== false" class="text-destructive">*</span>
      <span class="ml-1 text-xs text-muted-foreground font-normal">
        ({{ collectionName }})
      </span>
    </label>
    <p v-if="field.hint" class="mb-2 text-xs text-muted-foreground">{{ field.hint }}</p>

    <!-- Multi-select: selected tags with reorder -->
    <div v-if="isMultiple && selectedValues.length > 0" class="mb-2 flex flex-wrap gap-1.5">
      <div
        v-for="(val, index) in selectedValues"
        :key="val"
        class="group flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs"
      >
        <span class="truncate max-w-50">{{ getSelectedLabel(val) }}</span>

        <div class="flex items-center gap-0.5 ml-1">
          <button
            v-if="selectedValues.length > 1"
            type="button"
            @click="moveItem(index, -1)"
            :disabled="index === 0"
            class="rounded p-0.5 hover:bg-primary/20 disabled:opacity-30"
            title="Move left"
          >
            <ChevronUp class="h-3 w-3 -rotate-90" />
          </button>
          <button
            v-if="selectedValues.length > 1"
            type="button"
            @click="moveItem(index, 1)"
            :disabled="index === selectedValues.length - 1"
            class="rounded p-0.5 hover:bg-primary/20 disabled:opacity-30"
            title="Move right"
          >
            <ChevronDown class="h-3 w-3 -rotate-90" />
          </button>
          <button
            type="button"
            @click="removeItem(val)"
            class="rounded p-0.5 text-destructive/60 hover:bg-destructive/10 hover:text-destructive"
            title="Remove"
          >
            <X class="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>

    <!-- Combobox input -->
    <div class="relative">
      <div
        class="flex items-center rounded-md border bg-transparent transition-colors"
        :class="{ 'ring-2 ring-ring': isOpen }"
      >
        <Search class="ml-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          ref="inputRef"
          type="text"
          v-model="searchQuery"
          @focus="openDropdown"
          @blur="closeDropdown"
          @keydown="handleInputKeydown"
          :placeholder="isMultiple
            ? (selectedValues.length ? 'Search to add more...' : `Search ${collectionName}...`)
            : (selectedValues.length ? getSelectedLabel(selectedValues[0]) : `Search ${collectionName}...`)"
          class="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
          :class="{ 'placeholder:text-foreground': !isMultiple && selectedValues.length && !searchQuery }"
        />

        <!-- Loading spinner -->
        <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin text-muted-foreground" />

        <!-- Clear button (single mode) -->
        <button
          v-if="!isMultiple && selectedValues.length && !loading"
          type="button"
          @mousedown.prevent="clearSelection"
          class="mr-1 rounded p-1 hover:bg-muted"
          title="Clear selection"
        >
          <X class="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        <!-- Dropdown toggle -->
        <button
          type="button"
          @mousedown.prevent="isOpen ? (isOpen = false) : openDropdown()"
          class="mr-1 rounded p-1 hover:bg-muted"
        >
          <ChevronDown
            class="h-4 w-4 text-muted-foreground transition-transform"
            :class="{ 'rotate-180': isOpen }"
          />
        </button>
      </div>

      <!-- Dropdown results -->
      <div
        v-if="isOpen"
        class="absolute left-0 top-full z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover shadow-lg"
      >
        <!-- Loading state -->
        <div v-if="loading" class="flex items-center justify-center gap-2 p-4">
          <Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
          <span class="text-sm text-muted-foreground">Loading {{ collectionName }}...</span>
        </div>

        <!-- Results -->
        <template v-else-if="filteredItems.length > 0">
          <button
            v-for="item in filteredItems"
            :key="item._resolvedValue"
            type="button"
            @mousedown.prevent="selectItem(item._resolvedValue)"
            class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
            :class="{
              'bg-primary/5 text-primary': isSelected(item._resolvedValue),
              'opacity-50': isSelected(item._resolvedValue) && isMultiple,
            }"
          >
            <span class="flex-1 truncate">{{ item._displayLabel }}</span>
            <span
              v-if="isSelected(item._resolvedValue)"
              class="shrink-0 text-xs text-primary"
            >
              ✓
            </span>
            <span v-else class="shrink-0 text-xs text-muted-foreground truncate max-w-30">
              {{ item._resolvedValue }}
            </span>
          </button>
        </template>

        <!-- No results -->
        <div v-else class="p-4 text-center text-sm text-muted-foreground">
          <template v-if="searchQuery">
            No items match "{{ searchQuery }}"
          </template>
          <template v-else>
            No items found in {{ collectionName }}
          </template>
        </div>
      </div>
    </div>

    <!-- Current value display (for single mode, when dropdown is closed) -->
    <p
      v-if="!isMultiple && selectedValues.length && !isOpen"
      class="mt-1 text-xs text-muted-foreground"
    >
      Value: <code class="rounded bg-muted px-1">{{ selectedValues[0] }}</code>
    </p>

    <!-- Item count (for multiple mode) -->
    <p
      v-if="isMultiple && selectedValues.length"
      class="mt-1 text-xs text-muted-foreground"
    >
      {{ selectedValues.length }} item{{ selectedValues.length === 1 ? '' : 's' }} selected
    </p>
  </div>
</template>
