<script setup lang="ts">
/**
 * CmsString — Text input field.
 * Maps to Decap's `string` widget.
 * Supports `pattern` validation.
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
  get: () => props.modelValue ?? props.field.default as string ?? '',
  set: (v) => emit('update:modelValue', v),
})

const patternError = ref('')

function validate() {
  if (props.field.pattern) {
    const [regex, message] = props.field.pattern
    if (value.value && !new RegExp(regex).test(value.value)) {
      patternError.value = message
      return
    }
  }
  patternError.value = ''
}
</script>

<template>
  <div class="space-y-1.5">
    <label :for="`field-${field.name}`" class="text-sm font-medium">
      {{ field.label }}
      <span v-if="field.required !== false" class="text-destructive">*</span>
    </label>
    <input
      :id="`field-${field.name}`"
      v-model="value"
      type="text"
      :placeholder="field.hint || `Enter ${field.label.toLowerCase()}`"
      :required="field.required !== false"
      class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      @blur="validate"
    />
    <p v-if="field.hint && !patternError" class="text-xs text-muted-foreground">
      {{ field.hint }}
    </p>
    <p v-if="patternError" class="text-xs text-destructive">
      {{ patternError }}
    </p>
  </div>
</template>
