<script setup lang="ts">
/**
 * ContentDivider — Horizontal rule with optional label text.
 *
 * Usage in MDC:
 *   :::content-divider{label="Section 2"}
 *   :::
 *
 *   :::content-divider
 *   :::
 */
interface Props {
  label?: string
}

defineProps<Props>()
</script>

<template>
  <div class="mdc-divider" role="separator">
    <span v-if="label" class="mdc-divider-label">{{ label }}</span>
  </div>
</template>
