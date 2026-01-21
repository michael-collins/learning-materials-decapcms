<script setup>
definePageMeta({
  layout: 'docs'
})

const { data: rawArticles, pending } = await useAsyncData('articles', () =>
  queryCollection('articles').all()
)

const articles = computed(() => {
  if (!rawArticles.value) return []
  const sorted = [...rawArticles.value].sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0
    const dateB = b.date ? new Date(b.date).getTime() : 0
    return dateB - dateA
  })
  
  // Debug: log the first item to see structure
  if (sorted.length > 0) {
    console.log('First article:', sorted[0])
  }
  
  return sorted
})
</script>

<template>
  <CollectionListing
    title="Articles"
    :items="articles"
    :items-per-page="10"
    :loading="pending"
  />
</template>
