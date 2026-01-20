<script setup lang="ts">
import type { OERSchema } from '~/lib/oer-schema-builder';

interface Props {
  schema: OERSchema | null
}

const props = defineProps<Props>();

// Use Nuxt's useHead to inject JSON-LD script tag with a key to prevent duplicates
useHead(() => ({
  script: props.schema ? [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify(props.schema),
      key: 'oer-schema', // This key ensures only one schema exists
      tagPriority: 'high'
    }
  ] : []
}));
</script>

<template>
  <!-- No template needed, useHead handles the injection -->
</template>
