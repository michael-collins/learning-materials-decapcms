<script setup lang="ts">
definePageMeta({
  layout: 'docs'
})

const { data: pathways } = await useAsyncData('pathways', () =>
  queryCollection('pathways').all()
)

const sortedPathways = computed(() => {
  if (!pathways.value) return []
  return [...pathways.value].sort((a, b) => a.title.localeCompare(b.title))
})
</script>

<template>
  <CollectionListing
    title="Pathways"
    description="Course-level learning pathways that guide your educational journey."
    :items="sortedPathways"
    :items-per-page="20"
  />
</template>
