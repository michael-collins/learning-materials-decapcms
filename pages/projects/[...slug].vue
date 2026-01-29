<script setup lang="ts">
import { buildAssessmentSchema } from '~/lib/oer-schema-builder'

const route = useRoute()
const isEmbed = computed(() => route.query.embed === 'true')

definePageMeta({
  layout: false
})

// Get the project path
const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const baseSlug = slug.join('/');
const versionParam = route.query.version;
const displayVersion = versionParam && typeof versionParam === 'string' ? versionParam : undefined

const { data: project, pending } = await useAsyncData(`project-${baseSlug}-${versionParam || 'latest'}`, async () => {
  // If version param is provided, try the versioned path first
  if (versionParam) {
    const versionedPath = `/projects/${baseSlug}/v/${versionParam}`
    const versioned = await queryCollection('projects').path(versionedPath).first()
    if (versioned) return versioned
  }
  
  // Fallback to latest (index)
  return queryCollection('projects').path(`/projects/${baseSlug}`).first()
})

const breadcrumbs = computed(() => [
  { label: 'Home', path: '/' },
  { label: 'Projects', path: '/projects' },
  { label: project.value?.title || 'Loading...' }
])

// Build OER Schema for SEO and discoverability
const oerSchema = computed(() => {
  if (!project.value) return null
  // Get the base URL from the request
  const baseUrl = useRequestURL().origin
  return buildAssessmentSchema(project.value, baseUrl)
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
    <div v-else-if="project">
      <CollectionItem
        :breadcrumbs="isEmbed ? [] : breadcrumbs"
        :title="project.title"
        :author="project.author"
        :difficulty="project.difficulty"
        :license="project.license"
        :aiLicense="project.aiLicense"
        :allowEmbed="isEmbed ? false : project.allowEmbed"
        :image="project.image"
        :imageAlt="project.imageAlt"
        :tags="project.tags"
        :attachments="project.attachments"
        :versionStatus="project.versionStatus"        :version="displayVersion"      >
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
