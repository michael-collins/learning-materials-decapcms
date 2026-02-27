<script setup lang="ts">
/**
 * Callout — Container MDC component for highlighted notes, tips, warnings, etc.
 *
 * Usage in MDC:
 *   :::callout{type="info" title="Note"}
 *   Your **markdown** content here.
 *   :::
 *
 * Types: info, tip, warning, danger, definition, objective
 */
interface Props {
  type?: 'info' | 'tip' | 'warning' | 'danger' | 'definition' | 'objective'
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
})

const iconMap: Record<string, string> = {
  info: 'ℹ️',
  tip: '💡',
  warning: '⚠️',
  danger: '🚫',
  definition: '📖',
  objective: '🎯',
}

const icon = computed(() => iconMap[props.type] || iconMap.info)
</script>

<template>
  <div :class="['callout', `callout-${type}`]" role="note">
    <div class="callout-icon" aria-hidden="true">{{ icon }}</div>
    <div class="callout-content">
      <div v-if="title" class="callout-title">{{ title }}</div>
      <ContentSlot unwrap="p" />
    </div>
  </div>
</template>
