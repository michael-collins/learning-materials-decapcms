<script setup lang="ts">
const route = useRoute()

definePageMeta({
  layout: 'docs'
})

// Get the rubric path
const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const rubricPath = `/rubrics/${slug.join('/')}`

const { data: rubric } = await useAsyncData(
  `rubric-${rubricPath}`,
  () => queryCollection('rubrics').path(rubricPath).first()
)

const breadcrumbs = computed(() => [
  { label: 'Home', path: '/' },
  { label: 'Rubrics', path: '/rubrics' },
  { label: rubric.value?.name || 'Loading...' }
])
</script>

<template>
  <div class="container max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
    <div v-if="rubric" key="rubric-content">
      <article>
        <!-- Rubric Display -->
        <div class="border border-border rounded-lg p-4">
          <h3 class="pt-4 uppercase text-left text-lg pl-4 font-semibold text-foreground">
            {{ rubric.name }} Rubric
          </h3>
          <p v-if="rubric.description" class="pt-2 pb-6 px-4 text-left text-muted-foreground">
            {{ rubric.description }}
          </p>
          <div v-if="rubric.criteria && rubric.criteria.length > 0" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border">
                  <th class="text-left py-3 px-4 font-semibold text-foreground">Criterion</th>
                  <th class="text-left py-3 px-4 font-semibold text-foreground">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="(criterion, index) in rubric.criteria" 
                  :key="index"
                  class="border-b border-border last:border-0"
                >
                  <td class="py-3 px-4 font-medium text-foreground">{{ criterion.name }}</td>
                  <td class="py-3 px-4 text-muted-foreground">{{ criterion.description }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </article>
    </div>

    <div v-else key="rubric-loading" class="flex items-center justify-center min-h-[400px]">
      <p class="text-muted-foreground">Loading rubric...</p>
    </div>
  </div>
</template>
