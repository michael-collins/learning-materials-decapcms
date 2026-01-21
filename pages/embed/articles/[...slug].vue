<script setup lang="ts">
import { buildCourseSchema } from '~/lib/oer-schema-builder'

const route = useRoute()

definePageMeta({
  layout: 'embed'
})

// Get the article path
const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const articlePath = `/articles/${slug.join('/')}`

const { data: article } = await useAsyncData(
  `article-${articlePath}`,
  () => queryCollection('articles').path(articlePath).first()
)

// Generate OER Schema
const oerSchema = computed(() => {
  if (!article.value) return null
  const baseUrl = useRequestURL().origin
  return buildCourseSchema(article.value, baseUrl)
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
        :license="article.license"
        :aiLicense="article.aiLicense"
        :allowEmbed="false"
        :image="article.image"
        :imageAlt="article.imageAlt"
        :tags="article.tags"
        :attachments="article.attachments"
      >
        <ContentRenderer :value="article" />
      </CollectionItem>
    </div>
    <div v-else class="container py-8">
      <div class="text-center">
        <h1 class="text-2xl font-bold mb-4">Article not found</h1>
      </div>
    </div>
  </div>
</template>
