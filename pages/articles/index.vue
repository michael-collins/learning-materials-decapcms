<script setup>
definePageMeta({
  layout: 'docs'
})

const { data: rawArticles, pending } = await useAsyncData('articles', () =>
  queryCollection('articles').all()
)

const articles = computed(() => {
  if (!rawArticles.value) return []
  
  // Filter to only show the latest version of each item
  const filtered = rawArticles.value.filter(item => {
    const pathParts = item._path?.split('/').filter(Boolean) || []
    const filename = pathParts[pathParts.length - 1] || ''
    const isVersionFile = filename.match(/^v\d+\.\d+\.\d+$/)
    const isArchivedVersion = item.versionStatus === 'archived'
    return !isVersionFile && !isArchivedVersion
  })
  
  const sorted = [...filtered].sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0
    const dateB = b.date ? new Date(b.date).getTime() : 0
    return dateB - dateA
  })
  
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
