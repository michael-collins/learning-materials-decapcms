<script setup lang="ts">
definePageMeta({
  layout: 'docs'
})

const route = useRoute()

const { data: specializations, pending } = await useAsyncData('specializations', () =>
  queryCollection('specializations').all()
)

const { data: lessons } = await useAsyncData('lessons', () =>
  queryCollection('lessons').all()
)

const sortedSpecializations = computed(() => {
  if (!specializations.value) return []
  return [...specializations.value].sort((a, b) => a.title.localeCompare(b.title))
})

const lessonsBySpecialization = computed(() => {
  const map = new Map<string, number>()
  lessons.value?.forEach((lesson: any) => {
    if (!lesson?.specialization) return
    map.set(lesson.specialization, (map.get(lesson.specialization) || 0) + 1)
  })
  return map
})

const specializationsWithPreview = computed(() => {
  return sortedSpecializations.value.map((item: any) => {
    const slug = deriveSlug(item)
    const lessonCount = slug ? lessonsBySpecialization.value.get(slug) || 0 : 0
    return {
      ...item,
      previewable: lessonCount > 0,
    }
  })
})

const { isModalOpen, currentModalSlug, openViewer, closeViewer } = useSpecializationModal()

const deriveSlug = (item: any) => {
  if (item?.slug) return item.slug
  if (item?._path) {
    const parts = item._path.split('/').filter(Boolean)
    return parts[parts.length - 1] || null
  }
  return null
}

const handleOpenViewer = (item: any) => {
  const slug = deriveSlug(item)
  if (slug) {
    // Store the specializations page path
    openViewer(slug, route.fullPath)
  }
}


</script>

<template>
  <CollectionListing
    title="Specializations"
    description="Learning component units focused on specific skill areas and topics."
    :items="specializationsWithPreview"
    :items-per-page="20"
    :loading="pending"
    :selectable="true"
    @select="handleOpenViewer"
  />

  <ClientOnly>
    <SpecializationViewerModal
      :open="isModalOpen"
      :slug="currentModalSlug"
      @close="() => closeViewer(true)"
    />
  </ClientOnly>
</template>
