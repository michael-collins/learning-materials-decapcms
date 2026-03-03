<script setup lang="ts">
/**
 * CmsHidden — Hidden field with default value.
 * Maps to the CMS `hidden` widget.
 * Not rendered visually; ensures a default value is present in form data.
 */
import type { CmsFieldDef } from '~/lib/cms/config-types'

const props = defineProps<{
  field: CmsFieldDef
  modelValue: unknown
}>()

const emit = defineEmits<{
  'update:modelValue': [value: unknown]
}>()

// Ensure default is applied on mount
onMounted(() => {
  if (props.modelValue === undefined || props.modelValue === null) {
    emit('update:modelValue', props.field.default ?? '')
  }
})
</script>

<template>
  <!-- Hidden fields are not rendered -->
  <input type="hidden" :name="field.name" :value="String(modelValue ?? field.default ?? '')" />
</template>
