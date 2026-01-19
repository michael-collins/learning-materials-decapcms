<script setup lang="ts">
const { data: lectures } = await useAsyncData('lectures', () =>
  queryCollection('lectures').all()
)

const sortedLectures = computed(() => {
  if (!lectures.value) return []
  return [...lectures.value].sort((a, b) => a.title.localeCompare(b.title))
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
      />
    </div>
  </NuxtLayout>
</template>
