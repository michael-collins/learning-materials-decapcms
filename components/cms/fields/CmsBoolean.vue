<script setup lang="ts">
/**
 * CmsBoolean — Switch/toggle field.
 * Maps to the CMS `boolean` widget.
 */
import type { CmsFieldDef } from '~/lib/cms/config-types'

const props = defineProps<{
  field: CmsFieldDef
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const value = computed({
  get: () => props.modelValue ?? props.field.default as boolean ?? false,
  set: (v) => emit('update:modelValue', v),
})
</script>

<template>
  <div class="flex items-center justify-between gap-4 rounded-md border px-4 py-3">
    <div>
      <label :for="`field-${field.name}`" class="text-sm font-medium">
        {{ field.label }}
      </label>
      <p v-if="field.hint" class="text-xs text-muted-foreground">
        {{ field.hint }}
      </p>
    </div>
    <button
      :id="`field-${field.name}`"
      type="button"
      role="switch"
      :aria-checked="value"
      :class="[
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        value ? 'bg-primary' : 'bg-input'
      ]"
      @click="value = !value"
    >
      <span
        :class="[
          'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform',
          value ? 'translate-x-5' : 'translate-x-0'
        ]"
      />
    </button>
  </div>
</template>
