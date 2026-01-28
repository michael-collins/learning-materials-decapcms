<script setup>
const route = useRoute()
const isEmbed = computed(() => route.query.embed === 'true')
const versionParam = route.query.version
const displayVersion = versionParam && typeof versionParam === 'string' ? versionParam : undefined

definePageMeta({
  layout: false
})

const baseSlug = route.params.slug.join('/')

const { data: article, pending } = await useAsyncData(`article-${baseSlug}-${versionParam || 'latest'}`, async () => {
  // If version param is provided, try the versioned path first
  if (versionParam) {
    const versionedPath = `/articles/${baseSlug}/v${versionParam}`
    const versioned = await queryCollection('articles').path(versionedPath).first()
    if (versioned) return versioned
  }
  
  // Fallback to latest (index)
  return queryCollection('articles').path(`/articles/${baseSlug}`).first()
})

const breadcrumbs = computed(() => [
  { label: 'Home', path: '/' },
  { label: 'Articles', path: '/articles' },
  { label: article.value?.title || 'Loading...' }
])
</script>

<template>
  <NuxtLayout :name="isEmbed ? 'embed' : 'docs'">
    <div v-if="pending" class="container py-8">
      <div class="flex justify-center items-center min-h-[400px]">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    </div>
    <div v-else-if="article">
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
        :versionStatus="article.versionStatus"
        :version="displayVersion"
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
