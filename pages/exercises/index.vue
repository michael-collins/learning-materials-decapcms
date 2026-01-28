<script setup>
definePageMeta({
  layout: 'docs'
})

const { data: rawExercises, pending } = await useAsyncData('exercises', () =>
  queryCollection('exercises').all()
)

const exercises = computed(() => {
  if (!rawExercises.value) return []
  
  // Filter to only show the latest version of each exercise
  // Exclude archived version files (v*.*.*.md)
  const filtered = rawExercises.value.filter(item => {
    // Get the filename from the _path (e.g., "3d-viewer-test" from "/3d-viewer-test" or "index" from "/3d-viewer-test/index")
    const pathParts = item._path?.split('/').filter(Boolean) || []
    const filename = pathParts[pathParts.length - 1] || ''
    
    // Exclude archived version files (v*.*.*.md pattern) OR items with versionStatus=archived
    const isVersionFile = filename.match(/^v\d+\.\d+\.\d+$/)
    const isArchivedVersion = item.versionStatus === 'archived'
    
    return !isVersionFile && !isArchivedVersion
  })
  
  const sorted = [...filtered].sort((a, b) => {
    const titleA = a.title?.toLowerCase() || ''
    const titleB = b.title?.toLowerCase() || ''
    return titleA.localeCompare(titleB)
  })
  
  return sorted
})
</script>

<template>
  <CollectionListing
    title="Exercises"
    description="Practice activities designed to build and reinforce specific skills and techniques."
    :items="exercises"
    :items-per-page="20"
    :loading="pending"
  />
</template>
