<script setup lang="ts">
const { data: projects } = await useAsyncData('projects', () =>
  queryCollection('projects').all()
)

const sortedProjects = computed(() => {
  if (!projects.value) return []
  return [...projects.value].sort((a, b) => a.title.localeCompare(b.title))
})
</script>

<template>
  <NuxtLayout name="docs">
    <div class="container max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
    <div class="mb-8">
      <h1 class="text-4xl font-bold tracking-tight mb-4">Projects</h1>
      <p class="text-lg text-muted-foreground">
        Assessment activities and larger assignments that demonstrate mastery of skills.
      </p>
    </div>

    <CollectionListing
      :items="sortedProjects"
      type="projects"
      emptyMessage="No projects available yet."
    />
    </div>
  </NuxtLayout>
</template>
