<script setup>
const route = useRoute()
const isEmbed = computed(() => route.query.embed === 'true')

definePageMeta({
  layout: 'docs'
})

const tutorialPath = `/tutorials/${route.params.slug.join('/')}`

const { data: tutorial } = await useAsyncData(`tutorial-${tutorialPath}`, () =>
  queryCollection('tutorials').path(tutorialPath).first()
)

const breadcrumbs = computed(() => [
  { label: 'Home', path: '/' },
  { label: 'Tutorials', path: '/tutorials' },
  { label: tutorial.value?.title || 'Loading...' }
])

// Switch to embed layout if embed parameter is present
if (isEmbed.value) {
  definePageMeta({
    layout: 'embed'
  })
}
</script>

<template>
  <div v-if="tutorial">
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
</template>
