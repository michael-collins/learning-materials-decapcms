<script setup lang="ts">
import { buildLessonSchema } from '~/lib/oer-schema-builder'

const route = useRoute()

definePageMeta({
  layout: 'embed'
})

const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const lessonPath = `/lessons/${slug.join('/')}`

const { data: lesson } = await useAsyncData(`embed-lesson-${lessonPath}`, () =>
  queryCollection('lessons').path(lessonPath).first()
)

// Build OER Schema
const oerSchema = computed(() => {
  if (!lesson.value) return null
  const baseUrl = useRequestURL().origin
  return buildLessonSchema(lesson.value, undefined, undefined, baseUrl)
})
</script>

<template>
  <div>
    <OERSchemaScript v-if="oerSchema" :schema="oerSchema" />
    
    <div v-if="lesson" class="prose prose-sm max-w-none">
      <h1>{{ lesson.title }}</h1>
      <ContentRenderer :value="lesson" />
    </div>
    <div v-else>
      <p>Lesson not found</p>
    </div>
  </div>
</template>
