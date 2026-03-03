<script setup lang="ts">
/**
 * Spacer — Vertical spacing control (atom component, no nested content).
 *
 * Usage in MDC:
 *   ::spacer{size="lg"}
 *   ::
 *
 * Sizes: sm (1rem), md (2rem), lg (4rem), xl (6rem)
 */
interface Props {
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
})
</script>

<template>
  <div :class="`mdc-spacer-${size}`" aria-hidden="true" />
</template>
