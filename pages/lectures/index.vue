<script setup lang="ts">
const { data: lectures, pending } = await useAsyncData('lectures', () =>
  queryCollection('lectures').all()
)

const sortedLectures = computed(() => {
  if (!lectures.value) return []
  
  // Filter to only show the latest version of each item
  const filtered = lectures.value.filter(item => {
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
  <NuxtLayout name="docs">
    <div class="container max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div class="mb-8">
        <h1 class="text-4xl font-bold tracking-tight mb-4">Lectures</h1>
        <p class="text-lg text-muted-foreground">
          Supporting materials including slide decks and presentation resources.
        </p>
      </div>

      <CollectionListing
        :items="sortedLectures"
        type="lectures"
        emptyMessage="No lectures available yet."
        :loading="pending"
      />
    </div>
  </NuxtLayout>
</template>
