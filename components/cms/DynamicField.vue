<script setup lang="ts">
/**
 * DynamicField — Routes a Decap field config to the correct widget component.
 *
 * This is the core of the form engine. It receives a field definition
 * from config.yml and renders the appropriate CMS field component with v-model.
 */
import type { DecapField, DecapWidgetType } from '~/lib/cms/config-types'

// Phase 1: Basic widgets
import CmsString from './fields/CmsString.vue'
import CmsText from './fields/CmsText.vue'
import CmsBoolean from './fields/CmsBoolean.vue'
import CmsSelect from './fields/CmsSelect.vue'
import CmsDatetime from './fields/CmsDatetime.vue'
import CmsHidden from './fields/CmsHidden.vue'
import CmsNumber from './fields/CmsNumber.vue'
import CmsMarkdown from './fields/CmsMarkdown.vue'

// Phase 2: Complex widgets
import CmsList from './fields/CmsList.vue'
import CmsTypedList from './fields/CmsTypedList.vue'
import CmsRelation from './fields/CmsRelation.vue'
import CmsObject from './fields/CmsObject.vue'
import CmsImage from './fields/CmsImage.vue'
import CmsFile from './fields/CmsFile.vue'

const props = defineProps<{
  field: DecapField
  modelValue: any
}>()

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

/**
 * Widget type → component mapping.
 * All Decap widget types are now supported.
 */
const widgetMap: Record<string, any> = {
  // Phase 1: Basic
  string: CmsString,
  text: CmsText,
  boolean: CmsBoolean,
  select: CmsSelect,
  datetime: CmsDatetime,
  date: CmsDatetime,
  hidden: CmsHidden,
  number: CmsNumber,
  markdown: CmsMarkdown,
  // Phase 2: Complex
  relation: CmsRelation,
  object: CmsObject,
  image: CmsImage,
  file: CmsFile,
  // list is special — routed below based on whether it has `types`
}

const component = computed(() => {
  // Special routing for list widget: typed list vs regular list
  if (props.field.widget === 'list') {
    return props.field.types && props.field.types.length > 0
      ? CmsTypedList
      : CmsList
  }
  return widgetMap[props.field.widget] ?? null
})

const widgetName = computed(() => props.field.widget)
</script>

<template>
  <component
    :is="component"
    v-if="component"
    :field="field"
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
  />

  <!-- Unsupported widget fallback -->
  <div
    v-else
    class="rounded-md border border-dashed border-yellow-500/50 bg-yellow-500/5 p-3"
  >
    <p class="text-sm font-medium text-yellow-600 dark:text-yellow-400">
      Unsupported widget: <code class="rounded bg-muted px-1">{{ widgetName }}</code>
    </p>
    <p class="mt-0.5 text-xs text-muted-foreground">
      {{ field.label }} ({{ field.name }}) — This widget type will be supported in a future phase.
    </p>
    <!-- Still render the raw value if present -->
    <pre v-if="modelValue !== undefined && modelValue !== null" class="mt-2 overflow-auto rounded bg-muted p-2 text-xs">{{ JSON.stringify(modelValue, null, 2) }}</pre>
  </div>
</template>
