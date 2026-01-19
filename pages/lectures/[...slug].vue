<script setup lang="ts">
import { buildSupportingMaterialSchema } from '~/lib/oer-schema-builder'

const route = useRoute()

// Get the lecture path
const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const lecturePath = `/lectures/${slug.join('/')}`

const { data: lecture } = await useAsyncData(`lecture-${lecturePath}`, () =>
  queryCollection('lectures').path(lecturePath).first()
)

const breadcrumbs = computed(() => [
  { label: 'Home', path: '/' },
  { label: 'Lectures', path: '/lectures' },
  { label: lecture.value?.title || 'Loading...' }
])

// Build OER Schema for SEO and discoverability
const oerSchema = computed(() => {
  if (!lecture.value) return null
  return buildSupportingMaterialSchema(lecture.value, 'https://yourdomain.com')
})
</script>

<template>
  <NuxtLayout name="docs">
    <OERSchemaScript v-if="oerSchema" :schema="oerSchema" />
    
    <div v-if="lecture">
      <CollectionItem
        :breadcrumbs="breadcrumbs"
        :title="lecture.title"
        :author="lecture.author"
      >
        <ContentRenderer :value="lecture" />
      </CollectionItem>
    </div>
    <div v-else class="container py-8">
      <div class="text-center">
        <h1 class="text-2xl font-bold mb-4">Lecture not found</h1>
        <NuxtLink to="/lectures" class="text-primary hover:underline">
          ← Back to lectures
        </NuxtLink>
      </div>
    </div>
  </NuxtLayout>
</template>
