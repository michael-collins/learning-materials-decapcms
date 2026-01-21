<script setup lang="ts">
import { buildCourseSchema } from '~/lib/oer-schema-builder'

const route = useRoute()
const isEmbed = computed(() => route.query.embed === 'true')

definePageMeta({
  layout: false
})

// Get the pathway path
const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const pathwayPath = `/pathways/${slug.join('/')}`

const { data: pathway, pending } = await useAsyncData(`pathway-${pathwayPath}`, () =>
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
  // Get the base URL from the request
  const baseUrl = useRequestURL().origin
  return buildCourseSchema(pathway.value, baseUrl)
})
</script>

<template>
  <NuxtLayout :name="isEmbed ? 'embed' : 'docs'">
    <OERSchemaScript v-if="oerSchema" :schema="oerSchema" />
    
    <div v-if="pending" class="container py-8">
      <div class="flex justify-center items-center min-h-[400px]">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    </div>
    <div v-else-if="pathway">
      <CollectionItem
        :breadcrumbs="isEmbed ? [] : breadcrumbs"
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
