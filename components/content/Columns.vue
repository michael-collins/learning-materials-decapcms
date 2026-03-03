<script setup lang="ts">
/**
 * Columns — Multi-column layout using named slots.
 *
 * Usage in MDC:
 *   :::columns{count="2" gap="md"}
 *   #left
 *   Left column content.
 *
 *   #right
 *   Right column content.
 *   :::
 *
 *   :::columns{count="3" gap="lg"}
 *   #first
 *   Column 1.
 *
 *   #second
 *   Column 2.
 *
 *   #third
 *   Column 3.
 *   :::
 */
interface Props {
  count?: '2' | '3' | '4'
  gap?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  count: '2',
  gap: 'md',
})

const gridClass = computed(() => `mdc-columns-${props.count}`)
const gapClass = computed(() => `mdc-columns-gap-${props.gap}`)
</script>

<template>
  <div :class="['mdc-columns', gridClass, gapClass]">
    <div class="mdc-col">
      <ContentSlot :name="count === '2' ? 'left' : 'first'" unwrap="p" />
    </div>
    <div class="mdc-col">
      <ContentSlot :name="count === '2' ? 'right' : 'second'" unwrap="p" />
    </div>
    <div v-if="Number(count) >= 3" class="mdc-col">
      <ContentSlot name="third" unwrap="p" />
    </div>
    <div v-if="Number(count) >= 4" class="mdc-col">
      <ContentSlot name="fourth" unwrap="p" />
    </div>
  </div>
</template>
