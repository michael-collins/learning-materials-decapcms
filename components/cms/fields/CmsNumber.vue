<script setup lang="ts">
/**
 * CmsNumber — Number input field.
 * Maps to the CMS `number` widget.
 * Supports min, max, step, and value_type (int/float).
 */
import type { CmsFieldDef } from '~/lib/cms/config-types'

const props = defineProps<{
  field: CmsFieldDef
  modelValue: number | string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number | string]
}>()

const value = computed({
  get() {
    const v = props.modelValue ?? props.field.default
    if (v === undefined || v === null || v === '') return ''
    return Number(v)
  },
  set(v: number | string) {
    if (v === '' || v === undefined) {
      emit('update:modelValue', '')
      return
    }
    const num = Number(v)
    if (props.field.value_type === 'int') {
      emit('update:modelValue', Math.round(num))
    } else {
      emit('update:modelValue', num)
    }
  },
})
</script>

<template>
  <div class="space-y-1.5">
    <label :for="`field-${field.name}`" class="text-sm font-medium">
      {{ field.label }}
      <span v-if="field.required !== false" class="text-destructive">*</span>
    </label>
    <input
      :id="`field-${field.name}`"
      v-model.number="value"
      type="number"
      :min="field.min"
      :max="field.max"
      :step="field.step ?? (field.value_type === 'int' ? 1 : 'any')"
      :required="field.required !== false"
      :placeholder="field.hint || `Enter ${field.label.toLowerCase()}`"
      class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    />
    <p v-if="field.hint" class="text-xs text-muted-foreground">
      {{ field.hint }}
    </p>
  </div>
</template>
