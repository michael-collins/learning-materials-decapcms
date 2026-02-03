<script setup lang="ts">
import { buildLearningComponentSchema } from '~/lib/oer-schema-builder'

const route = useRoute()

definePageMeta({
  layout: 'embed'
})

// Get the specialization path
const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const specializationPath = `/specializations/${slug.join('/')}`

const { data: specialization } = await useAsyncData(
  `specialization-${specializationPath}`,
  () => queryCollection('specializations').path(specializationPath).first()
)

// Fetch related lessons
const lessons = ref([])
const lessonsLoading = ref(false)

const fetchLessons = async () => {
  if (!specialization.value?.lessons || specialization.value.lessons.length === 0) {
    lessons.value = []
    return
  }

  lessonsLoading.value = true

  try {
    const lessonSlugs = specialization.value.lessons.map((l: any) =>
      typeof l === 'string' ? l : l.slug
    )

    const lessonData = await Promise.all(
      lessonSlugs.map((slug: string) =>
        queryCollection('lessons').path(`/lessons/${slug}`).first()
          .catch(() => null)
      )
    )

    lessons.value = lessonData.filter(Boolean)
  } catch (err) {
    console.error('Error fetching lessons:', err)
    lessons.value = []
  } finally {
    lessonsLoading.value = false
  }
}

// Watch specialization and fetch lessons when it loads
watch(() => specialization.value, (newVal) => {
  if (newVal) {
    fetchLessons()
  }
}, { immediate: true })

// Generate OER Schema
const oerSchema = computed(() => {
  if (!specialization.value) return null
  const baseUrl = useRequestURL().origin
  return buildLearningComponentSchema(specialization.value, baseUrl)
})
</script>

<template>
  <div>
    <OERSchemaScript v-if="oerSchema" :schema="oerSchema" />
    
    <div v-if="specialization" key="specialization-content">
      <CollectionItem
        :breadcrumbs="[]"
        :title="specialization.title"
        :description="specialization.whoItsFor"
        :image="specialization.image"
        :imageAlt="specialization.imageAlt"
        :allowEmbed="false"
        :hideMenu="true"
      >
        <ContentRenderer :value="specialization" />
      </CollectionItem>

      <!-- Lessons Section -->
      <div v-if="!lessonsLoading && lessons && lessons.length > 0" class="border-t bg-muted/30">
        <div class="container max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
          <h2 class="text-3xl font-bold mb-2">Lessons in This Specialization</h2>
          <div class="space-y-4 mt-8">
            <div
              v-for="lesson in lessons"
              :key="lesson.slug"
              class="p-6 border rounded-lg bg-card hover:shadow-md transition-all"
            >
              <div class="flex items-start gap-4">
                <div v-if="lesson.order" class="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {{ lesson.order }}
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="text-xl font-semibold mb-2">{{ lesson.title }}</h3>
                  <p v-if="lesson.description" class="text-sm text-muted-foreground mb-3">
                    {{ lesson.description }}
                  </p>
                  <div class="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span v-if="lesson.estimatedDuration" class="flex items-center gap-1">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {{ lesson.estimatedDuration }}
                    </span>
                    <span v-if="lesson.learningObjectives && lesson.learningObjectives.length" class="flex items-center gap-1">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {{ lesson.learningObjectives.length }} objectives
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No embed section needed for preview - already showing full content -->
    </div>
    <div v-else class="container py-8">
      <div class="text-center">
        <h1 class="text-2xl font-bold mb-4">Specialization not found</h1>
      </div>
    </div>
  </div>
</template>
