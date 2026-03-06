<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
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
    console.error('[Resources] Error loading:', error)
    return []
  }
})

// ── Persisted filter / view state ────────────────────────────────
const searchQuery  = useLocalStorage('resources:search', '')
const selectedType = useLocalStorage('resources:type', '')
const selectedTag  = useLocalStorage('resources:tag', '')
const viewMode     = useLocalStorage<'table' | 'gallery'>('resources:view', 'gallery')

// ── Derived filter options ───────────────────────────────────────
const types = computed(() => {
  if (!rawResources.value) return []
  return [...new Set((rawResources.value as any[]).map((r: any) => r.type).filter(Boolean))].sort()
})

const tags = computed(() => {
  if (!rawResources.value) return []
  const all = (rawResources.value as any[]).flatMap((r: any) => r.tags || [])
  return [...new Set(all)].sort()
})

// ── Filtered + sorted list ───────────────────────────────────────
const resources = computed(() => {
  if (!rawResources.value) return []
  let list = [...(rawResources.value as any[])]

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(r =>
      r.name?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.tags?.some((t: string) => t.toLowerCase().includes(q))
    )
  }
  if (selectedType.value) list = list.filter(r => r.type === selectedType.value)
  if (selectedTag.value)  list = list.filter(r => r.tags?.includes(selectedTag.value))

  return list.sort((a, b) => a.name?.localeCompare(b.name ?? '') ?? 0)
})

const clearFilters = () => {
  searchQuery.value  = ''
  selectedType.value = ''
  selectedTag.value  = ''
}

const hasFilters = computed(() => searchQuery.value || selectedType.value || selectedTag.value)

// ── Resource image loader (for gallery cards) ────────────────────
const imageCache = ref<Record<string, any>>({})

const getResourceImage = async (resource: any) => {
  if (!resource.url) return null
  if (resource.url in imageCache.value) return imageCache.value[resource.url]

  try {
    const response = await $fetch('/api/resource-image', { query: { url: resource.url } })
    imageCache.value[resource.url] = response || null
    return response || null
  } catch {
    imageCache.value[resource.url] = null
    return null
  }
}
</script>

<template>
  <div class="container max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-4xl font-bold mb-4">Resources</h1>
      <p class="text-lg text-muted-foreground">
        A curated collection of artists, assets, references, and communities for digital media creation.
      </p>
    </div>

    <div v-if="pending" class="flex justify-center items-center min-h-[400px]">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>

    <div v-else-if="rawResources && rawResources.length > 0">
      <!-- Filters + View Toggle -->
      <div class="mb-6 space-y-4">
        <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div class="flex flex-col sm:flex-row gap-4 flex-1">
            <!-- Search -->
            <div class="flex-1">
              <Input v-model="searchQuery" type="text" placeholder="Search resources…" />
            </div>

            <!-- Type filter -->
            <div class="sm:w-48">
              <select
                v-model="selectedType"
                class="w-full h-10 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-background text-foreground"
              >
                <option value="">All Types</option>
                <option v-for="type in types" :key="type" :value="type">{{ type }}</option>
              </select>
            </div>

            <!-- Tag filter -->
            <div class="sm:w-48">
              <select
                v-model="selectedTag"
                class="w-full h-10 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-background text-foreground"
              >
                <option value="">All Tags</option>
                <option v-for="tag in tags" :key="tag" :value="tag">{{ tag }}</option>
              </select>
            </div>

            <!-- Clear -->
            <Button v-if="hasFilters" variant="secondary" size="sm" class="h-10 whitespace-nowrap" @click="clearFilters">
              Clear Filters
            </Button>
          </div>

          <!-- View toggle -->
          <div class="inline-flex border border-input rounded-md bg-muted shrink-0">
            <Button
              :variant="viewMode === 'table' ? 'secondary' : 'ghost'"
              size="sm"
              class="gap-1 rounded-none rounded-l-md"
              @click="viewMode = 'table'"
            >
              <Icon name="lucide:rows-3" class="w-4 h-4" />
              Table
            </Button>
            <Button
              :variant="viewMode === 'gallery' ? 'secondary' : 'ghost'"
              size="sm"
              class="gap-1 rounded-none rounded-r-md"
              @click="viewMode = 'gallery'"
            >
              <Icon name="lucide:layout-grid" class="w-4 h-4" />
              Gallery
            </Button>
          </div>
        </div>

        <!-- Result count -->
        <p class="text-sm text-muted-foreground">
          {{ resources.length }} result{{ resources.length === 1 ? '' : 's' }}
          <span v-if="hasFilters"> (filtered)</span>
        </p>
      </div>

      <!-- Table view -->
      <div v-if="viewMode === 'table' && resources.length > 0" class="border border-border rounded-lg overflow-hidden">
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

      <!-- Gallery view -->
      <div v-else-if="viewMode === 'gallery' && resources.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <ResourceCard
          v-for="resource in resources"
          :key="resource.url || resource.name"
          :resource="resource"
          :get-image="getResourceImage"
        />
      </div>

      <!-- No results after filtering -->
      <div v-else-if="hasFilters" class="text-center py-12">
        <p class="text-muted-foreground mb-4">No resources match your filters.</p>
        <Button variant="default" @click="clearFilters">Clear Filters</Button>
      </div>
    </div>

    <!-- No resources at all -->
    <div v-else class="text-center py-12">
      <p class="text-muted-foreground">No resources available.</p>
    </div>
  </div>
</template>
