<script setup lang="ts">
/**
 * Accordion — Collapsible content section for progressive disclosure.
 *
 * Usage in MDC:
 *   :::accordion{title="Click to expand"}
 *   Hidden content revealed on click.
 *   :::
 */
interface Props {
  title: string
  open?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
})

const isOpen = ref(props.open)

function toggle() {
  isOpen.value = !isOpen.value
}
</script>

<template>
  <div class="mdc-accordion" :data-open="isOpen">
    <button
      type="button"
      class="mdc-accordion-trigger"
      :aria-expanded="isOpen"
      @click="toggle"
    >
      <span>{{ title }}</span>
      <svg class="mdc-accordion-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
    <div v-show="isOpen" class="mdc-accordion-body">
      <ContentSlot unwrap="p" />
    </div>
  </div>
</template>
