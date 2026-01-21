<script setup lang="ts">
import { buildSupportingMaterialSchema } from '~/lib/oer-schema-builder'

const route = useRoute()

definePageMeta({
  layout: 'embed'
})

// Get the lecture path
const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const lecturePath = `/lectures/${slug.join('/')}`

const { data: lecture } = await useAsyncData(
  `lecture-${lecturePath}`,
  () => queryCollection('lectures').path(lecturePath).first()
)

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
      >
        <ContentRenderer :value="lecture" />
      </CollectionItem>
    </div>
    <div v-else class="container py-8">
      <div class="text-center">
        <h1 class="text-2xl font-bold mb-4">Lecture not found</h1>
      </div>
    </div>
  </div>
</template>
