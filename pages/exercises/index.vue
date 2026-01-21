<script setup>
definePageMeta({
  layout: 'docs'
})

const { data: rawExercises, pending } = await useAsyncData('exercises', () =>
  queryCollection('exercises').all()
)

const exercises = computed(() => {
  if (!rawExercises.value) return []
  const sorted = [...rawExercises.value].sort((a, b) => {
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
