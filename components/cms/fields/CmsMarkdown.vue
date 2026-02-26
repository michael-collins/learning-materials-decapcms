<script setup lang="ts">
/**
 * CmsMarkdown — Markdown body editor widget.
 * Maps to Decap's `markdown` widget.
 *
 * Uses the Tiptap-powered MarkdownEditor with rich text, split preview,
 * code mode, and MDC component insertion toolbar.
 */
import type { DecapField } from '~/lib/cms/config-types'

const props = defineProps<{
  field: DecapField
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const value = computed({
  get: () => props.modelValue ?? '',
  set: (v) => emit('update:modelValue', v),
})
</script>

<template>
  <div class="space-y-1.5">
    <label :for="`field-${field.name}`" class="text-sm font-medium">
      {{ field.label }}
      <span v-if="field.required !== false" class="text-destructive">*</span>
    </label>

    <CmsEditorMarkdownEditor
      :model-value="value"
      @update:model-value="value = $event"
      :placeholder="field.hint || 'Start writing your content...'"
    />
  </div>
</template>
