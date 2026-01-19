<script setup lang="ts">
import { buildPracticeSchema } from '~/lib/oer-schema-builder'

const route = useRoute()
const isEmbed = computed(() => route.query.embed === 'true')

definePageMeta({
  layout: false
})

// Get the exercise path
const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const exercisePath = `/exercises/${slug.join('/')}`

const { data: exercise } = await useAsyncData(`exercise-${exercisePath}`, () =>
  queryCollection('exercises').path(exercisePath).first()
)

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
    
    <div v-if="exercise">
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
