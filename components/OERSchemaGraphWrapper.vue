<template>
  <div>
    <OERSchemaBadge @openObjects="isModalOpen = true" />
    <OERSchemaObjectsModal
      :is-open="isModalOpen"
      @close="isModalOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import OERSchemaBadge from '~/components/OERSchemaBadge.vue';
import OERSchemaObjectsModal from '~/components/OERSchemaObjectsModal.vue';

const isModalOpen = ref(false);
</script>
