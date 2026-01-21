<script setup lang="ts">
import { buildCourseSchema } from '~/lib/oer-schema-builder'

const route = useRoute()

definePageMeta({
  layout: 'embed'
})

// Get the pathway path
const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const pathwayPath = `/pathways/${slug.join('/')}`

const { data: pathway } = await useAsyncData(
  `pathway-${pathwayPath}`,
  () => queryCollection('pathways').path(pathwayPath).first()
)

// Generate OER Schema
const oerSchema = computed(() => {
  if (!pathway.value) return null
  const baseUrl = useRequestURL().origin
  return buildCourseSchema(pathway.value, baseUrl)
})
</script>

<template>
  <div>
    <OERSchemaScript v-if="oerSchema" :schema="oerSchema" />
    
    <div v-if="pathway" key="pathway-content">
      <CollectionItem
        :breadcrumbs="[]"
        :title="pathway.title"
        :author="pathway.author"
        :difficulty="pathway.difficulty"
        :license="pathway.license"
        :aiLicense="pathway.aiLicense"
        :allowEmbed="false"
        :image="pathway.image"
        :imageAlt="pathway.imageAlt"
        :tags="pathway.tags"
        :attachments="pathway.attachments"
      >
        <ContentRenderer :value="pathway" />
      </CollectionItem>
    </div>
    <div v-else class="container py-8">
      <div class="text-center">
        <h1 class="text-2xl font-bold mb-4">Pathway not found</h1>
      </div>
    </div>
  </div>
</template>
