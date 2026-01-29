<script setup lang="ts">
import { buildLessonSchema } from '~/lib/oer-schema-builder'

const route = useRoute()

definePageMeta({
  layout: 'embed'
})

const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const slugString = slug.join('/')

// Use versioned embed composable
const { content: lesson, versionParam, currentVersion, latestVersion, isOutdated } = useVersionedEmbed('lessons', slugString)

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
    
    <div v-if="lesson" class="prose prose-sm max-w-none">
      <h1>{{ lesson.title }}</h1>
      <ContentRenderer :value="lesson" />
    </div>
    <div v-else>
      <p>The requested lesson{{ versionParam ? ` (version ${versionParam})` : '' }} could not be found.</p>
    </div>
  </div>
</template>
