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

const { data: exercise, pending } = await useAsyncData(
  `exercise-${baseSlug}-${versionParam || 'latest'}`,
  async () => {
    // If version param is provided, try the versioned path first
    if (versionParam) {
      const versionedPath = `/exercises/${baseSlug}/v/${versionParam}`
      const versioned = await queryCollection('exercises').path(versionedPath).first()
      if (versioned) {
        return versioned
      }
    }
    
    // Fallback to latest (index)
    const latest = await queryCollection('exercises').path(`/exercises/${baseSlug}`).first()
    return latest
  }
)

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
    
    <Transition name="fade" mode="out-in">
      <div v-if="pending" key="loading" class="container py-8">
        <div class="flex justify-center items-center min-h-[400px]">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
      <div v-else-if="exercise" key="exercise-content">
        <CollectionItem
          :breadcrumbs="breadcrumbs"
          :title="exercise.title"
          :date="exercise.date"
          :author="exercise.author"
          :authorUrl="exercise.authorUrl"
          :difficulty="exercise.difficulty"
          :license="exercise.license"
          :aiLicense="exercise.aiLicense"
          :allowEmbed="exercise.allowEmbed"
          :image="exercise.image"
          :imageAlt="exercise.imageAlt"
          :prerequisites="exercise.prerequisites"
          :tags="exercise.tags"
          :attachments="exercise.attachments"
          :versionStatus="exercise.versionStatus"
          :version="displayVersion"
        >
          <ContentRenderer :value="exercise" />
        </CollectionItem>
      </div>
      <div v-else key="not-found" class="container py-8">
        <div class="text-center">
          <h1 class="text-2xl font-bold mb-4">Exercise not found</h1>
          <NuxtLink to="/exercises" class="text-primary hover:underline">
            ← Back to exercises
          </NuxtLink>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
