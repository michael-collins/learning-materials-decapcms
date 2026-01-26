<script setup lang="ts">
const route = useRoute()

definePageMeta({
  layout: 'embed'
})

// Get the article path
const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const articlePath = `/articles/${slug.join('/')}`

const { data: article, pending } = await useAsyncData(
  `article-${articlePath}`,
  () => queryCollection('articles').path(articlePath).first()
)
</script>

<template>
  <div>
    <div v-if="pending" class="container py-8">
      <div class="flex justify-center items-center min-h-[300px]">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    </div>
    <div v-else-if="article" key="article-content">
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
