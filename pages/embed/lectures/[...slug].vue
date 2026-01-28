<script setup lang="ts">
import { buildSupportingMaterialSchema } from '~/lib/oer-schema-builder'

const route = useRoute()

definePageMeta({
  layout: 'embed'
})

// Get the lecture path
const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const slugString = slug.join('/')

// Use versioned embed composable
const { content: lecture, versionParam, currentVersion, latestVersion, isOutdated } = useVersionedEmbed('lectures', slugString)

// Generate OER Schema
const oerSchema = computed(() => {
  if (!lecture.value) return null
  const baseUrl = useRequestURL().origin
  return buildSupportingMaterialSchema(lecture.value, baseUrl)
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
    
    <div v-if="lecture" key="lecture-content">
      <CollectionItem
        :breadcrumbs="[]"
        :title="lecture.title"
        :author="lecture.author"
        :difficulty="lecture.difficulty"
        :license="lecture.license"
        :aiLicense="lecture.aiLicense"
        :allowEmbed="false"
        :image="lecture.image"
        :imageAlt="lecture.imageAlt"
        :tags="lecture.tags"
        :attachments="lecture.attachments"
        :versionStatus="lecture.versionStatus"
      >
        <ContentRenderer :value="lecture" />
      </CollectionItem>
    </div>
    <div v-else class="container py-8">
      <div class="text-center">
        <h1 class="text-2xl font-bold mb-4">Lecture not found</h1>
        <p class="text-gray-600">The requested lecture{{ versionParam ? ` (version ${versionParam})` : '' }} could not be found.</p>
      </div>
    </div>
  </div>
</template>
