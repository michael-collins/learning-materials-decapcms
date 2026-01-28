<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Input from '~/components/ui/input/Input.vue'
import Table from '~/components/ui/table/Table.vue'
import TableHeader from '~/components/ui/table/TableHeader.vue'
import TableBody from '~/components/ui/table/TableBody.vue'
import TableRow from '~/components/ui/table/TableRow.vue'
import TableHead from '~/components/ui/table/TableHead.vue'
import TableCell from '~/components/ui/table/TableCell.vue'
import Pagination from '~/components/ui/pagination/Pagination.vue'
import { Search, ChevronRight } from 'lucide-vue-next'

interface CollectionItem {
  title: string
  description?: string
  date: string
  author?: string
  difficulty?: string
  image?: string
  imageAlt?: string
  tags?: string[]
  _path?: string
  path?: string
  slug?: string
  previewable?: boolean
}

interface Props {
  title?: string
  description?: string
  items: CollectionItem[]
  itemsPerPage?: number
  loading?: boolean
  selectable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Items',
  itemsPerPage: 10,
  loading: false,
  selectable: false,
})

const emit = defineEmits<{
  (e: 'select', item: CollectionItem): void
}>()

const selectable = computed(() => props.selectable)

const searchQuery = ref('')
const selectedAuthor = ref('')
const currentPage = ref(1)

const getItemPath = (item: CollectionItem) => {
  return item._path || item.path || `/articles/${item.slug}` || '#'
}

// Get unique authors from items
const authors = computed(() => {
  const authorSet = new Set<string>()
  props.items.forEach(item => {
    if (item.author) {
      authorSet.add(item.author)
    }
  })
  return Array.from(authorSet).sort()
})

const filteredItems = computed(() => {
  let filtered = props.items
  
  // Filter by author
  if (selectedAuthor.value) {
    filtered = filtered.filter(item => item.author === selectedAuthor.value)
  }
  
  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(item => {
      // Search in title, description, and author
      const matchesText = 
        item.title.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.author?.toLowerCase().includes(query)
      
      // Search in tags
      const matchesTags = item.tags?.some(tag => 
        tag.toLowerCase().includes(query)
      )
      
      return matchesText || matchesTags
    })
  }
  
  return filtered
})

const totalPages = computed(() => 
  Math.ceil(filteredItems.value.length / props.itemsPerPage)
)

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * props.itemsPerPage
  const end = start + props.itemsPerPage
  return filteredItems.value.slice(start, end)
})

const canPreview = (item: CollectionItem) => props.selectable && item.previewable !== false

const handleSelect = (item: CollectionItem, event?: Event) => {
  if (!canPreview(item)) return
  event?.preventDefault()
  emit('select', item)
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const updatePage = (page: number) => {
  currentPage.value = page
}

// Reset to first page when filters change
watch([searchQuery, selectedAuthor], () => {
  currentPage.value = 1
})
</script>

<template>
  <div class="container max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
    <div class="mb-10">
      <h1 class="text-4xl font-bold tracking-tight mb-2">{{ title }}</h1>
      <p v-if="description" class="text-lg text-muted-foreground">
        {{ description }}
      </p>
    </div>

    <div class="mb-8 flex flex-col sm:flex-row gap-4">
      <div class="relative flex-1 max-w-md">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          v-model="searchQuery"
          placeholder="Search..."
          class="pl-10"
        />
      </div>
      
      <div v-if="authors.length > 1" class="w-full sm:w-64">
        <select
          v-model="selectedAuthor"
          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">All Authors</option>
          <option v-for="author in authors" :key="author" :value="author">
            {{ author }}
          </option>
        </select>
      </div>
    </div>

    <div class="rounded-lg border bg-card shadow-sm">
      <div v-if="loading" class="p-12 text-center">
        <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
        <p class="mt-4 text-sm text-muted-foreground">Loading...</p>
      </div>
      <div v-else-if="paginatedItems.length === 0" class="p-12 text-center">
        <p class="text-muted-foreground">No {{ title.toLowerCase() }} found.</p>
      </div>
      <Table v-else>
        <TableHeader>
          <TableRow>
            <TableHead v-if="items.some(i => i.image)" class="w-[160px]"></TableHead>
            <TableHead class="w-[50%]">Title</TableHead>
            <TableHead v-if="items.some(i => i.author)">Author</TableHead>
            <TableHead v-if="items.some(i => i.difficulty)">Difficulty</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="item in paginatedItems" :key="getItemPath(item)">
            <TableCell v-if="items.some(i => i.image)" class="py-2">
              <NuxtLink v-if="item.image" :to="getItemPath(item)" class="block">
                <NuxtImg
                  :src="item.image"
                  :alt="item.imageAlt || item.title"
                  width="128"
                  height="64"
                  fit="cover"
                  class="rounded object-cover w-32 h-16"
                  loading="lazy"
                />
              </NuxtLink>
            </TableCell>
            <TableCell>
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <NuxtLink
                    :to="getItemPath(item)"
                    class="font-medium text-primary hover:underline inline-flex items-center gap-1 group"
                    @click="handleSelect(item, $event)"
                  >
                    {{ item.title }}
                    <ChevronRight class="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </NuxtLink>
                  <p v-if="item.description" class="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {{ item.description }}
                  </p>
                </div>
                <button
                  v-if="canPreview(item)"
                  type="button"
                  class="shrink-0 inline-flex items-center gap-1 rounded-md border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground hover:border-primary/40 hover:text-primary transition-colors"
                  @click="handleSelect(item, $event)"
                >
                  <Icon name="mingcute:layout-11-line" class="w-4 h-4" />
                  Preview
                </button>
              </div>
            </TableCell>
            <TableCell v-if="items.some(i => i.author)">
              <span class="text-sm">{{ item.author || '-' }}</span>
            </TableCell>
            <TableCell v-if="items.some(i => i.difficulty)">
              <span v-if="item.difficulty" class="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {{ item.difficulty }}
              </span>
              <span v-else class="text-sm text-muted-foreground">-</span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <div v-if="totalPages > 1" class="mt-8 flex flex-col items-center gap-4">
      <p class="text-sm text-muted-foreground">
        Showing <span class="font-medium">{{ (currentPage - 1) * itemsPerPage + 1 }}</span> to 
        <span class="font-medium">{{ Math.min(currentPage * itemsPerPage, filteredItems.length) }}</span> of 
        <span class="font-medium">{{ filteredItems.length }}</span> results
      </p>
      <Pagination
        :current-page="currentPage"
        :total-pages="totalPages"
        @update:current-page="updatePage"
      />
    </div>
  </div>
</template>
