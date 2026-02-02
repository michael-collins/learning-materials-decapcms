<template>
  <div class="oer-schema-badge">
    <div class="flex items-center gap-3">
      <img 
        :src="logoUrl"
        alt="OER Schema"
        class="h-6 w-auto"
        @error="handleImageError"
      />
      <Button
        variant="outline"
        size="sm"
        @click="openObjects"
        class="flex items-center gap-2"
      >
        <Icon name="lucide:file-code" class="w-4 h-4" />
        <span>OER Objects</span>
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from '~/components/ui/button/Button.vue';

const { isDark } = useTheme();

const logoUrl = computed(() => {
  return isDark.value
    ? 'https://cdn.jsdelivr.net/gh/open-curriculum/oerschema@master/public/oerschema-logo-white.png'
    : 'https://cdn.jsdelivr.net/gh/open-curriculum/oerschema@master/public/oerschema-logo-black.png';
});

const emit = defineEmits<{
  openObjects: []
}>();

const openObjects = () => {
  emit('openObjects');
};

const handleImageError = (event: Event) => {
  // Fallback to a simple icon if logo fails to load
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
};
</script>

<style scoped>
.oer-schema-badge {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgb(229 231 235);
}
</style>
