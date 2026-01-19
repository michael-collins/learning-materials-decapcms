<script setup lang="ts">
const { data: pathways } = await useAsyncData('pathways', () =>
  queryCollection('pathways').all()
)

const sortedPathways = computed(() => {
  if (!pathways.value) return []
  return [...pathways.value].sort((a, b) => a.title.localeCompare(b.title))
})
</script>

<template>
  <div class="container max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
    <div class="mb-8">
      <h1 class="text-4xl font-bold tracking-tight mb-4">Pathways</h1>
      <p class="text-lg text-muted-foreground">
        Course-level learning pathways that guide your educational journey.
      </p>
    </div>

    <CollectionListing
      :items="sortedPathways"
      type="pathways"
      emptyMessage="No pathways available yet."
    />
  </div>
</template>
