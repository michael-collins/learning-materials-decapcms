<script setup>
definePageMeta({
  layout: 'docs'
})

const { data: rawTutorials, pending } = await useAsyncData('tutorials', () =>
  queryCollection('tutorials').all()
)

const tutorials = computed(() => {
  if (!rawTutorials.value) return []
  return [...rawTutorials.value].sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0
    const dateB = b.date ? new Date(b.date).getTime() : 0
    return dateB - dateA
  })
})
</script>

<template>
  <CollectionListing
    title="Tutorials"
    :items="tutorials"
    :items-per-page="10"
    :loading="pending"
  />
</template>
