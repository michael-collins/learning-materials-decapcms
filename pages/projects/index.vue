<script setup lang="ts">
definePageMeta({
  layout: 'docs'
})

const { data: projects, pending } = await useAsyncData('projects', () =>
  queryCollection('projects').all()
)

const sortedProjects = computed(() => {
  if (!projects.value) return []
  
  // Filter to only show the latest version of each item
  const filtered = projects.value.filter(item => {
    const pathParts = item._path?.split('/').filter(Boolean) || []
    const filename = pathParts[pathParts.length - 1] || ''
    const isVersionFile = filename.match(/^v\d+\.\d+\.\d+$/)
    const isArchivedVersion = item.versionStatus === 'archived'
    return !isVersionFile && !isArchivedVersion
  })
  
  return [...filtered].sort((a, b) => a.title.localeCompare(b.title))
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
