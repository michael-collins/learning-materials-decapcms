<template>
  <div v-if="hasSchemaObjects">
    <OERSchemaBadge @openObjects="isModalOpen = true" />
    <OERSchemaObjectsModal
      :is-open="isModalOpen"
      @close="isModalOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import OERSchemaBadge from '~/components/OERSchemaBadge.vue';
import OERSchemaObjectsModal from '~/components/OERSchemaObjectsModal.vue';

const isModalOpen = ref(false);
const hasSchemaObjects = ref(false);
let observer: MutationObserver | null = null;

const checkForSchemaObjects = () => {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  hasSchemaObjects.value = scripts.length > 0;
};

onMounted(async () => {
  // Check immediately
  await nextTick();
  checkForSchemaObjects();
  
  // Also watch for schema scripts being added dynamically
  observer = new MutationObserver(() => {
    checkForSchemaObjects();
  });
  
  observer.observe(document.head, {
    childList: true,
    subtree: true
  });
  
  // Check again after a short delay to catch late additions
  setTimeout(checkForSchemaObjects, 100);
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
});
</script>
