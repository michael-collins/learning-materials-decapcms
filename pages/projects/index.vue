<script setup lang="ts">
definePageMeta({
  layout: 'docs'
})

const { data: projects } = await useAsyncData('projects', () =>
  queryCollection('projects').all()
)

const sortedProjects = computed(() => {
  if (!projects.value) return []
  return [...projects.value].sort((a, b) => a.title.localeCompare(b.title))
})
</script>

<template>
  <CollectionListing
    title="Projects"
    description="Assessment activities and larger assignments that demonstrate mastery of skills."
    :items="sortedProjects"
    :items-per-page="20"
  />
</template>
