<script setup lang="ts">
interface Props {
  id: string
  title?: string
}

const props = defineProps<Props>()

// Construct the embed URL
const embedUrl = computed(() => {
  return `https://www.youtube.com/embed/${props.id}`
})
</script>

<template>
  <div class="youtube-video-wrapper my-8">
    <div class="relative w-full overflow-hidden rounded-lg" style="padding-top: 56.25%;">
      <iframe
        :src="embedUrl"
        :title="title || 'YouTube video'"
        class="absolute top-0 left-0 w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      />
    </div>
    <p v-if="title" class="text-sm text-muted-foreground mt-2 text-center">
      {{ title }}
    </p>
  </div>
</template>

<style scoped>
.youtube-video-wrapper {
  max-width: 100%;
}
</style>
