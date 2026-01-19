<script setup lang="ts">
import { buildAssessmentSchema } from '~/lib/oer-schema-builder'

const route = useRoute()
const isEmbed = computed(() => route.query.embed === 'true')

definePageMeta({
  layout: false
})

// Get the project path
const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const projectPath = `/projects/${slug.join('/')}`

const { data: project } = await useAsyncData(`project-${projectPath}`, () =>
  queryCollection('projects').path(projectPath).first()
)

const breadcrumbs = computed(() => [
  { label: 'Home', path: '/' },
  { label: 'Projects', path: '/projects' },
  { label: project.value?.title || 'Loading...' }
])

// Build OER Schema for SEO and discoverability
const oerSchema = computed(() => {
  if (!project.value) return null
  return buildAssessmentSchema(project.value, 'https://yourdomain.com')
})
</script>

<template>
  <NuxtLayout :name="isEmbed ? 'embed' : 'docs'">
    <OERSchemaScript v-if="oerSchema" :schema="oerSchema" />
    
    <div v-if="project">
      <CollectionItem
        :breadcrumbs="isEmbed ? [] : breadcrumbs"
        :title="project.title"
        :author="project.author"
        :difficulty="project.difficulty"
        :license="project.license"
        :allowEmbed="isEmbed ? false : project.allowEmbed"
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
        <NuxtLink to="/projects" class="text-primary hover:underline">
          ← Back to projects
        </NuxtLink>
      </div>
    </div>
  </NuxtLayout>
</template>
