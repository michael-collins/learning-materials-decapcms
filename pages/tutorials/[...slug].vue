<script setup>
definePageMeta({
  layout: 'docs'
})

const route = useRoute()
const tutorialPath = `/tutorials/${route.params.slug.join('/')}`

const { data: tutorial } = await useAsyncData(`tutorial-${tutorialPath}`, () =>
  queryCollection('tutorials').path(tutorialPath).first()
)

const breadcrumbs = computed(() => [
  { label: 'Home', path: '/' },
  { label: 'Tutorials', path: '/tutorials' },
  { label: tutorial.value?.title || 'Loading...' }
])
</script>

<template>
  <div v-if="tutorial">
    <CollectionItem
      :breadcrumbs="breadcrumbs"
      :title="tutorial.title"
      :description="tutorial.description"
      :date="tutorial.date"
      :author="tutorial.author"
      :difficulty="tutorial.difficulty"
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
