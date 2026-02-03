<template>
  <div class="mt-4 pt-4 border-t border-border">
    <button
      @click="openObjects"
      @keydown.enter="openObjects"
      @keydown.space.prevent="openObjects"
      class="flex items-center gap-2 p-2 -m-2 rounded-md hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors cursor-pointer"
      aria-label="View OER Schema structured data for this page"
      type="button"
    >
      <img 
        :src="logoUrl"
        alt="OER Schema"
        class="h-6 w-auto"
        @error="handleImageError"
      />
      <span class="sr-only">Open OER Schema data modal</span>
    </button>
  </div>
</template>

<script setup lang="ts">
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
