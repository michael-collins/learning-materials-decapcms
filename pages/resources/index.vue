<script setup lang="ts">
definePageMeta({
  layout: 'docs'
})

const { data: rawResources, pending } = await useAsyncData('resources', async () => {
  try {
    const response = await $fetch('/api/resources')
    return response || []
  } catch (error) {
    console.error('[Resources] Error loading:', error)
    return []
  }
})

// Map API resource shape to CollectionListing-compatible items.
// - title  ← name
// - course ← type  (drives the Courses filter/column & group-by)
// - _path  ← url   (NuxtLink handles external URLs natively)
const items = computed(() => {
  if (!rawResources.value) return []
  return (rawResources.value as any[]).map(r => ({
    title: r.name ?? '',
    description: r.description ?? r.body ?? undefined,
    tags: Array.isArray(r.tags) ? r.tags : undefined,
    course: r.type ?? undefined,
    image: r.image ?? undefined,
    imageAlt: r.alt ?? r.name ?? undefined,
    _path: r.url ?? '#',
    date: '',
  }))
})
</script>

<template>
  <CollectionListing
    title="Resources"
    description="A curated collection of artists, assets, references, and communities for digital media creation."
    :items="items"
    :items-per-page="20"
    :loading="pending"
    storage-key="resources-listing"
  />
</template>
