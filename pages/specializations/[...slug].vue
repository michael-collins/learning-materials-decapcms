<script setup lang="ts">
import { buildLearningComponentSchema } from '~/lib/oer-schema-builder'

const route = useRoute()
const isEmbed = computed(() => route.query.embed === 'true')

definePageMeta({
  layout: false
})

// Get the specialization path
const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const specializationPath = `/specializations/${slug.join('/')}`

const { data: specialization, pending } = await useAsyncData(`specialization-${specializationPath}`, () =>
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
  // Get the base URL from the request
  const baseUrl = useRequestURL().origin
  return buildLearningComponentSchema(specialization.value, baseUrl)
})
</script>

<template>
  <NuxtLayout :name="isEmbed ? 'embed' : 'docs'">
    <OERSchemaScript v-if="oerSchema" :schema="oerSchema" />
        <div v-if="pending" class="container py-8">
      <div class="flex justify-center items-center min-h-[400px]">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    </div>    <div v-if="specialization">
      <CollectionItem
        :breadcrumbs="isEmbed ? [] : breadcrumbs"
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
