<script setup lang="ts">
/**
 * Figure — Captioned wrapper for any nested content (images, diagrams, etc.).
 *
 * Usage in MDC:
 *   :::figure{caption="Figure 1: Architecture Diagram" align="center"}
 *   ::image-component{src="/img/arch.png" alt="Architecture"}
 *   ::
 *   :::
 */
interface Props {
  caption?: string
  align?: 'left' | 'center' | 'right'
}

const props = withDefaults(defineProps<Props>(), {
  align: 'center',
})

const alignmentClass = computed(() => {
  if (props.align === 'left') return 'mdc-align-left'
  if (props.align === 'right') return 'mdc-align-right'
  return 'mdc-align-center'
})
</script>

<template>
  <figure :class="['mdc-figure', alignmentClass]">
    <ContentSlot />
    <figcaption v-if="caption" class="mdc-figure-caption">
      {{ caption }}
    </figcaption>
  </figure>
</template>
