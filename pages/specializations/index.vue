<script setup lang="ts">
const { data: specializations } = await useAsyncData('specializations', () =>
  queryCollection('specializations').all()
)

const sortedSpecializations = computed(() => {
  if (!specializations.value) return []
  return [...specializations.value].sort((a, b) => a.title.localeCompare(b.title))
})
</script>

<template>
  <div class="container max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
    <div class="mb-8">
      <h1 class="text-4xl font-bold tracking-tight mb-4">Specializations</h1>
      <p class="text-lg text-muted-foreground">
        Learning component units focused on specific skill areas and topics.
      </p>
    </div>

    <CollectionListing
      :items="sortedSpecializations"
      type="specializations"
      emptyMessage="No specializations available yet."
    />
  </div>
</template>
