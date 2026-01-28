<script setup lang="ts">
import { buildCourseSchema } from '~/lib/oer-schema-builder'

const route = useRoute()
const isEmbed = computed(() => route.query.embed === 'true')

definePageMeta({
  layout: false
})

// Get the pathway path
const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug]
const pathwayPath = `/pathways/${slug.join('/')}`

const { data: pathway, pending } = await useAsyncData(`pathway-${pathwayPath}`, () =>
  queryCollection('pathways').path(pathwayPath).first()
)

// Fetch related specializations - separate async call
const specializations = ref([])
const specializationsLoading = ref(false)

const fetchSpecializations = async () => {
  if (!pathway.value?.specializations || pathway.value.specializations.length === 0) {
    console.log('No specializations found in pathway')
    specializations.value = []
    return
  }

  specializationsLoading.value = true
  console.log('Pathway specializations array:', pathway.value.specializations)

  try {
    const specs = await Promise.all(
      pathway.value.specializations.map((spec: any) => {
        const specSlug = typeof spec === 'string' ? spec : spec.slug
        const specPath = `/specializations/${specSlug}`
        console.log('Querying specialization:', specPath)
        return queryCollection('specializations').path(specPath).first()
          .then((result: any) => {
            console.log(`Result for ${specPath}:`, result ? `Found (${result.title})` : 'Not found')
            return result
          })
          .catch((err: any) => {
            console.error(`Error fetching ${specPath}:`, err)
            return null
          })
      })
    )
    const filtered = specs.filter(Boolean)
    console.log('Final filtered specializations:', filtered.length, filtered)
    specializations.value = filtered
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
    console.log('Pathway loaded:', newVal.title)
    console.log('Raw specializations field:', newVal.specializations)
    fetchSpecializations()
  }
}, { immediate: true })

const breadcrumbs = computed(() => [
  { label: 'Home', path: '/' },
  { label: 'Pathways', path: '/pathways' },
  { label: pathway.value?.title || 'Loading...' }
])

// Build OER Schema for SEO and discoverability
const oerSchema = computed(() => {
  if (!pathway.value) return null
  const baseUrl = useRequestURL().origin
  return buildCourseSchema(pathway.value, specializations.value || [], baseUrl)
})

// Use the shared specialization modal composable
const { isModalOpen, currentModalSlug, openViewer, closeViewer } = useSpecializationModal()

const handleSelectSpec = (spec: any) => {
  // Store the pathway page path when opening the modal
  openViewer(spec.slug, route.fullPath)
}
</script>

<template>
  <NuxtLayout :name="isEmbed ? 'embed' : 'docs'">
    <OERSchemaScript v-if="oerSchema" :schema="oerSchema" />
    
    <div v-if="pending" class="container py-8">
      <div class="flex justify-center items-center min-h-[400px]">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    </div>
    <div v-else-if="pathway">
      <CollectionItem
        :breadcrumbs="isEmbed ? [] : breadcrumbs"
        :title="pathway.title"
        :description="pathway.description"
        :image="pathway.image"
        :imageAlt="pathway.imageAlt"
      >
        <ContentRenderer :value="pathway" />
      </CollectionItem>
      
      <!-- Specializations Section -->
      <div v-if="!specializationsLoading && specializations && specializations.length > 0" class="border-t bg-muted/30">
        <div class="container max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
          <h2 class="text-3xl font-bold mb-2">Specializations in This Pathway</h2>
          <p class="text-muted-foreground mb-8">Choose a specialization to dive deeper into a specific area of focus.</p>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SpecializationCard
              v-for="spec in specializations"
              :key="spec.slug"
              :title="spec.title"
              :slug="spec.slug"
              :description="spec.description"
              :difficulty="spec.difficulty"
              :duration="spec.estimatedDuration"
              :image="spec.image"
              :imageAlt="spec.imageAlt"
              :targetRole="spec.targetRole"
              :skills="spec.skills"
              :preview="true"
              @select="handleSelectSpec"
            />
          </div>
        </div>
      </div>
      <div v-else-if="specializationsLoading" class="border-t bg-muted/30">
        <div class="container max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
          <p class="text-muted-foreground">Specializations are being loaded...</p>
        </div>
      </div>
      
      <ClientOnly>
        <SpecializationViewerModal
          :open="isModalOpen"
          :slug="currentModalSlug"
          @close="() => closeViewer(true)"
        />
      </ClientOnly>
    </div>
    <div v-else class="container py-8">
      <div class="text-center">
        <h1 class="text-2xl font-bold mb-4">Pathway not found</h1>
        <NuxtLink to="/pathways" class="text-primary hover:underline">
          ← Back to pathways
        </NuxtLink>
      </div>
    </div>
  </NuxtLayout>
</template>
