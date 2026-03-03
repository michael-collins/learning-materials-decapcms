<script setup lang="ts">
/**
 * CmsDatetime — Date/time picker field.
 * Maps to the CMS `datetime` and `date` widgets.
 */
import type { CmsFieldDef } from '~/lib/cms/config-types'

const props = defineProps<{
  field: CmsFieldDef
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isDateOnly = computed(() => props.field.widget === 'date')

// Store as ISO string, display as local datetime/date input
const inputValue = computed({
  get() {
    const v = props.modelValue ?? props.field.default as string ?? ''
    if (!v) return ''
    try {
      const d = new Date(v)
      if (isNaN(d.getTime())) return ''
      if (isDateOnly.value) {
        return d.toISOString().split('T')[0]
      }
      // datetime-local expects YYYY-MM-DDTHH:MM
      return d.toISOString().slice(0, 16)
    } catch {
      return ''
    }
  },
  set(v: string) {
    if (!v) {
      emit('update:modelValue', '')
      return
    }
    // Convert local input to ISO string
    const d = new Date(v)
    emit('update:modelValue', d.toISOString())
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
      v-model="inputValue"
      :type="isDateOnly ? 'date' : 'datetime-local'"
      :required="field.required !== false"
      class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    />
    <p v-if="field.hint" class="text-xs text-muted-foreground">
      {{ field.hint }}
    </p>
  </div>
</template>
