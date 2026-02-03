<template>
  <div v-if="prerequisites && prerequisites.length > 0" class="border-t bg-muted/30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mb-8">
    <div class="py-8">
      <h2 class="text-2xl font-bold mb-2">Prerequisites</h2>
      <p class="text-muted-foreground mb-6">Complete these items first before starting this content.</p>
      
      <div class="space-y-3">
        <NuxtLink
          v-for="(item, index) in resolvedPrerequisites"
          :key="index"
          :to="item.url"
          class="block p-5 border rounded-lg hover:shadow-md transition-all hover:border-primary/50 bg-card"
        >
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
              {{ index + 1 }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-medium text-muted-foreground uppercase tracking-wide">{{ item.type }}</span>
              </div>
              <h3 class="text-lg font-semibold mb-1 hover:text-primary transition-colors">{{ item.title }}</h3>
              <p v-if="item.description" class="text-sm text-muted-foreground line-clamp-2">
                {{ item.description }}
              </p>
              <div v-if="item.estimatedDuration" class="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ item.estimatedDuration }}
              </div>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Prerequisite {
  __typename: string
  lesson?: string
  lecture?: string
  tutorial?: string
  exercise?: string
  article?: string
  project?: string
  specialization?: string
  pathway?: string
}

interface ResolvedPrerequisite {
  type: string
  title: string
  description?: string
  estimatedDuration?: string
  url: string
}

const props = defineProps<{
  prerequisites: Prerequisite[]
}>()

console.log('[PrerequisiteSection] Prerequisites prop:', props.prerequisites)

const resolvedPrerequisites = ref<ResolvedPrerequisite[]>([])

// Map typename to collection and field name
const typeMap: Record<string, { collection: string, field: string, label: string }> = {
  lessons: { collection: 'lessons', field: 'lesson', label: 'Lesson' },
  lectures: { collection: 'lectures', field: 'lecture', label: 'Lecture' },
  tutorials: { collection: 'tutorials', field: 'tutorial', label: 'Tutorial' },
  exercises: { collection: 'exercises', field: 'exercise', label: 'Exercise' },
  articles: { collection: 'articles', field: 'article', label: 'Article' },
  projects: { collection: 'projects', field: 'project', label: 'Project' },
  specializations: { collection: 'specializations', field: 'specialization', label: 'Specialization' },
  pathways: { collection: 'pathways', field: 'pathway', label: 'Pathway' }
}

// Fetch prerequisite details
onMounted(async () => {
  console.log('[PrerequisiteSection] onMounted - fetching prerequisites')
  const resolved: ResolvedPrerequisite[] = []
  
  for (const prereq of props.prerequisites) {
    const typename = prereq.__typename
    const typeInfo = typeMap[typename]
    
    console.log('[PrerequisiteSection] Processing prereq:', prereq, 'typeInfo:', typeInfo)
    
    if (!typeInfo) {
      console.warn('[PrerequisiteSection] No typeInfo for typename:', typename)
      continue
    }
    
    const slug = (prereq as any)[typeInfo.field]
    console.log('[PrerequisiteSection] Slug:', slug, 'field:', typeInfo.field)
    if (!slug) {
      console.warn('[PrerequisiteSection] No slug found for field:', typeInfo.field)
      continue
    }
    
    try {
      // Query the content item using path
      const item = await queryCollection(typeInfo.collection as any)
        .path(`/${typeInfo.collection}/${slug}`)
        .first()
      
      console.log('[PrerequisiteSection] Fetched item:', item)
      
      if (item) {
        resolved.push({
          type: typeInfo.label,
          title: item.title || slug,
          description: item.description,
          estimatedDuration: item.estimatedDuration,
          url: `/${typeInfo.collection}/${slug}`
        })
      } else {
        console.warn('[PrerequisiteSection] Item not found for slug:', slug)
      }
    } catch (error) {
      console.error(`[PrerequisiteSection] Failed to fetch ${typeInfo.label}:`, slug, error)
    }
  }
  
  console.log('[PrerequisiteSection] Resolved prerequisites:', resolved)
  resolvedPrerequisites.value = resolved
})
</script>
