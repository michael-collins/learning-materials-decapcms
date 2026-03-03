<script setup lang="ts">
interface Props {
  id: string
  title?: string
  caption?: string
  align?: 'left' | 'center' | 'right' | 'full'
  size?: 'small' | 'medium' | 'large' | 'full'
  float?: 'left' | 'right' | 'none'
}

const props = defineProps<Props>()

const { layoutClasses } = useMdcLayout(props)

// Construct the embed URL
const embedUrl = computed(() => {
  return `https://www.youtube.com/embed/${props.id}`
})
</script>

<template>
  <div class="youtube-video-wrapper my-8" :class="layoutClasses">
    <div class="relative w-full overflow-hidden rounded-lg" style="padding-top: 56.25%;">
      <iframe
        :src="embedUrl"
        :title="title || 'YouTube video'"
        class="absolute top-0 left-0 w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      />
    </div>
    <p v-if="title || caption" class="text-sm text-muted-foreground mt-2 text-center">
      {{ caption || title }}
    </p>
  </div>
</template>
