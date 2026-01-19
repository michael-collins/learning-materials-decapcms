<script setup lang="ts">
import { buildCourseSchema } from '~/lib/oer-schema-builder'

const route = useRoute()

// Get the pathway path
const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const pathwayPath = `/pathways/${slug.join('/')}`

const { data: pathway } = await useAsyncData(`pathway-${pathwayPath}`, () =>
  queryCollection('pathways').path(pathwayPath).first()
)

const breadcrumbs = computed(() => [
  { label: 'Home', path: '/' },
  { label: 'Pathways', path: '/pathways' },
  { label: pathway.value?.title || 'Loading...' }
])

// Build OER Schema for SEO and discoverability
const oerSchema = computed(() => {
  if (!pathway.value) return null
  return buildCourseSchema(pathway.value, 'https://yourdomain.com')
})
</script>

<template>
  <NuxtLayout name="docs">
    <OERSchemaScript v-if="oerSchema" :schema="oerSchema" />
    
    <div v-if="pathway">
      <CollectionItem
        :breadcrumbs="breadcrumbs"
        :title="pathway.title"
        :description="pathway.description"
        :image="pathway.image"
        :imageAlt="pathway.imageAlt"
      >
        <ContentRenderer :value="pathway" />
      </CollectionItem>
    </div>
    <div v-else class="container py-8">
      <div class="text-center">
        <h1 class="text-2xl font-bold mb-4">Pathway not found</h1>
        <NuxtLink to="/pathways" class="text-primary hover:underline">
          ← Back to pathways
        </NuxtLink>
      </div>
    </div>
  </NuxtLayout>
</template>
