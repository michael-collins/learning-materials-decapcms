<script setup>
const route = useRoute()
const isEmbed = computed(() => route.query.embed === 'true')

definePageMeta({
  layout: false
})

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
  <NuxtLayout :name="isEmbed ? 'embed' : 'docs'">
    <div v-if="article">
      <CollectionItem
        :breadcrumbs="isEmbed ? [] : breadcrumbs"
        :title="article.title"
        :description="article.description"
        :date="article.date"
        :author="article.author"
        :difficulty="article.difficulty"
        :license="article.license"
        :allowEmbed="isEmbed ? false : article.allowEmbed"
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
  </NuxtLayout>
</template>
