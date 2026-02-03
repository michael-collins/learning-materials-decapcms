<script setup lang="ts">
import { buildLessonSchema } from '~/lib/oer-schema-builder'
import { Card, CardContent } from '~/components/ui/card'

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
    const versionedPath = `/lessons/${baseSlug}/v/${versionParam}`
    const versioned = await queryCollection('lessons').path(versionedPath).first()
    if (versioned) return versioned
  }
  
  // Fallback to latest (index)
  const result = await queryCollection('lessons').path(`/lessons/${baseSlug}`).first()
  console.log('[Lessons Page] Fetched lesson:', result?.title, 'Prerequisites:', result?.prerequisites)
  return result
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
  `lesson-content-${baseSlug}`,
  async () => {
    if (!lesson.value) return { lectures: [], tutorials: [], exercises: [], articles: [], projects: [] }
    
    console.log('[Lesson Page] Full lesson data:', lesson.value)
    console.log('[Lesson Page] Items array:', lesson.value.items)
    
    // Parse items array (new format) or fallback to old format
    let lectureSlugs: string[] = []
    let tutorialSlugs: string[] = []
    let exerciseSlugs: string[] = []
    let articleSlugs: string[] = []
    let projectSlugs: string[] = []
    
    if (lesson.value.items && Array.isArray(lesson.value.items)) {
      console.log('[Lesson Page] Using new items format')
      // New format: items array with type-specific keys
      lesson.value.items.forEach((item: any) => {
        console.log('[Lesson Page] Processing item:', item)
        // Check both __typename (from DecapCMS) and type fields
        const itemType = item.__typename || item.type
        if ((itemType === 'lectures' || item.lecture) && item.lecture) {
          lectureSlugs.push(item.lecture)
        } else if ((itemType === 'tutorials' || item.tutorial) && item.tutorial) {
          tutorialSlugs.push(item.tutorial)
        } else if ((itemType === 'exercises' || item.exercise) && item.exercise) {
          exerciseSlugs.push(item.exercise)
        } else if ((itemType === 'articles' || item.article) && item.article) {
          articleSlugs.push(item.article)
        } else if ((itemType === 'projects' || item.project) && item.project) {
          projectSlugs.push(item.project)
        }
      })
    } else {
      console.log('[Lesson Page] Using old format')
      // Old format: separate arrays
      lectureSlugs = lesson.value.lectures || []
      tutorialSlugs = lesson.value.tutorials || []
      exerciseSlugs = lesson.value.exercises || []
      articleSlugs = lesson.value.articles || []
      projectSlugs = lesson.value.projects || []
    }
    
    console.log('[Lesson Page] Parsed slugs:', { lectureSlugs, tutorialSlugs, exerciseSlugs, articleSlugs, projectSlugs })
    
    const lectures = lectureSlugs.length > 0
      ? await Promise.all(
          lectureSlugs.map((slug: string) =>
            queryCollection('lectures').path(`/lectures/${slug}`).first()
          )
        ).then(results => {
          const filtered = results.filter(Boolean)
          console.log('Fetched lectures:', filtered)
          return filtered
        })
      : []
    
    const tutorials = tutorialSlugs.length > 0
      ? await Promise.all(
          tutorialSlugs.map((slug: string) =>
            queryCollection('tutorials').path(`/tutorials/${slug}`).first()
          )
        ).then(results => {
          const filtered = results.filter(Boolean)
          console.log('Fetched tutorials:', filtered)
          return filtered
        })
      : []
    
    const exercises = exerciseSlugs.length > 0
      ? await Promise.all(
          exerciseSlugs.map((slug: string) =>
            queryCollection('exercises').path(`/exercises/${slug}`).first()
          )
        ).then(results => {
          const filtered = results.filter(Boolean)
          console.log('Fetched exercises:', filtered)
          return filtered
        })
      : []
    
    const articles = articleSlugs.length > 0
      ? await Promise.all(
          articleSlugs.map((slug: string) =>
            queryCollection('articles').path(`/articles/${slug}`).first()
          )
        ).then(results => {
          const filtered = results.filter(Boolean)
          console.log('Fetched articles:', filtered)
          return filtered
        })
      : []
    
    const projects = projectSlugs.length > 0
      ? await Promise.all(
          projectSlugs.map((slug: string) =>
            queryCollection('projects').path(`/projects/${slug}`).first()
          )
        ).then(results => {
          const filtered = results.filter(Boolean)
          console.log('Fetched projects:', filtered)
          return filtered
        })
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

// Helper to get link path from content item
const getItemPath = (item: any, type: string) => {
  if (!item) return '#'
  if (item.path) return item.path
  if (item._path) return item._path
  if (item.slug) return `/${type}/${item.slug}`
  return '#'
}

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
        :allowEmbed="lesson.allowEmbed"
        :prerequisites="lesson.prerequisites"
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
            <h3 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Lectures</h3>
            <div class="space-y-2">
              <Card
                v-for="lecture in relatedContent.lectures"
                :key="lecture._id || lecture.slug"
                class="overflow-hidden hover:bg-accent transition-colors group cursor-pointer"
              >
                <NuxtLink :to="getItemPath(lecture, 'lectures')">
                  <CardContent class="p-4">
                    <div class="flex items-center gap-4">
                      <div 
                        v-if="lecture.image" 
                        class="w-20 h-20 flex-shrink-0 rounded-md overflow-hidden bg-muted"
                      >
                        <img 
                          :src="lecture.image" 
                          :alt="lecture.imageAlt || lecture.title"
                          class="w-full h-full object-cover"
                        />
                      </div>
                      <div class="flex-1 min-w-0">
                        <h4 class="font-medium group-hover:text-primary transition-colors">{{ lecture.title }}</h4>
                      </div>
                      <Icon name="lucide:arrow-right" class="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>
                  </CardContent>
                </NuxtLink>
              </Card>
            </div>
          </div>

          <div v-if="relatedContent.tutorials.length > 0" class="space-y-4">
            <h3 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Tutorials</h3>
            <div class="space-y-2">
              <Card
                v-for="tutorial in relatedContent.tutorials"
                :key="tutorial._id || tutorial.slug"
                class="overflow-hidden hover:bg-accent transition-colors group cursor-pointer"
              >
                <NuxtLink :to="getItemPath(tutorial, 'tutorials')">
                  <CardContent class="p-4">
                    <div class="flex items-center gap-4">
                      <div 
                        v-if="tutorial.image" 
                        class="w-20 h-20 flex-shrink-0 rounded-md overflow-hidden bg-muted"
                      >
                        <img 
                          :src="tutorial.image" 
                          :alt="tutorial.imageAlt || tutorial.title"
                          class="w-full h-full object-cover"
                        />
                      </div>
                      <div class="flex-1 min-w-0">
                        <h4 class="font-medium group-hover:text-primary transition-colors">{{ tutorial.title }}</h4>
                      </div>
                      <Icon name="lucide:arrow-right" class="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>
                  </CardContent>
                </NuxtLink>
              </Card>
            </div>
          </div>

          <div v-if="relatedContent.exercises.length > 0" class="space-y-4">
            <h3 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Exercises</h3>
            <div class="space-y-2">
              <Card
                v-for="exercise in relatedContent.exercises"
                :key="exercise._id || exercise.slug"
                class="overflow-hidden hover:bg-accent transition-colors group cursor-pointer"
              >
                <NuxtLink :to="getItemPath(exercise, 'exercises')">
                  <CardContent class="p-4">
                    <div class="flex items-center gap-4">
                      <div 
                        v-if="exercise.image" 
                        class="w-20 h-20 flex-shrink-0 rounded-md overflow-hidden bg-muted"
                      >
                        <img 
                          :src="exercise.image" 
                          :alt="exercise.imageAlt || exercise.title"
                          class="w-full h-full object-cover"
                        />
                      </div>
                      <div class="flex-1 min-w-0">
                        <h4 class="font-medium group-hover:text-primary transition-colors">{{ exercise.title }}</h4>
                      </div>
                      <Icon name="lucide:arrow-right" class="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>
                  </CardContent>
                </NuxtLink>
              </Card>
            </div>
          </div>

          <div v-if="relatedContent.articles.length > 0" class="space-y-4">
            <h3 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Articles</h3>
            <div class="space-y-2">
              <Card
                v-for="article in relatedContent.articles"
                :key="article._id || article.slug"
                class="overflow-hidden hover:bg-accent transition-colors group cursor-pointer"
              >
                <NuxtLink :to="getItemPath(article, 'articles')">
                  <CardContent class="p-4">
                    <div class="flex items-center gap-4">
                      <div 
                        v-if="article.image" 
                        class="w-20 h-20 flex-shrink-0 rounded-md overflow-hidden bg-muted"
                      >
                        <img 
                          :src="article.image" 
                          :alt="article.imageAlt || article.title"
                          class="w-full h-full object-cover"
                        />
                      </div>
                      <div class="flex-1 min-w-0">
                        <h4 class="font-medium group-hover:text-primary transition-colors">{{ article.title }}</h4>
                      </div>
                      <Icon name="lucide:arrow-right" class="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>
                  </CardContent>
                </NuxtLink>
              </Card>
            </div>
          </div>

          <div v-if="relatedContent.projects.length > 0" class="space-y-4">
            <h3 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Projects</h3>
            <div class="space-y-2">
              <Card
                v-for="project in relatedContent.projects"
                :key="project._id || project.slug"
                class="overflow-hidden hover:bg-accent transition-colors group cursor-pointer"
              >
                <NuxtLink :to="getItemPath(project, 'projects')">
                  <CardContent class="p-4">
                    <div class="flex items-center gap-4">
                      <div 
                        v-if="project.image" 
                        class="w-20 h-20 flex-shrink-0 rounded-md overflow-hidden bg-muted"
                      >
                        <img 
                          :src="project.image" 
                          :alt="project.imageAlt || project.title"
                          class="w-full h-full object-cover"
                        />
                      </div>
                      <div class="flex-1 min-w-0">
                        <h4 class="font-medium group-hover:text-primary transition-colors">{{ project.title }}</h4>
                      </div>
                      <Icon name="lucide:arrow-right" class="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>
                  </CardContent>
                </NuxtLink>
              </Card>
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
