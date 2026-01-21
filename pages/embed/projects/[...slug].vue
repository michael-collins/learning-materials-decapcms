<script setup lang="ts">
import { buildAssessmentSchema } from '~/lib/oer-schema-builder'

const route = useRoute()

definePageMeta({
  layout: 'embed'
})

// Get the project path
const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const projectPath = `/projects/${slug.join('/')}`

const { data: project } = await useAsyncData(
  `project-${projectPath}`,
  () => queryCollection('projects').path(projectPath).first()
)

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
      >
        <ContentRenderer :value="project" />
      </CollectionItem>
    </div>
    <div v-else class="container py-8">
      <div class="text-center">
        <h1 class="text-2xl font-bold mb-4">Project not found</h1>
      </div>
    </div>
  </div>
</template>
