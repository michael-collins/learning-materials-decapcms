<script setup lang="ts">
import { buildLessonSchema } from '~/lib/oer-schema-builder'

const route = useRoute()
const isEmbed = computed(() => route.query.embed === 'true')

definePageMeta({
  layout: false
})

// Get the lesson path
const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const baseSlug = slug.join('/');
const versionParam = route.query.version;
const displayVersion = versionParam && typeof versionParam === 'string' ? versionParam : undefined

const { data: lesson, pending } = await useAsyncData(`lesson-${baseSlug}-${versionParam || 'latest'}`, async () => {
  // If version param is provided, try the versioned path first
  if (versionParam) {
    const versionedPath = `/lessons/${baseSlug}/v${versionParam}`
    const versioned = await queryCollection('lessons').path(versionedPath).first()
    if (versioned) return versioned
  }
  
  // Fallback to latest (index)
  return queryCollection('lessons').path(`/lessons/${baseSlug}`).first()
})

// Fetch related specialization if available
const { data: specialization } = await useAsyncData(
  `lesson-specialization-${lesson.value?.specialization}`,
  () => {
    if (!lesson.value?.specialization) return null
    return queryCollection('specializations').path(`/specializations/${lesson.value.specialization}`).first()
  },
  {
    watch: [lesson]
  }
)

// Fetch related content (lectures, tutorials, exercises, articles, projects)
const { data: relatedContent } = await useAsyncData(
  `lesson-content-${lessonPath}`,
  async () => {
    if (!lesson.value) return { lectures: [], tutorials: [], exercises: [], articles: [], projects: [] }
    
    const lectures = lesson.value.lectures 
      ? await Promise.all(
          lesson.value.lectures.map((slug: string) =>
            queryCollection('lectures').path(`/lectures/${slug}`).first()
          )
        ).then(results => results.filter(Boolean))
      : []
    
    const tutorials = lesson.value.tutorials
      ? await Promise.all(
          lesson.value.tutorials.map((slug: string) =>
            queryCollection('tutorials').path(`/tutorials/${slug}`).first()
          )
        ).then(results => results.filter(Boolean))
      : []
    
    const exercises = lesson.value.exercises
      ? await Promise.all(
          lesson.value.exercises.map((slug: string) =>
            queryCollection('exercises').path(`/exercises/${slug}`).first()
          )
        ).then(results => results.filter(Boolean))
      : []
    
    const articles = lesson.value.articles
      ? await Promise.all(
          lesson.value.articles.map((slug: string) =>
            queryCollection('articles').path(`/articles/${slug}`).first()
          )
        ).then(results => results.filter(Boolean))
      : []
    
    const projects = lesson.value.projects
      ? await Promise.all(
          lesson.value.projects.map((slug: string) =>
            queryCollection('projects').path(`/projects/${slug}`).first()
          )
        ).then(results => results.filter(Boolean))
      : []
    
    return { lectures, tutorials, exercises, articles, projects }
  },
  {
    watch: [lesson]
  }
)

const breadcrumbs = computed(() => {
  const crumbs = [
    { label: 'Home', path: '/' },
    { label: 'Lessons', path: '/lessons' }
  ]
  
  if (specialization.value) {
    crumbs.push({
      label: specialization.value.title,
      path: `/specializations/${specialization.value.slug}`
    })
  }
  
  crumbs.push({ label: lesson.value?.title || 'Loading...' })
  
  return crumbs
})

// Build OER Schema for SEO and discoverability
const oerSchema = computed(() => {
  if (!lesson.value) return null
  const baseUrl = useRequestURL().origin
  return buildLessonSchema(
    lesson.value,
    specialization.value || undefined,
    relatedContent.value || undefined,
    baseUrl
  )
})
</script>

<template>
  <NuxtLayout :name="isEmbed ? 'embed' : 'docs'">
    <OERSchemaScript v-if="oerSchema" :schema="oerSchema" />
    
    <div v-if="pending" class="container py-8">
      <div class="flex justify-center items-center min-h-[400px]">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    </div>
    <div v-else-if="lesson">
      <CollectionItem
        :breadcrumbs="isEmbed ? [] : breadcrumbs"
        :title="lesson.title"
        :description="lesson.description"
        :license="lesson.license"
        :image="lesson.image"
        :imageAlt="lesson.imageAlt"
        :tags="lesson.tags"
        :versionStatus="lesson.versionStatus"
      >
        <template #metadata>
          <div class="flex flex-wrap gap-4 text-sm">
            <div v-if="lesson.estimatedDuration" class="flex items-center gap-2">
              <span class="font-semibold">Duration:</span>
              <span>{{ lesson.estimatedDuration }}</span>
            </div>
            <div v-if="lesson.order" class="flex items-center gap-2">
              <span class="font-semibold">Order:</span>
              <span>{{ lesson.order }}</span>
            </div>
            <div v-if="specialization" class="flex items-center gap-2">
              <span class="font-semibold">Specialization:</span>
              <NuxtLink 
                :to="`/specializations/${specialization.slug}`"
                class="text-primary hover:underline"
              >
                {{ specialization.title }}
              </NuxtLink>
            </div>
          </div>
        </template>

        <ContentRenderer :value="lesson" />

        <!-- Learning Objectives -->
        <div v-if="lesson.learningObjectives && lesson.learningObjectives.length > 0" class="mt-8">
          <h2 class="text-2xl font-bold mb-4">Learning Objectives</h2>
          <ul class="list-disc list-inside space-y-2">
            <li v-for="(objective, index) in lesson.learningObjectives" :key="index">
              {{ objective }}
            </li>
          </ul>
        </div>

        <!-- Related Content -->
        <div v-if="relatedContent && (relatedContent.lectures.length > 0 || relatedContent.tutorials.length > 0 || relatedContent.exercises.length > 0 || relatedContent.articles.length > 0 || relatedContent.projects.length > 0)" class="mt-12 space-y-8">
          <h2 class="text-2xl font-bold">Related Content</h2>
          
          <div v-if="relatedContent.lectures.length > 0" class="space-y-4">
            <h3 class="text-xl font-semibold">Lectures</h3>
            <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <NuxtLink
                v-for="lecture in relatedContent.lectures"
                :key="lecture.slug"
                :to="`/lectures/${lecture.slug}`"
                class="block p-4 border rounded-lg hover:shadow-md transition-shadow"
              >
                <h4 class="font-semibold">{{ lecture.title }}</h4>
                <p v-if="lecture.description" class="text-sm text-muted-foreground mt-1">
                  {{ lecture.description }}
                </p>
              </NuxtLink>
            </div>
          </div>

          <div v-if="relatedContent.tutorials.length > 0" class="space-y-4">
            <h3 class="text-xl font-semibold">Tutorials</h3>
            <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <NuxtLink
                v-for="tutorial in relatedContent.tutorials"
                :key="tutorial.slug"
                :to="`/tutorials/${tutorial.slug}`"
                class="block p-4 border rounded-lg hover:shadow-md transition-shadow"
              >
                <h4 class="font-semibold">{{ tutorial.title }}</h4>
                <p v-if="tutorial.description" class="text-sm text-muted-foreground mt-1">
                  {{ tutorial.description }}
                </p>
              </NuxtLink>
            </div>
          </div>

          <div v-if="relatedContent.exercises.length > 0" class="space-y-4">
            <h3 class="text-xl font-semibold">Exercises</h3>
            <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <NuxtLink
                v-for="exercise in relatedContent.exercises"
                :key="exercise.slug"
                :to="`/exercises/${exercise.slug}`"
                class="block p-4 border rounded-lg hover:shadow-md transition-shadow"
              >
                <h4 class="font-semibold">{{ exercise.title }}</h4>
                <p v-if="exercise.description" class="text-sm text-muted-foreground mt-1">
                  {{ exercise.description }}
                </p>
              </NuxtLink>
            </div>
          </div>

          <div v-if="relatedContent.articles.length > 0" class="space-y-4">
            <h3 class="text-xl font-semibold">Articles</h3>
            <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <NuxtLink
                v-for="article in relatedContent.articles"
                :key="article.slug"
                :to="`/articles/${article.slug}`"
                class="block p-4 border rounded-lg hover:shadow-md transition-shadow"
              >
                <h4 class="font-semibold">{{ article.title }}</h4>
                <p v-if="article.description" class="text-sm text-muted-foreground mt-1">
                  {{ article.description }}
                </p>
              </NuxtLink>
            </div>
          </div>

          <div v-if="relatedContent.projects.length > 0" class="space-y-4">
            <h3 class="text-xl font-semibold">Projects</h3>
            <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <NuxtLink
                v-for="project in relatedContent.projects"
                :key="project.slug"
                :to="`/projects/${project.slug}`"
                class="block p-4 border rounded-lg hover:shadow-md transition-shadow"
              >
                <h4 class="font-semibold">{{ project.title }}</h4>
                <p v-if="project.description" class="text-sm text-muted-foreground mt-1">
                  {{ project.description }}
                </p>
              </NuxtLink>
            </div>
          </div>
        </div>
      </CollectionItem>
    </div>
    <div v-else class="container py-8">
      <div class="text-center">
        <h1 class="text-2xl font-bold mb-4">Lesson not found</h1>
        <NuxtLink to="/lessons" class="text-primary hover:underline">
          ← Back to lessons
        </NuxtLink>
      </div>
    </div>
  </NuxtLayout>
</template>
