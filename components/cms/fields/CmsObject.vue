<script setup lang="ts">
/**
 * CmsObject — Nested field group widget.
 *
 * Renders child `fields` recursively using DynamicField.
 * Displays as a collapsible section with a border.
 *
 * Object values are stored as a flat key-value record:
 * { fieldName1: value1, fieldName2: value2, ... }
 */
import type { DecapField } from '~/lib/cms/config-types'
import { ChevronRight } from 'lucide-vue-next'

const props = defineProps<{
  field: DecapField
  modelValue: any
}>()

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

/** Ensure the value is always an object */
const value = computed({
  get: () => {
    const v = props.modelValue
    return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}
  },
  set: (val) => emit('update:modelValue', val),
})

/** Sub-fields defined on this object */
const subFields = computed(() => props.field.fields ?? [])

/** Visible sub-fields (filter out hidden) */
const visibleFields = computed(() =>
  subFields.value.filter((f) => f.widget !== 'hidden')
)

/** Hidden sub-fields (need defaults applied) */
const hiddenFields = computed(() =>
  subFields.value.filter((f) => f.widget === 'hidden')
)

// ─── Collapse state ─────────────────────────────────────────
const isCollapsed = ref(false)

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}

// ─── Field updates ──────────────────────────────────────────
function updateField(fieldName: string, fieldValue: any) {
  value.value = { ...value.value, [fieldName]: fieldValue }
}

// ─── Initialize hidden field defaults ────────────────────────
onMounted(() => {
  let needsUpdate = false
  const current = { ...value.value }

  for (const field of hiddenFields.value) {
    if (current[field.name] === undefined && field.default !== undefined) {
      current[field.name] = field.default
      needsUpdate = true
    }
  }

  if (needsUpdate) {
    value.value = current
  }
})
</script>

<template>
  <div class="rounded-md border">
    <!-- Header -->
    <button
      type="button"
      @click="toggleCollapse"
      class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-muted/50 transition-colors"
    >
      <ChevronRight
        class="h-4 w-4 shrink-0 text-muted-foreground transition-transform"
        :class="{ 'rotate-90': !isCollapsed }"
      />
      {{ field.label }}
      <span v-if="field.required !== false" class="text-destructive">*</span>
    </button>

    <!-- Content -->
    <div
      v-if="!isCollapsed"
      class="space-y-4 border-t px-3 py-3"
    >
      <p v-if="field.hint" class="text-xs text-muted-foreground">{{ field.hint }}</p>

      <!-- Hidden fields (applied silently) -->
      <CmsDynamicField
        v-for="hField in hiddenFields"
        :key="hField.name"
        :field="hField"
        :model-value="value[hField.name]"
        @update:model-value="updateField(hField.name, $event)"
      />

      <!-- Visible sub-fields -->
      <CmsDynamicField
        v-for="subField in visibleFields"
        :key="subField.name"
        :field="subField"
        :model-value="value[subField.name]"
        @update:model-value="updateField(subField.name, $event)"
      />

      <!-- Empty state -->
      <p
        v-if="visibleFields.length === 0"
        class="text-sm text-muted-foreground italic"
      >
        No configurable fields in this group.
      </p>
    </div>
  </div>
</template>
