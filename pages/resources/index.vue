<script setup lang="ts">
definePageMeta({
  layout: 'docs'
})

const { data: rawResources, pending } = await useAsyncData('resources', async () => {
  try {
    const response = await $fetch('/api/resources')
    console.log('[Resources] Loaded:', response?.length, 'resources')
    return response || []
  } catch (error) {
    console.error('[Resources] Error loading:', error)
    return []
  }
})

const searchQuery = ref('')
const selectedType = ref('')
const selectedTag = ref('')

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
      <!-- Filters -->
      <div class="mb-6 space-y-4">
        <div class="flex flex-col sm:flex-row gap-4">
          <!-- Search -->
          <div class="flex-1">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search resources..."
              class="w-full px-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
            />
          </div>

          <!-- Type Filter -->
          <div class="sm:w-48">
            <select
              v-model="selectedType"
              class="w-full px-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
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
              class="w-full px-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
            >
              <option value="">All Tags</option>
              <option v-for="tag in tags" :key="tag" :value="tag">
                {{ tag }}
              </option>
            </select>
          </div>

          <!-- Clear Filters -->
          <button
            v-if="searchQuery || selectedType || selectedTag"
            @click="clearFilters"
            class="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors whitespace-nowrap"
          >
            Clear Filters
          </button>
        </div>

        <!-- Results count -->
        <div class="text-sm text-muted-foreground">
          Showing {{ resources.length }} of {{ rawResources?.length || 0 }} resources
        </div>
      </div>

      <!-- Resources Table -->
      <div v-if="resources.length > 0" class="border border-border rounded-lg overflow-hidden">
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
                v-for="(resource, index) in resources"
                :key="index"
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
