<script setup lang="ts">
/**
 * CardBlock — Styled card container for highlighted content.
 *
 * Usage in MDC:
 *   :::card-block{title="Summary" variant="outlined"}
 *   Card content with **markdown** support.
 *   :::
 *
 * Variants: outlined (default), filled, elevated
 */
interface Props {
  title?: string
  variant?: 'outlined' | 'filled' | 'elevated'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'outlined',
})

const variantClass = computed(() => {
  if (props.variant === 'filled') return 'mdc-card-filled'
  if (props.variant === 'elevated') return 'mdc-card-elevated'
  return ''
})
</script>

<template>
  <div :class="['mdc-card', variantClass]">
    <div v-if="title" class="mdc-card-header">
      <h3 class="mdc-card-title">{{ title }}</h3>
    </div>
    <div class="mdc-card-body">
      <ContentSlot unwrap="p" />
    </div>
  </div>
</template>
