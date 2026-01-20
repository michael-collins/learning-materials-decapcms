<script setup>
definePageMeta({
  layout: 'docs'
})

const { data: rawRubrics } = await useAsyncData('rubrics', () =>
  queryCollection('rubrics').all()
)

const rubrics = computed(() => {
  if (!rawRubrics.value) return []
  const sorted = [...rawRubrics.value].sort((a, b) => {
    const titleA = a.name?.toLowerCase() || ''
    const titleB = b.name?.toLowerCase() || ''
    return titleA.localeCompare(titleB)
  })
  
  return sorted.map(rubric => ({
    ...rubric,
    title: rubric.name // Map name to title for CollectionListing compatibility
  }))
})
</script>

<template>
  <CollectionListing
    title="Rubrics"
    :items="rubrics"
    :items-per-page="20"
  />
</template>
