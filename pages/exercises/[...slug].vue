<script setup lang="ts">
import { buildPracticeSchema } from '~/lib/oer-schema-builder'
import { nextTick } from 'vue'

const route = useRoute()
const isEmbed = computed(() => route.query.embed === 'true')

definePageMeta({
  layout: false
})

// Get the exercise path
const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const exercisePath = `/exercises/${slug.join('/')}`

console.log('[Exercise Page] Loading exercise:', exercisePath, 'embed mode:', isEmbed.value)

const { data: exercise } = await useAsyncData(
  `exercise-${exercisePath}`,
  () => queryCollection('exercises').path(exercisePath).first(),
  {
    // In embed mode, ensure we render on client to properly calculate height
    // This is critical for production/SSG builds
    server: !isEmbed.value,
    lazy: isEmbed.value
  }
)

console.log('[Exercise Page] Exercise data loaded:', {
  hasExercise: !!exercise.value,
  title: exercise.value?.title,
  isEmbed: isEmbed.value
})

// Debug logging for embed mode
if (import.meta.client) {
  watch([exercise, isEmbed], async ([exerciseVal, embedVal]) => {
    console.log('[Exercise Page] Data changed:', {
      isEmbed: embedVal,
      hasExercise: !!exerciseVal,
      exerciseTitle: exerciseVal?.title,
      exercisePath
    })
    
    // Trigger resize when content loads in embed mode
    if (embedVal && exerciseVal) {
      console.log('[Exercise Page] Content loaded, waiting for DOM update...')
      
      // Wait for Vue to update the DOM
      await nextTick()
      await nextTick() // Double nextTick to ensure all child components render
      
      // Wait a bit more for images/content to render
      await new Promise(resolve => setTimeout(resolve, 200))
      
      console.log('[Exercise Page] DOM should be ready, triggering multiple resizes')
      
      // Trigger multiple resize events
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          console.log(`[Exercise Page] Dispatching resize event ${i + 1}`)
          window.dispatchEvent(new Event('resize'))
        }, i * 300)
      }
    }
  }, { immediate: true })
}

const breadcrumbs = computed(() => [
  { label: 'Home', path: '/' },
  { label: 'Exercises', path: '/exercises' },
  { label: exercise.value?.title || 'Loading...' }
])

// Build OER Schema for SEO and discoverability
const oerSchema = computed(() => {
  if (!exercise.value) return null
  return buildPracticeSchema(exercise.value, 'https://yourdomain.com')
})
</script>

<template>
  <NuxtLayout :name="isEmbed ? 'embed' : 'docs'">
    <OERSchemaScript v-if="oerSchema" :schema="oerSchema" />
    
    <div v-if="exercise" key="exercise-content">
      <CollectionItem
        :breadcrumbs="isEmbed ? [] : breadcrumbs"
        :title="exercise.title"
        :author="exercise.author"
        :difficulty="exercise.difficulty"
        :license="exercise.license"
        :allowEmbed="isEmbed ? false : exercise.allowEmbed"
        :image="exercise.image"
        :imageAlt="exercise.imageAlt"
        :tags="exercise.tags"
        :attachments="exercise.attachments"
      >
        <ContentRenderer :value="exercise" />
      </CollectionItem>
    </div>
    <div v-else class="container py-8">
      <div class="text-center">
        <h1 class="text-2xl font-bold mb-4">Exercise not found</h1>
        <NuxtLink to="/exercises" class="text-primary hover:underline">
          ← Back to exercises
        </NuxtLink>
      </div>
    </div>
  </NuxtLayout>
</template>
