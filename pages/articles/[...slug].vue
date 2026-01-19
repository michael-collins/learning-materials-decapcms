<script setup>
definePageMeta({
  layout: 'docs'
})

const route = useRoute()
const articlePath = `/articles/${route.params.slug.join('/')}`

const { data: article } = await useAsyncData(`article-${articlePath}`, () =>
  queryCollection('articles').path(articlePath).first()
)

const breadcrumbs = computed(() => [
  { label: 'Home', path: '/' },
  { label: 'Articles', path: '/articles' },
  { label: article.value?.title || 'Loading...' }
])
</script>

<template>
  <div v-if="article">
    <CollectionItem
      :breadcrumbs="breadcrumbs"
      :title="article.title"
      :description="article.description"
      :date="article.date"
      :author="article.author"
      :difficulty="article.difficulty"
      :attachments="article.attachments"
    >
      <ContentRenderer :value="article" />
    </CollectionItem>
  </div>
  <div v-else class="container py-8">
    <div class="text-center">
      <h1 class="text-2xl font-bold mb-4">Article not found</h1>
      <NuxtLink to="/articles" class="text-primary hover:underline">
        ← Back to articles
      </NuxtLink>
    </div>
  </div>
</template>
