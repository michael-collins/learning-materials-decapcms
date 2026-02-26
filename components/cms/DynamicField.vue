<script setup lang="ts">
/**
 * DynamicField — Routes a Decap field config to the correct widget component.
 *
 * This is the core of the form engine. It receives a field definition
 * from config.yml and renders the appropriate CMS field component with v-model.
 */
import type { DecapField, DecapWidgetType } from '~/lib/cms/config-types'

import CmsString from './fields/CmsString.vue'
import CmsText from './fields/CmsText.vue'
import CmsBoolean from './fields/CmsBoolean.vue'
import CmsSelect from './fields/CmsSelect.vue'
import CmsDatetime from './fields/CmsDatetime.vue'
import CmsHidden from './fields/CmsHidden.vue'
import CmsNumber from './fields/CmsNumber.vue'
import CmsMarkdown from './fields/CmsMarkdown.vue'

const props = defineProps<{
  field: DecapField
  modelValue: any
}>()

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

/**
 * Widget type → component mapping.
 * Phase 2+ will add: CmsList, CmsTypedList, CmsRelation, CmsObject, CmsImage, CmsFile
 */
const widgetMap: Record<string, any> = {
  string: CmsString,
  text: CmsText,
  boolean: CmsBoolean,
  select: CmsSelect,
  datetime: CmsDatetime,
  date: CmsDatetime,
  hidden: CmsHidden,
  number: CmsNumber,
  markdown: CmsMarkdown,
}

const component = computed(() => {
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
