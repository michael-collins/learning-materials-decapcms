<script setup lang="ts">
import { buildAssociatedMaterialSchema } from '~/lib/oer-schema-builder'

const route = useRoute()

definePageMeta({
  layout: 'embed'
})

// Get the article path
const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const slugString = slug.join('/')

// Use versioned embed composable
const { content: article, versionParam, currentVersion, latestVersion, isOutdated, pending } = useVersionedEmbed('articles', slugString)

// Generate OER Schema
const oerSchema = computed(() => {
  if (!article.value) return null
  const baseUrl = useRequestURL().origin
  const articleWithPath = {
    ...article.value,
    _path: `/articles/${slugString}`
  }
  return buildAssociatedMaterialSchema(articleWithPath, baseUrl, versionParam.value)
})
</script>

<template>
  <div>
    <OERSchemaScript v-if="oerSchema" :schema="oerSchema" />
    
    <div v-if="article" key="article-content">
      <CollectionItem
        :breadcrumbs="[]"
        :title="article.title"
        :author="article.author"
        :authorUrl="article.authorUrl"
        :license="article.license"
        :aiLicense="article.aiLicense"
        :allowEmbed="false"
        :image="article.image"
        :imageAlt="article.imageAlt"
        :tags="article.tags"
        :attachments="article.attachments"
        :versionStatus="article.versionStatus"
        :hideMenu="true"
      >
        <ContentRenderer :value="article" />
      </CollectionItem>
    </div>
    <div v-else class="container py-8">
      <div class="text-center">
        <h1 class="text-2xl font-bold mb-4">Article not found</h1>
        <p class="text-gray-600">The requested article{{ versionParam ? ` (version ${versionParam})` : '' }} could not be found.</p>
      </div>
    </div>
  </div>
</template>
