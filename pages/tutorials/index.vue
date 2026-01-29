<script setup>
definePageMeta({
  layout: 'docs'
})

const { data: rawTutorials, pending } = await useAsyncData('tutorials', () =>
  queryCollection('tutorials').all()
)

const tutorials = computed(() => {
  if (!rawTutorials.value) return []
  
  // Filter to only show the latest version of each item
  // Exclude archived version files (v*.*.*.md)
  const filtered = rawTutorials.value.filter(item => {
    const pathParts = item._path?.split('/').filter(Boolean) || []
    const filename = pathParts[pathParts.length - 1] || ''
    const isVersionFile = filename.match(/^v\d+\.\d+\.\d+$/)
    const isArchivedVersion = item.versionStatus === 'archived'
    return !isVersionFile && !isArchivedVersion
  })
  
  return [...filtered].sort((a, b) => {
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
