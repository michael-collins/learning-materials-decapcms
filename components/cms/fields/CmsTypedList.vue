<script setup lang="ts">
/**
 * CmsTypedList — Polymorphic list widget for Decap CMS typed lists.
 *
 * Used for fields with `types` (e.g., prerequisites, lesson items).
 * Each item has a type selector that determines which fields to render.
 * The type is stored via a `__typename` hidden field.
 *
 * This is the most complex widget — prerequisites span 8 content types,
 * each with a relation field to a different collection.
 */
import type { DecapField, DecapListType } from '~/lib/cms/config-types'
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown, ChevronRight, Layers } from 'lucide-vue-next'

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

/** Available type definitions from the field config */
const typeDefinitions = computed(() => props.field.types ?? [])

/** Map of type name → type definition for quick lookup */
const typeMap = computed(() => {
  const map = new Map<string, DecapListType>()
  for (const t of typeDefinitions.value) {
    map.set(t.name, t)
  }
  return map
})

// ─── Determine item type ──────────────────────────────────

/**
 * Get the type name for an item.
 * Decap stores typed list items as: { type: "typeName", ...fields }
 * OR within the item's fields as __typename.
 * We check both patterns.
 */
function getItemTypeName(item: any): string | null {
  if (!item || typeof item !== 'object') return null

  // Pattern 1: Decap stores type under `type` key at the item level
  if (item.type && typeMap.value.has(item.type)) return item.type

  // Pattern 2: __typename hidden field
  if (item.__typename && typeMap.value.has(item.__typename)) return item.__typename

  // Pattern 3: Check if the item matches by having the relation field for a type
  for (const [typeName, typeDef] of typeMap.value) {
    const relationField = typeDef.fields.find((f) => f.widget === 'relation')
    if (relationField && item[relationField.name] !== undefined) {
      return typeName
    }
  }

  return null
}

function getItemType(item: any): DecapListType | null {
  const name = getItemTypeName(item)
  return name ? typeMap.value.get(name) ?? null : null
}

/**
 * Get the visible (non-hidden) fields for a type definition.
 * Hidden fields like __typename are applied automatically.
 */
function getVisibleFields(typeDef: DecapListType): DecapField[] {
  return typeDef.fields.filter((f) => f.widget !== 'hidden')
}

// ─── CRUD operations ──────────────────────────────────────

/** Show the type picker for adding a new item */
const showTypePicker = ref(false)

function addItem(typeName: string) {
  const typeDef = typeMap.value.get(typeName)
  if (!typeDef) return

  // Create a new item with defaults from the type's fields
  const newItem: Record<string, any> = { type: typeName }
  for (const field of typeDef.fields) {
    if (field.name === '__typename') {
      newItem.__typename = field.default ?? typeName
    } else if (field.default !== undefined) {
      newItem[field.name] = field.default
    } else {
      newItem[field.name] = getEmptyFieldValue(field)
    }
  }

  items.value = [...items.value, newItem]
  showTypePicker.value = false
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

function updateItemField(index: number, fieldName: string, value: any) {
  const copy = [...items.value]
  copy[index] = { ...copy[index], [fieldName]: value }
  items.value = copy
}

/** Change the type of an existing item (clears field values) */
function changeItemType(index: number, newTypeName: string) {
  const typeDef = typeMap.value.get(newTypeName)
  if (!typeDef) return

  const newItem: Record<string, any> = { type: newTypeName }
  for (const field of typeDef.fields) {
    if (field.name === '__typename') {
      newItem.__typename = field.default ?? newTypeName
    } else if (field.default !== undefined) {
      newItem[field.name] = field.default
    } else {
      newItem[field.name] = getEmptyFieldValue(field)
    }
  }

  const copy = [...items.value]
  copy[index] = newItem
  items.value = copy
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

// ─── Collapse state ───────────────────────────────────────
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

/** Get a friendly label for an item (type label + relation value) */
function getItemLabel(item: any, index: number): string {
  const typeDef = getItemType(item)
  if (!typeDef) return `Item ${index + 1}`

  // Try to find the relation field value for a nicer label
  const relationField = typeDef.fields.find((f) => f.widget === 'relation')
  if (relationField && item[relationField.name]) {
    return `${typeDef.label}: ${item[relationField.name]}`
  }

  return typeDef.label
}

/** Get a color class for a type (consistent visual grouping) */
const typeColors: Record<string, string> = {
  lessons: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  lectures: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  tutorials: 'bg-green-500/10 text-green-600 dark:text-green-400',
  exercises: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  articles: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  projects: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  specializations: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  pathways: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
}

function getTypeColor(typeName: string): string {
  return typeColors[typeName] ?? 'bg-muted text-muted-foreground'
}
</script>

<template>
  <div>
    <!-- Label -->
    <label class="mb-2 block text-sm font-medium">
      <Layers class="mr-1 inline h-4 w-4 text-muted-foreground" />
      {{ field.label }}
      <span v-if="field.required !== false" class="text-destructive">*</span>
    </label>
    <p v-if="field.hint" class="mb-3 text-xs text-muted-foreground">{{ field.hint }}</p>

    <!-- Items list -->
    <div v-if="items.length > 0" class="space-y-2">
      <div
        v-for="(item, index) in items"
        :key="index"
        class="rounded-md border bg-card"
      >
        <!-- Item header -->
        <div class="flex items-center gap-2 px-3 py-2 bg-muted/30">
          <GripVertical class="h-4 w-4 shrink-0 text-muted-foreground/40" />

          <!-- Type badge -->
          <span
            v-if="getItemType(item)"
            class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
            :class="getTypeColor(getItemTypeName(item) ?? '')"
          >
            {{ getItemType(item)?.label }}
          </span>
          <span v-else class="text-xs text-yellow-600">Unknown type</span>

          <!-- Clickable label -->
          <button
            type="button"
            @click="toggleCollapse(index)"
            class="flex-1 text-left text-sm truncate text-muted-foreground hover:text-foreground"
          >
            <ChevronRight
              class="mr-1 inline h-3 w-3 transition-transform"
              :class="{ 'rotate-90': !isCollapsed(index) }"
            />
            {{ getItemLabel(item, index) }}
          </button>

          <!-- Reorder / remove controls -->
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

        <!-- Item fields (collapsible) -->
        <div v-if="!isCollapsed(index)" class="space-y-4 p-3 border-t">
          <!-- Type selector (to change item type) -->
          <div>
            <label class="mb-1 block text-xs font-medium text-muted-foreground">Type</label>
            <select
              :value="getItemTypeName(item) ?? ''"
              @change="changeItemType(index, ($event.target as HTMLSelectElement).value)"
              class="w-full rounded-md border bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="" disabled>Select type...</option>
              <option
                v-for="typeDef in typeDefinitions"
                :key="typeDef.name"
                :value="typeDef.name"
              >
                {{ typeDef.label }}
              </option>
            </select>
          </div>

          <!-- Render visible fields for the item's type -->
          <template v-if="getItemType(item)">
            <CmsDynamicField
              v-for="subField in getVisibleFields(getItemType(item)!)"
              :key="subField.name"
              :field="subField"
              :model-value="item?.[subField.name]"
              :parent-data="item"
              @update:model-value="updateItemField(index, subField.name, $event)"
            />
          </template>

          <!-- No type selected fallback -->
          <p
            v-else
            class="text-sm text-muted-foreground italic"
          >
            Select a type above to configure this item.
          </p>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else
      class="rounded-md border border-dashed border-muted-foreground/25 p-6 text-center"
    >
      <Layers class="mx-auto h-8 w-8 text-muted-foreground/30" />
      <p class="mt-2 text-sm text-muted-foreground">No items yet</p>
    </div>

    <!-- Add button with type picker -->
    <div class="relative mt-2">
      <button
        type="button"
        @click="showTypePicker = !showTypePicker"
        class="flex items-center gap-1.5 rounded-md border border-dashed px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <Plus class="h-3.5 w-3.5" />
        Add {{ field.label?.replace(/s$/, '') || 'item' }}
      </button>

      <!-- Type picker dropdown -->
      <div
        v-if="showTypePicker"
        class="absolute left-0 top-full z-20 mt-1 w-64 rounded-md border bg-popover p-1 shadow-lg"
      >
        <button
          v-for="typeDef in typeDefinitions"
          :key="typeDef.name"
          type="button"
          @click="addItem(typeDef.name)"
          class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
        >
          <span
            class="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium"
            :class="getTypeColor(typeDef.name)"
          >
            {{ typeDef.label }}
          </span>
        </button>
      </div>
    </div>

    <!-- Click-outside to close type picker -->
    <Teleport to="body">
      <div
        v-if="showTypePicker"
        class="fixed inset-0 z-10"
        @click="showTypePicker = false"
      />
    </Teleport>
  </div>
</template>
