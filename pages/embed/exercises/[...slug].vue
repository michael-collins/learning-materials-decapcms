<script setup lang="ts">
import { buildPracticeSchema } from '~/lib/oer-schema-builder'

const route = useRoute()

definePageMeta({
  layout: 'embed'
})

// Get the exercise path
const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const exercisePath = `/exercises/${slug.join('/')}`

console.log('[Embed Exercise Page] Loading exercise:', exercisePath)

const { data: exercise } = await useAsyncData(
  `exercise-${exercisePath}`,
  () => queryCollection('exercises').path(exercisePath).first(),
  {
    lazy: true
  }
)

console.log('[Embed Exercise Page] Exercise data loaded:', {
  hasExercise: !!exercise.value,
  title: exercise.value?.title
})

// Generate OER Schema
const oerSchema = computed(() => {
  if (!exercise.value) return null
  
  return buildPracticeSchema({
    name: exercise.value.title,
    description: exercise.value.description,
    author: exercise.value.author,
    datePublished: exercise.value.date,
    license: exercise.value.license,
    difficulty: exercise.value.difficulty,
    learningResourceType: 'Exercise'
  })
})
</script>

<template>
  <div>
    <OERSchemaScript v-if="oerSchema" :schema="oerSchema" />
    
    <div v-if="exercise" key="exercise-content">
      <CollectionItem
        :breadcrumbs="[]"
        :title="exercise.title"
        :author="exercise.author"
        :difficulty="exercise.difficulty"
        :license="exercise.license"
        :aiLicense="exercise.aiLicense"
        :allowEmbed="false"
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
      </div>
    </div>
  </div>
</template>
