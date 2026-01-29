<script setup lang="ts">
import { buildPracticeSchema } from '~/lib/oer-schema-builder'
import { nextTick } from 'vue'

const route = useRoute()
const router = useRouter()

// Redirect to embed route if embed query parameter is present
if (route.query.embed === 'true') {
  const slug = Array.isArray(route.params.slug) ? route.params.slug.join('/') : route.params.slug
  await navigateTo(`/embed/exercises/${slug}`, { replace: true })
}

definePageMeta({
  layout: 'docs'
})

// Get the exercise path
const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const baseSlug = slug.join('/');
const versionParam = route.query.version;

// Extract version string without 'v' prefix for display
const displayVersion = versionParam && typeof versionParam === 'string' ? versionParam : undefined

console.log('[Exercise Page] Loading exercise:', baseSlug, 'version:', versionParam)

const { data: exercise, pending } = await useAsyncData(
  `exercise-${baseSlug}-${versionParam || 'latest'}`,
  async () => {
    // If version param is provided, try the versioned path first
    if (versionParam) {
      const versionedPath = `/exercises/${baseSlug}/v${versionParam}`
      console.log('[Exercise Page] Trying versioned path:', versionedPath)
      const versioned = await queryCollection('exercises').path(versionedPath).first()
      if (versioned) {
        console.log('[Exercise Page] Found versioned:', versioned.title, versioned.version)
        return versioned
      }
      console.log('[Exercise Page] Versioned path not found, trying fallback')
    }
    
    // Fallback to latest (index)
    const latest = await queryCollection('exercises').path(`/exercises/${baseSlug}`).first()
    console.log('[Exercise Page] Fallback result:', latest?.title)
    return latest
  }
)

console.log('[Exercise Page] Exercise data loaded:', {
  hasExercise: !!exercise.value,
  title: exercise.value?.title
})

const breadcrumbs = computed(() => [
  { label: 'Home', path: '/' },
  { label: 'Exercises', path: '/exercises' },
  { label: exercise.value?.title || 'Loading...' }
])

// Build OER Schema for SEO and discoverability
const oerSchema = computed(() => {
  if (!exercise.value) return null
  // Get the base URL from the request
  const baseUrl = useRequestURL().origin
  return buildPracticeSchema(exercise.value, baseUrl)
})
</script>

<template>
  <div>
    <OERSchemaScript v-if="oerSchema" :schema="oerSchema" />
    
    <div v-if="pending" class="container py-8">
      <div class="flex justify-center items-center min-h-[400px]">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    </div>
    <div v-else-if="exercise" key="exercise-content">
      <CollectionItem
        :breadcrumbs="breadcrumbs"
        :title="exercise.title"
        :author="exercise.author"
        :difficulty="exercise.difficulty"
        :license="exercise.license"
        :aiLicense="exercise.aiLicense"
        :allowEmbed="exercise.allowEmbed"
        :image="exercise.image"
        :imageAlt="exercise.imageAlt"
        :tags="exercise.tags"
        :attachments="exercise.attachments"
        :versionStatus="exercise.versionStatus"
        :version="displayVersion"
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
  </div>
</template>
