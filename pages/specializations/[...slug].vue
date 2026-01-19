<script setup lang="ts">
import { buildLearningComponentSchema } from '~/lib/oer-schema-builder'

const route = useRoute()

// Get the specialization path
const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const specializationPath = `/specializations/${slug.join('/')}`

const { data: specialization } = await useAsyncData(`specialization-${specializationPath}`, () =>
  queryCollection('specializations').path(specializationPath).first()
)

const breadcrumbs = computed(() => [
  { label: 'Home', path: '/' },
  { label: 'Specializations', path: '/specializations' },
  { label: specialization.value?.title || 'Loading...' }
])

// Build OER Schema for SEO and discoverability
const oerSchema = computed(() => {
  if (!specialization.value) return null
  return buildLearningComponentSchema(specialization.value, 'https://yourdomain.com')
})
</script>

<template>
  <NuxtLayout name="docs">
    <OERSchemaScript v-if="oerSchema" :schema="oerSchema" />
    
    <div v-if="specialization">
      <CollectionItem
        :breadcrumbs="breadcrumbs"
        :title="specialization.title"
        :description="specialization.whoItsFor"
        :image="specialization.image"
        :imageAlt="specialization.imageAlt"
      >
        <ContentRenderer :value="specialization" />
      </CollectionItem>
    </div>
    <div v-else class="container py-8">
      <div class="text-center">
        <h1 class="text-2xl font-bold mb-4">Specialization not found</h1>
        <NuxtLink to="/specializations" class="text-primary hover:underline">
          ← Back to specializations
        </NuxtLink>
      </div>
    </div>
  </NuxtLayout>
</template>
