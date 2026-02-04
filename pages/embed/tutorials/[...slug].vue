<script setup lang="ts">
import { buildAssociatedMaterialSchema } from '~/lib/oer-schema-builder'

const route = useRoute()

definePageMeta({
  layout: 'embed'
})

// Get the tutorial path
const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const slugString = slug.join('/')

// Use versioned embed composable
const { content: tutorial, versionParam, currentVersion, latestVersion, isOutdated } = useVersionedEmbed('tutorials', slugString)

// Generate OER Schema
const oerSchema = computed(() => {
  if (!tutorial.value) return null
  const baseUrl = useRequestURL().origin
  const tutorialWithPath = {
    ...tutorial.value,
    _path: `/tutorials/${slugString}`
  }
  return buildAssociatedMaterialSchema(tutorialWithPath, baseUrl, versionParam.value)
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
        :authorUrl="tutorial.authorUrl"
        :difficulty="tutorial.difficulty"
        :license="tutorial.license"
        :aiLicense="tutorial.aiLicense"
        :allowEmbed="false"
        :image="tutorial.image"
        :imageAlt="tutorial.imageAlt"
        :tags="tutorial.tags"
        :attachments="tutorial.attachments"
        :versionStatus="tutorial.versionStatus"
        :hideMenu="true"
      >
        <ContentRenderer :value="tutorial" />
      </CollectionItem>
    </div>
    <div v-else class="container py-8">
      <div class="text-center">
        <h1 class="text-2xl font-bold mb-4">Tutorial not found</h1>
        <p class="text-gray-600">The requested tutorial{{ versionParam ? ` (version ${versionParam})` : '' }} could not be found.</p>
      </div>
    </div>
  </div>
</template>
