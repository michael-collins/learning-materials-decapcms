<script setup lang="ts">
import { buildPracticeSchema } from '~/lib/oer-schema-builder'
import { resolveContentVersion, getLatestVersionNumber } from '~/lib/version-resolver'

const route = useRoute()

definePageMeta({
  layout: 'embed'
})

// Get the exercise path
const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const slugString = slug.join('/')
const exercisePath = `/exercises/${slugString}`

// Get version parameter from query
const versionParam = route.query.version as string | undefined

console.log('[Embed Exercise Page] Loading exercise:', exercisePath, 'version:', versionParam || 'latest')

// Resolve version
const { data: exercise } = await useAsyncData(
  `exercise-${exercisePath}-${versionParam || 'latest'}`,
  async () => {
    // Try version-aware resolution first
    if (versionParam) {
      const versionedContent = await resolveContentVersion('exercises', slugString, versionParam)
      if (versionedContent) return versionedContent
    }
    
    // Fallback to standard query
    return queryCollection('exercises').path(exercisePath).first()
  },
  {
    lazy: true
  }
)

// Get latest version for comparison
const { data: latestVersion } = await useAsyncData(
  `exercise-latest-version-${slugString}`,
  () => getLatestVersionNumber('exercises', slugString),
  {
    lazy: true
  }
)

const currentVersion = computed(() => exercise.value?.version)
const isOutdated = computed(() => {
  if (!currentVersion.value || !latestVersion.value) return false
  return currentVersion.value !== latestVersion.value
})

console.log('[Embed Exercise Page] Exercise data loaded:', {
  hasExercise: !!exercise.value,
  title: exercise.value?.title,
  currentVersion: currentVersion.value,
  latestVersion: latestVersion.value,
  isOutdated: isOutdated.value
})

// Generate OER Schema
const oerSchema = computed(() => {
  if (!exercise.value) return null
  
  return buildPracticeSchema({
    name: exercise.value.title,
    description: exercise.value.description,
    author: exercise.value.author,
    datePublished: exercise.value.date,
    license: exercise.value.license,
    difficulty: exercise.value.difficulty,
    learningResourceType: 'Exercise'
  })
})
</script>

<template>
  <div>
    <OERSchemaScript v-if="oerSchema" :schema="oerSchema" />
    
    <!-- Version notice banner -->
    <div v-if="isOutdated && currentVersion && latestVersion" 
         class="bg-amber-50 border-b border-amber-200 px-4 py-3 text-sm">
      <div class="container mx-auto flex items-center justify-between">
        <span class="text-amber-800">
          📌 Using version {{ currentVersion }}. 
          <a :href="`?version=latest`" class="underline font-medium hover:text-amber-900">
            Upgrade to {{ latestVersion }} →
          </a>
        </span>
      </div>
    </div>
    
    <div v-if="exercise" key="exercise-content">
      <CollectionItem
        :breadcrumbs="[]"
        :title="exercise.title"
        :author="exercise.author"
        :difficulty="exercise.difficulty"
        :license="exercise.license"
        :aiLicense="exercise.aiLicense"
        :allowEmbed="false"
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
        <p class="text-gray-600">The requested exercise{{ versionParam ? ` (version ${versionParam})` : '' }} could not be found.</p>
      </div>
    </div>
  </div>
</template>
