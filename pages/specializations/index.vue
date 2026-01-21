<script setup lang="ts">
definePageMeta({
  layout: 'docs'
})

const { data: specializations } = await useAsyncData('specializations', () =>
  queryCollection('specializations').all()
)

const sortedSpecializations = computed(() => {
  if (!specializations.value) return []
  return [...specializations.value].sort((a, b) => a.title.localeCompare(b.title))
})
</script>

<template>
  <CollectionListing
    title="Specializations"
    description="Learning component units focused on specific skill areas and topics."
    :items="sortedSpecializations"
    :items-per-page="20"
  />
</template>
