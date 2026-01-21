<script setup lang="ts">
import { buildCourseSchema } from '~/lib/oer-schema-builder'

const route = useRoute()

definePageMeta({
  layout: 'embed'
})

// Get the tutorial path
const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const tutorialPath = `/tutorials/${slug.join('/')}`

const { data: tutorial } = await useAsyncData(
  `tutorial-${tutorialPath}`,
  () => queryCollection('tutorials').path(tutorialPath).first()
)

// Generate OER Schema
const oerSchema = computed(() => {
  if (!tutorial.value) return null
  const baseUrl = useRequestURL().origin
  return buildCourseSchema(tutorial.value, baseUrl)
})
</script>

<template>
  <div>
    <OERSchemaScript v-if="oerSchema" :schema="oerSchema" />
    
    <div v-if="tutorial" key="tutorial-content">
      <CollectionItem
        :breadcrumbs="[]"
        :title="tutorial.title"
        :author="tutorial.author"
        :difficulty="tutorial.difficulty"
        :license="tutorial.license"
        :aiLicense="tutorial.aiLicense"
        :allowEmbed="false"
        :image="tutorial.image"
        :imageAlt="tutorial.imageAlt"
        :tags="tutorial.tags"
        :attachments="tutorial.attachments"
      >
        <ContentRenderer :value="tutorial" />
      </CollectionItem>
    </div>
    <div v-else class="container py-8">
      <div class="text-center">
        <h1 class="text-2xl font-bold mb-4">Tutorial not found</h1>
      </div>
    </div>
  </div>
</template>
