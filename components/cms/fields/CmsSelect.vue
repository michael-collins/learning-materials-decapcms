<script setup lang="ts">
/**
 * CmsSelect — Dropdown select field.
 * Maps to the CMS `select` widget.
 * Supports both single and multiple selection.
 */
import type { CmsFieldDef } from '~/lib/cms/config-types'
import { ChevronDown, X } from 'lucide-vue-next'

const props = defineProps<{
  field: CmsFieldDef
  modelValue: string | string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | string[]]
}>()

const isOpen = ref(false)

// Normalize options to { label, value } format
const normalizedOptions = computed(() => {
  if (!props.field.options) return []
  return props.field.options.map((opt) => {
    if (typeof opt === 'string') return { label: opt, value: opt }
    return opt
  })
})

const isMultiple = computed(() => props.field.multiple === true)

// Current value(s)
const selectedValues = computed<string[]>({
  get() {
    const v = props.modelValue ?? props.field.default
    if (v === undefined || v === null || v === '') return []
    if (Array.isArray(v)) return v
    return [String(v)]
  },
  set(newVal) {
    emit('update:modelValue', isMultiple.value ? newVal : (newVal[0] ?? ''))
  },
})

const displayLabel = computed(() => {
  if (selectedValues.value.length === 0) return ''
  if (isMultiple.value) return `${selectedValues.value.length} selected`
  const opt = normalizedOptions.value.find((o) => o.value === selectedValues.value[0])
  return opt?.label ?? selectedValues.value[0]
})

function toggleOption(optValue: string) {
  if (isMultiple.value) {
    const idx = selectedValues.value.indexOf(optValue)
    if (idx >= 0) {
      selectedValues.value = selectedValues.value.filter((v) => v !== optValue)
    } else {
      selectedValues.value = [...selectedValues.value, optValue]
    }
  } else {
    selectedValues.value = [optValue]
    isOpen.value = false
  }
}

function removeTag(optValue: string) {
  selectedValues.value = selectedValues.value.filter((v) => v !== optValue)
}

function isSelected(optValue: string) {
  return selectedValues.value.includes(optValue)
}

// Close on outside click
const wrapperRef = ref<HTMLElement>()
function handleClickOutside(e: MouseEvent) {
  if (wrapperRef.value && !wrapperRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}
onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div class="space-y-1.5">
    <label :for="`field-${field.name}`" class="text-sm font-medium">
      {{ field.label }}
      <span v-if="field.required !== false" class="text-destructive">*</span>
    </label>

    <!-- Multi-select tags -->
    <div v-if="isMultiple && selectedValues.length > 0" class="mb-1.5 flex flex-wrap gap-1">
      <span
        v-for="val in selectedValues"
        :key="val"
        class="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
      >
        {{ normalizedOptions.find(o => o.value === val)?.label ?? val }}
        <button type="button" class="rounded hover:bg-primary/20" @click="removeTag(val)">
          <X class="h-3 w-3" />
        </button>
      </span>
    </div>

    <!-- Dropdown -->
    <div ref="wrapperRef" class="relative">
      <button
        :id="`field-${field.name}`"
        type="button"
        :class="[
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          !displayLabel && 'text-muted-foreground'
        ]"
        @click="isOpen = !isOpen"
      >
        <span class="truncate">{{ displayLabel || `Select ${field.label.toLowerCase()}` }}</span>
        <ChevronDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>

      <Transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="scale-95 opacity-0"
        enter-to-class="scale-100 opacity-100"
        leave-active-class="transition duration-75 ease-in"
        leave-from-class="scale-100 opacity-100"
        leave-to-class="scale-95 opacity-0"
      >
        <div
          v-if="isOpen"
          class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md"
        >
          <!-- Clear option for single select -->
          <button
            v-if="!isMultiple && selectedValues.length > 0"
            type="button"
            class="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent"
            @click="selectedValues = []; isOpen = false"
          >
            Clear selection
          </button>

          <button
            v-for="opt in normalizedOptions"
            :key="opt.value"
            type="button"
            :class="[
              'flex w-full items-center rounded-sm px-2 py-1.5 text-sm transition-colors',
              isSelected(opt.value) ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-accent hover:text-accent-foreground'
            ]"
            @click="toggleOption(opt.value)"
          >
            <!-- Checkbox for multi-select -->
            <span v-if="isMultiple" class="mr-2 flex h-4 w-4 items-center justify-center rounded border">
              <svg v-if="isSelected(opt.value)" class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            {{ opt.label }}
          </button>
        </div>
      </Transition>
    </div>

    <p v-if="field.hint" class="text-xs text-muted-foreground">
      {{ field.hint }}
    </p>
  </div>
</template>
