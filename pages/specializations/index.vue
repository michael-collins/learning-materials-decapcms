<script setup lang="ts">
definePageMeta({
  layout: 'docs'
})

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

const selectedSlug = ref<string | null>(null)

const deriveSlug = (item: any) => {
  if (item?.slug) return item.slug
  if (item?._path) {
    const parts = item._path.split('/').filter(Boolean)
    return parts[parts.length - 1] || null
  }
  return null
}

const openViewer = (item: any) => {
  selectedSlug.value = deriveSlug(item)
}

const closeViewer = () => {
  selectedSlug.value = null
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
    @select="openViewer"
  />

  <SpecializationViewerModal
    :open="!!selectedSlug"
    :slug="selectedSlug"
    @close="closeViewer"
  />
</template>
