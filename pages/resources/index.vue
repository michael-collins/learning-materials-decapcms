<script setup lang="ts">
import Button from '~/components/ui/button/Button.vue'
import Input from '~/components/ui/input/Input.vue'

definePageMeta({
  layout: 'docs'
})

const { data: rawResources, pending } = await useAsyncData('resources', async () => {
  try {
    const response = await $fetch('/api/resources')
    return response || []
  } catch (error) {
    return []
  }
})

const searchQuery = ref('')
const selectedType = ref('')
const selectedTag = ref('')
const viewMode = ref<'table' | 'gallery'>('gallery')

const resources = computed(() => {
  if (!rawResources.value) return []
  
  let filtered = [...rawResources.value]
  
  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(resource => 
      resource.name?.toLowerCase().includes(query) ||
      resource.description?.toLowerCase().includes(query) ||
      resource.tags?.some((tag: string) => tag.toLowerCase().includes(query))
    )
  }
  
  // Filter by type
  if (selectedType.value) {
    filtered = filtered.filter(resource => resource.type === selectedType.value)
  }
  
  // Filter by tag
  if (selectedTag.value) {
    filtered = filtered.filter(resource => 
      resource.tags?.includes(selectedTag.value)
    )
  }
  
  return filtered.sort((a, b) => a.name.localeCompare(b.name))
})

const types = computed(() => {
  if (!rawResources.value) return []
  const uniqueTypes = [...new Set(rawResources.value.map((r: any) => r.type).filter(Boolean))]
  return uniqueTypes.sort()
})

const tags = computed(() => {
  if (!rawResources.value) return []
  const allTags = rawResources.value.flatMap((r: any) => r.tags || [])
  const uniqueTags = [...new Set(allTags)]
  return uniqueTags.sort()
})

const clearFilters = () => {
  searchQuery.value = ''
  selectedType.value = ''
  selectedTag.value = ''
}

const imageCache = ref<Record<string, string | null>>({})

const getResourceImage = async (resource: any) => {
  if (!resource.url) return null
  
  // Check cache first
  if (resource.url in imageCache.value) {
    return imageCache.value[resource.url]
  }

  try {
    const response = await $fetch('/api/resource-image', {
      query: { url: resource.url }
    })
    imageCache.value[resource.url] = response || null
    return response || null
  } catch (error) {
    imageCache.value[resource.url] = null
    return null
  }
}
</script>

<template>
  <div class="container max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
    <div class="mb-8">
      <h1 class="text-4xl font-bold mb-4">Resources</h1>
      <p class="text-lg text-muted-foreground">
        A curated collection of artists, assets, references, and communities for digital media creation.
      </p>
    </div>

    <div v-if="pending" class="flex justify-center items-center min-h-[400px]">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>

    <div v-else-if="resources.length > 0 || searchQuery || selectedType || selectedTag">
      <!-- Filters and View Toggle -->
      <div class="mb-6 space-y-4">
        <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div class="flex flex-col sm:flex-row gap-4 flex-1">
            <!-- Search -->
            <div class="flex-1">
              <Input
                v-model="searchQuery"
                type="text"
                placeholder="Search resources..."
              />
            </div>

            <!-- Type Filter -->
            <div class="sm:w-48">
              <select
                v-model="selectedType"
                class="w-full h-10 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-background text-foreground"
              >
                <option value="">All Types</option>
                <option v-for="type in types" :key="type" :value="type">
                  {{ type }}
                </option>
              </select>
            </div>

            <!-- Tag Filter -->
            <div class="sm:w-48">
              <select
                v-model="selectedTag"
                class="w-full h-10 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-background text-foreground"
              >
                <option value="">All Tags</option>
                <option v-for="tag in tags" :key="tag" :value="tag">
                  {{ tag }}
                </option>
              </select>
            </div>

            <!-- Clear Filters -->
            <Button
              v-if="searchQuery || selectedType || selectedTag"
              @click="clearFilters"
              variant="secondary"
              size="sm"
              class="whitespace-nowrap h-10"
            >
              Clear Filters
            </Button>
          </div>

          <!-- View Toggle -->
          <div class="inline-flex border border-input rounded-md bg-muted">
            <Button
              @click="viewMode = 'table'"
              :variant="viewMode === 'table' ? 'secondary' : 'ghost'"
              size="sm"
              class="gap-1 rounded-none first:rounded-l-md"
            >
                <Icon name="lucide:rows-3" class="w-4 h-4" />
                Table
              </Button>
              <Button
                @click="viewMode = 'gallery'"
                :variant="viewMode === 'gallery' ? 'secondary' : 'ghost'"
                size="sm"
                class="gap-1 rounded-none last:rounded-r-md"
              >
                <Icon name="lucide:layout-grid" class="w-4 h-4" />
                Gallery
              </Button>
            </div>
        </div>

        <!-- Results count -->
        <div class="text-sm text-muted-foreground">
          Showing {{ resources.length }} of {{ rawResources?.length || 0 }} resources
        </div>
      </div>

      <!-- Resources Table -->
      <div v-if="resources.length > 0 && viewMode === 'table'" class="border border-border rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-muted">
              <tr>
                <th class="text-left py-3 px-4 font-semibold text-foreground">Name</th>
                <th class="text-left py-3 px-4 font-semibold text-foreground">Type</th>
                <th class="text-left py-3 px-4 font-semibold text-foreground">Tags</th>
                <th class="text-left py-3 px-4 font-semibold text-foreground">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="resource in resources"
                :key="resource.url || resource.name"
                class="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
              >
                <td class="py-3 px-4">
                  <a
                    v-if="resource.url"
                    :href="resource.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-primary hover:underline font-medium inline-flex items-center gap-1"
                    :title="resource.alt || resource.name"
                  >
                    {{ resource.name }}
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  <span v-else class="font-medium text-foreground">{{ resource.name }}</span>
                </td>
                <td class="py-3 px-4">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    {{ resource.type }}
                  </span>
                </td>
                <td class="py-3 px-4">
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="tag in resource.tags"
                      :key="tag"
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground"
                    >
                      {{ tag }}
                    </span>
                  </div>
                </td>
                <td class="py-3 px-4 text-muted-foreground text-sm">
                  {{ resource.description || resource.body || '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Resources Gallery -->
      <div v-else-if="resources.length > 0 && viewMode === 'gallery'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <ResourceCard
          v-for="resource in resources"
          :key="resource.url || resource.name"
          :resource="resource"
          :get-image="getResourceImage"
        />
      </div>

      <!-- No results -->
      <div v-else class="text-center py-12">
        <p class="text-muted-foreground mb-4">No resources found matching your filters.</p>
        <button
          @click="clearFilters"
          class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Clear Filters
        </button>
      </div>
    </div>

    <div v-else class="text-center py-12">
      <p class="text-muted-foreground">No resources available.</p>
    </div>
  </div>
</template>
