<script setup>
const route = useRoute()
const isEmbed = computed(() => route.query.embed === 'true')
const versionParam = route.query.version
const displayVersion = versionParam && typeof versionParam === 'string' ? versionParam : undefined

definePageMeta({
  layout: false
})

const baseSlug = route.params.slug.join('/')

const { data: tutorial, pending } = await useAsyncData(`tutorial-${baseSlug}-${versionParam || 'latest'}`, async () => {
  // If version param is provided, try the versioned path first
  if (versionParam) {
    const versionedPath = `/tutorials/${baseSlug}/v${versionParam}`
    const versioned = await queryCollection('tutorials').path(versionedPath).first()
    if (versioned) return versioned
  }
  
  // Fallback to latest (index)
  return queryCollection('tutorials').path(`/tutorials/${baseSlug}`).first()
})

const breadcrumbs = computed(() => [
  { label: 'Home', path: '/' },
  { label: 'Tutorials', path: '/tutorials' },
  { label: tutorial.value?.title || 'Loading...' }
])
</script>

<template>
  <NuxtLayout :name="isEmbed ? 'embed' : 'docs'">
    <div v-if="pending" class="container py-8">
      <div class="flex justify-center items-center min-h-[400px]">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    </div>
    <div v-else-if="tutorial">
      <CollectionItem
        :breadcrumbs="isEmbed ? [] : breadcrumbs"
        :title="tutorial.title"
        :description="tutorial.description"
        :date="tutorial.date"
        :author="tutorial.author"
        :difficulty="tutorial.difficulty"
        :license="tutorial.license"
        :allowEmbed="isEmbed ? false : tutorial.allowEmbed"
        :attachments="tutorial.attachments"
        :versionStatus="tutorial.versionStatus"
        :version="displayVersion"
      >
        <ContentRenderer :value="tutorial" />
      </CollectionItem>
    </div>
    <div v-else class="container py-8">
      <div class="text-center">
        <h1 class="text-2xl font-bold mb-4">Tutorial not found</h1>
        <NuxtLink to="/tutorials" class="text-primary hover:underline">
          ← Back to tutorials
        </NuxtLink>
      </div>
    </div>
  </NuxtLayout>
</template>
