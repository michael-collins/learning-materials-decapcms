<script setup lang="ts">
import type { OERSchema } from '~/lib/oer-schema-builder';

interface Props {
  schema: OERSchema | null
}

const props = defineProps<Props>();

// Use Nuxt's useHead to inject JSON-LD script tag
watchEffect(() => {
  if (props.schema) {
    useHead({
      script: [
        {
          type: 'application/ld+json',
          children: JSON.stringify(props.schema)
        }
      ]
    });
  }
});
</script>

<template>
  <!-- No template needed, useHead handles the injection -->
</template>
