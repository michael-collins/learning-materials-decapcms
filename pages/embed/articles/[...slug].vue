<script setup lang="ts">
const route = useRoute()

definePageMeta({
  layout: 'embed'
})

// Get the article path
const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const slugString = slug.join('/')

// Use versioned embed composable
const { content: article, versionParam, currentVersion, latestVersion, isOutdated, pending } = useVersionedEmbed('articles', slugString)
</script>

<template>
  <div>
    <!-- Version notice banner -->
    <div v-if="isOutdated && currentVersion && latestVersion" 
         class="bg-amber-50 border-b border-amber-200 px-4 py-3 text-sm">
      <div class="container mx-auto flex items-center justify-between">
        <span class="text-amber-800">
          📌 Using version {{ currentVersion }}. 
          <a :href="`?version=latest`" class="underline font-medium hover:text-amber-900">
            Upgrade to {{ latestVersion }} →
          </a>
        </span>
      </div>
    </div>
    
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
        :versionStatus="article.versionStatus"
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
