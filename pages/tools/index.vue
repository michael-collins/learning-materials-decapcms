<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-4xl font-bold mb-6">Tools</h1>
      <p class="text-lg text-muted-foreground mb-8">
        Explore our collection of educational tools and resources to enhance your learning experience.
      </p>

      <div class="grid gap-6 md:grid-cols-2">
        <NuxtLink
          to="/tools/outline-builder"
          class="block p-6 rounded-lg border border-border hover:border-primary transition-colors"
        >
          <h2 class="text-2xl font-semibold mb-3">Outline Builder</h2>
          <p class="text-muted-foreground">
            Create structured outlines for your learning materials and courses.
          </p>
        </NuxtLink>

        <NuxtLink
          to="/tools/guides"
          class="block p-6 rounded-lg border border-border hover:border-primary transition-colors"
        >
          <h2 class="text-2xl font-semibold mb-3">Guides</h2>
          <p class="text-muted-foreground">
            Access comprehensive guides and documentation for educational resources.
          </p>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  title: 'Tools',
  description: 'Educational tools and resources'
})
</script>
