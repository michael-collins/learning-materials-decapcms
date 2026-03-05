<script setup lang="ts">
definePageMeta({
  layout: 'docs'
})

const { data: rawLessons, pending } = await useAsyncData('lessons', () =>
  queryCollection('lessons').all()
)

const lessons = computed(() => {
  if (!rawLessons.value) return []

  const filtered = rawLessons.value.filter(item => {
    const pathParts = item._path?.split('/').filter(Boolean) || []
    const filename = pathParts[pathParts.length - 1] || ''
    const isVersionFile = filename.match(/^v\d+\.\d+\.\d+$/)
    const isArchivedVersion = item.versionStatus === 'archived'
    return !isVersionFile && !isArchivedVersion
  })

  return filtered
})
</script>

<template>
  <CollectionListing
    title="Lessons"
    description="Structured learning units organized by specialization, each containing lectures, exercises, and projects."
    :items="lessons"
    :items-per-page="20"
    :loading="pending"
    storage-key="lessons-listing"
  />
</template>
