<script setup lang="ts">
import { buildCourseSchema } from '~/lib/oer-schema-builder'

const route = useRoute()

definePageMeta({
  layout: 'embed'
})

// Get the pathway path
const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const pathwayPath = `/pathways/${slug.join('/')}`

const { data: pathway } = await useAsyncData(
  `pathway-${pathwayPath}`,
  () => queryCollection('pathways').path(pathwayPath).first()
)

// Fetch related specializations
const specializations = ref([])
const specializationsLoading = ref(false)

const fetchSpecializations = async () => {
  if (!pathway.value?.specializations || pathway.value.specializations.length === 0) {
    specializations.value = []
    return
  }

  specializationsLoading.value = true

  try {
    const specs = await Promise.all(
      pathway.value.specializations.map((spec: any) => {
        const specSlug = typeof spec === 'string' ? spec : spec.slug
        return queryCollection('specializations').path(`/specializations/${specSlug}`).first()
          .catch(() => null)
      })
    )
    specializations.value = specs.filter(Boolean)
  } catch (err) {
    console.error('Error fetching specializations:', err)
    specializations.value = []
  } finally {
    specializationsLoading.value = false
  }
}

// Watch pathway and fetch specializations when it loads
watch(() => pathway.value, (newVal) => {
  if (newVal) {
    fetchSpecializations()
  }
}, { immediate: true })

// Generate OER Schema
const oerSchema = computed(() => {
  if (!pathway.value) return null
  const baseUrl = useRequestURL().origin
  return buildCourseSchema(pathway.value, specializations.value || [], baseUrl)
})
</script>

<template>
  <div>
    <OERSchemaScript v-if="oerSchema" :schema="oerSchema" />
    
    <div v-if="pathway" key="pathway-content">
      <!-- Content Section -->
      <div class="prose dark:prose-invert max-w-none prose-headings:text-foreground prose-headings:font-bold prose-headings:tracking-tight prose-h2:text-3xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-foreground prose-p:text-base prose-p:leading-7 prose-li:text-foreground prose-li:text-base prose-code:text-foreground prose-code:text-sm prose-code:bg-muted/50 dark:prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:border prose-code:border-border/50 prose-pre:bg-muted dark:prose-pre:bg-[#0a0a0a] prose-pre:text-foreground prose-pre:border prose-pre:border-border/50 prose-a:text-primary prose-a:font-medium prose-a:no-underline prose-strong:text-foreground prose-blockquote:text-foreground prose-blockquote:border-l-primary container max-w-4xl mx-auto py-8 px-4">
        <h1>{{ pathway.title }}</h1>
        <ContentRenderer :value="pathway" />
      </div>

      <!-- Specializations Section -->
      <div v-if="!specializationsLoading && specializations && specializations.length > 0" class="border-t bg-muted/30">
        <div class="container max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
          <h2 class="text-3xl font-bold mb-2">Specializations in This Pathway</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div
              v-for="spec in specializations"
              :key="spec.slug"
              class="p-4 border rounded-lg bg-card hover:shadow-md transition-all"
            >
              <h3 class="text-xl font-semibold mb-2">{{ spec.title }}</h3>
              <p v-if="spec.description" class="text-sm text-muted-foreground mb-3">
                {{ spec.description }}
              </p>
              <div v-if="spec.meta?.difficulty" class="text-xs text-muted-foreground">
                <span class="font-semibold">Difficulty:</span> {{ spec.meta.difficulty }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No embed section needed for preview - already showing full content -->
    </div>
    <div v-else class="container py-8">
      <div class="text-center">
        <h1 class="text-2xl font-bold mb-4">Pathway not found</h1>
      </div>
    </div>
  </div>
</template>
