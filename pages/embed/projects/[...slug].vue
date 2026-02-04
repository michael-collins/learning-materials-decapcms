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
  return buildAssessmentSchema(project.value, baseUrl, versionParam.value)
})
</script>

<template>
  <div>
    <OERSchemaScript v-if="oerSchema" :schema="oerSchema" />
    
    <div v-if="project" key="project-content">
      <CollectionItem
        :breadcrumbs="[]"
        :title="project.title"
        :date="project.date"
        :author="project.author"
        :authorUrl="project.authorUrl"
        :difficulty="project.difficulty"
        :license="project.license"
        :aiLicense="project.aiLicense"
        :allowEmbed="false"
        :image="project.image"
        :imageAlt="project.imageAlt"
        :tags="project.tags"
        :attachments="project.attachments"
        :versionStatus="project.versionStatus"
        :hideMenu="true"
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
