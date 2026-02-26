<script setup lang="ts">
/**
 * CmsMarkdown — Markdown body editor.
 * Maps to Decap's `markdown` widget.
 *
 * Phase 1: Plain textarea with markdown syntax.
 * Phase 3: Will be replaced with Tiptap rich editor.
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

const lineCount = computed(() => (value.value.match(/\n/g) || []).length + 1)
</script>

<template>
  <div class="space-y-1.5">
    <div class="flex items-center justify-between">
      <label :for="`field-${field.name}`" class="text-sm font-medium">
        {{ field.label }}
        <span v-if="field.required !== false" class="text-destructive">*</span>
      </label>
      <span class="text-xs text-muted-foreground">
        {{ lineCount }} lines · Markdown
      </span>
    </div>
    <textarea
      :id="`field-${field.name}`"
      v-model="value"
      :placeholder="field.hint || 'Write your content in Markdown...'"
      :required="field.required !== false"
      rows="16"
      class="flex min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    />
    <p class="text-xs text-muted-foreground">
      Supports Markdown syntax. Rich editor coming soon.
    </p>
  </div>
</template>
