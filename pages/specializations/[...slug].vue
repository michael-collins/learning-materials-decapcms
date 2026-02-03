<script setup lang="ts">
import { buildLearningComponentSchema } from '~/lib/oer-schema-builder'

const route = useRoute()
const isEmbed = computed(() => route.query.embed === 'true')

definePageMeta({
  layout: false
})

// Get the specialization path
const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const baseSlug = slug.join('/');
const versionParam = route.query.version;
const displayVersion = versionParam && typeof versionParam === 'string' ? versionParam : undefined

const { data: specialization, pending } = await useAsyncData(`specialization-${baseSlug}-${versionParam || 'latest'}`, async () => {
  // If version param is provided, try the versioned path first
  if (versionParam) {
    const versionedPath = `/specializations/${baseSlug}/v/${versionParam}`
    const versioned = await queryCollection('specializations').path(versionedPath).first()
    if (versioned) return versioned
  }
  
  // Fallback to latest (index)
  const result = await queryCollection('specializations').path(`/specializations/${baseSlug}`).first()
  console.log('[Specialization Page] Title:', result?.title)
  console.log('[Specialization Page] meta.license:', result?.meta?.license)
  console.log('[Specialization Page] meta.author:', result?.meta?.author)
  console.log('[Specialization Page] meta keys:', Object.keys(result?.meta || {}))
  return result
})

// Fetch related lessons from specialization.lessons array
const lessons = ref([])
const lessonsLoading = ref(false)

const fetchLessons = async () => {
  if (!specialization.value?.lessons || specialization.value.lessons.length === 0) {
    console.log('No lessons in specialization')
    lessons.value = []
    return
  }

  lessonsLoading.value = true
  console.log('Fetching lessons for specialization:', specialization.value.slug)

  try {
    // Get lesson slugs from specialization frontmatter
    const lessonSlugs = specialization.value.lessons.map((l: any) =>
      typeof l === 'string' ? l : l.slug
    )

    // Fetch lessons by slug in order
    const lessonData = await Promise.all(
      lessonSlugs.map((slug: string) =>
        queryCollection('lessons').path(`/lessons/${slug}`).first()
      )
    )

    // Filter out any missing lessons
    const filtered = lessonData.filter(Boolean)
    
    console.log('Found lessons:', filtered.length)
    lessons.value = filtered
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
    console.log('Specialization loaded:', newVal.title)
    fetchLessons()
  }
}, { immediate: true })

const breadcrumbs = computed(() => [
  { label: 'Home', path: '/' },
  { label: 'Specializations', path: '/specializations' },
  { label: specialization.value?.title || 'Loading...' }
])

// Build OER Schema for SEO and discoverability
const oerSchema = computed(() => {
  if (!specialization.value) return null
  const baseUrl = useRequestURL().origin
  const specializationWithPath = {
    ...specialization.value,
    _path: `/specializations/${baseSlug}`
  }
  return buildLearningComponentSchema(specializationWithPath, baseUrl)
})
</script>

<template>
  <NuxtLayout :name="isEmbed ? 'embed' : 'docs'">
    <OERSchemaScript v-if="oerSchema" :schema="oerSchema" />
        <div v-if="pending" class="container py-8">
      <div class="flex justify-center items-center min-h-[400px]">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    </div>    <div v-if="specialization">
      <!-- CollectionItem wrapper with title/edit menu/breadcrumbs -->
      <CollectionItem
        :breadcrumbs="isEmbed ? [] : breadcrumbs"
        :title="specialization.title"
        :description="specialization.whoItsFor"
        :image="specialization.image"
        :imageAlt="specialization.imageAlt"
        :versionStatus="specialization.versionStatus"
        :version="displayVersion"
        :allowEmbed="specialization.meta?.allowEmbed"
        :license="specialization.license"
        :aiLicense="specialization.aiLicense"
        :author="specialization.author"
        :authorUrl="specialization.authorUrl"
        :date="specialization.date"
      >
        <ContentRenderer :value="specialization" />
        
        <!-- Lessons Section -->
        <div v-if="!lessonsLoading && lessons && lessons.length > 0" class="border-t bg-muted/30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
          <div class="py-10">
            <h2 class="text-3xl font-bold mb-2">Lessons in This Specialization</h2>
            <p class="text-muted-foreground mb-8">Complete these lessons in order to master this specialization.</p>
            
            <div class="space-y-4">
              <NuxtLink
                v-for="lesson in lessons"
                :key="lesson.slug"
                :to="`/lessons/${lesson.slug}`"
                class="block p-6 border rounded-lg hover:shadow-md transition-all hover:border-primary/50 bg-card"
              >
                <div class="flex items-start gap-4">
                  <div v-if="lesson.order" class="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {{ lesson.order }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <h3 class="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">{{ lesson.title }}</h3>
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
              </NuxtLink>
            </div>
          </div>
        </div>
        <div v-else-if="lessonsLoading" class="border-t bg-muted/30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
          <div class="py-10">
            <p class="text-muted-foreground">Lessons are being loaded...</p>
          </div>
        </div>
      </CollectionItem>
    </div>
    <div v-else class="container py-8">
      <div class="text-center">
        <h1 class="text-2xl font-bold mb-4">Specialization not found</h1>
        <NuxtLink to="/specializations" class="text-primary hover:underline">
          ← Back to specializations
        </NuxtLink>
      </div>
    </div>
  </NuxtLayout>
</template>
