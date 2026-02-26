<script setup lang="ts">
/**
 * CmsText — Textarea field.
 * Maps to the CMS `text` widget.
 */
import type { CmsFieldDef } from '~/lib/cms/config-types'

const props = defineProps<{
  field: CmsFieldDef
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const value = computed({
  get: () => props.modelValue ?? props.field.default as string ?? '',
  set: (v) => emit('update:modelValue', v),
})
</script>

<template>
  <div class="space-y-1.5">
    <label :for="`field-${field.name}`" class="text-sm font-medium">
      {{ field.label }}
      <span v-if="field.required !== false" class="text-destructive">*</span>
    </label>
    <textarea
      :id="`field-${field.name}`"
      v-model="value"
      :placeholder="field.hint || `Enter ${field.label.toLowerCase()}`"
      :required="field.required !== false"
      rows="4"
      class="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    />
    <p v-if="field.hint" class="text-xs text-muted-foreground">
      {{ field.hint }}
    </p>
  </div>
</template>
