<script setup lang="ts">
import { buildAssessmentSchema } from '~/lib/oer-schema-builder'

const route = useRoute()

definePageMeta({
  layout: 'embed'
})

// Get the project path
const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const slugString = slug.join('/')

// Use versioned embed composable
const { content: project, versionParam, currentVersion, latestVersion, isOutdated } = useVersionedEmbed('projects', slugString)

// Generate OER Schema
const oerSchema = computed(() => {
  if (!project.value) return null
  const baseUrl = useRequestURL().origin
  return buildAssessmentSchema(project.value, baseUrl)
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
    
    <div v-if="project" key="project-content">
      <CollectionItem
        :breadcrumbs="[]"
        :title="project.title"
        :author="project.author"
        :difficulty="project.difficulty"
        :license="project.license"
        :aiLicense="project.aiLicense"
        :allowEmbed="false"
        :image="project.image"
        :imageAlt="project.imageAlt"
        :tags="project.tags"
        :attachments="project.attachments"
        :versionStatus="project.versionStatus"
      >
        <ContentRenderer :value="project" />
      </CollectionItem>
    </div>
    <div v-else class="container py-8">
      <div class="text-center">
        <h1 class="text-2xl font-bold mb-4">Project not found</h1>
        <p class="text-gray-600">The requested project{{ versionParam ? ` (version ${versionParam})` : '' }} could not be found.</p>
      </div>
    </div>
  </div>
</template>
