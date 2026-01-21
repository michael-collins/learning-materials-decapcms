<script setup lang="ts">
import { buildSupportingMaterialSchema } from '~/lib/oer-schema-builder'

const route = useRoute()
const isEmbed = computed(() => route.query.embed === 'true')

definePageMeta({
  layout: false
})

// Get the lecture path
const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const lecturePath = `/lectures/${slug.join('/')}`

const { data: lecture, pending } = await useAsyncData(`lecture-${lecturePath}`, () =>
  queryCollection('lectures').path(lecturePath).first()
)

// Debug log
watch(lecture, (newValue) => {
  if (newValue) {
    console.log('[Lectures Page] Lecture data:', {
      title: newValue.title,
      allowEmbed: newValue.allowEmbed,
      hasLicense: !!newValue.license,
      hasAiLicense: !!newValue.aiLicense
    })
  }
}, { immediate: true })

const breadcrumbs = computed(() => [
  { label: 'Home', path: '/' },
  { label: 'Lectures', path: '/lectures' },
  { label: lecture.value?.title || 'Loading...' }
])

// Build OER Schema for SEO and discoverability
const oerSchema = computed(() => {
  if (!lecture.value) return null
  // Get the base URL from the request
  const baseUrl = useRequestURL().origin
  return buildSupportingMaterialSchema(lecture.value, baseUrl)
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
    <div v-else-if="lecture">
      <CollectionItem
        :breadcrumbs="isEmbed ? [] : breadcrumbs"
        :title="lecture.title"
        :author="lecture.author"
        :license="lecture.license"
        :aiLicense="lecture.aiLicense"
        :allowEmbed="lecture.allowEmbed"
        :image="lecture.image"
        :imageAlt="lecture.imageAlt"
        :tags="lecture.tags"
        :attachments="lecture.attachments"
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
