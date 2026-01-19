<script setup lang="ts">
import { ref, computed } from 'vue'
import Input from '~/components/ui/input/Input.vue'
import Table from '~/components/ui/table/Table.vue'
import TableHeader from '~/components/ui/table/TableHeader.vue'
import TableBody from '~/components/ui/table/TableBody.vue'
import TableRow from '~/components/ui/table/TableRow.vue'
import TableHead from '~/components/ui/table/TableHead.vue'
import TableCell from '~/components/ui/table/TableCell.vue'
import Button from '~/components/ui/button/Button.vue'
import { Search, ChevronLeft, ChevronRight } from 'lucide-vue-next'

interface CollectionItem {
  title: string
  description?: string
  date: string
  author?: string
  difficulty?: string
  _path?: string
  path?: string
  slug?: string
}

interface Props {
  title: string
  items: CollectionItem[]
  itemsPerPage?: number
}

const props = withDefaults(defineProps<Props>(), {
  itemsPerPage: 10,
})

const searchQuery = ref('')
const currentPage = ref(1)

const getItemPath = (item: CollectionItem) => {
  return item._path || item.path || `/articles/${item.slug}` || '#'
}

const filteredItems = computed(() => {
  if (!searchQuery.value) return props.items
  
  const query = searchQuery.value.toLowerCase()
  return props.items.filter(item => 
    item.title.toLowerCase().includes(query) ||
    item.description?.toLowerCase().includes(query) ||
    item.author?.toLowerCase().includes(query)
  )
})

const totalPages = computed(() => 
  Math.ceil(filteredItems.value.length / props.itemsPerPage)
)

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * props.itemsPerPage
  const end = start + props.itemsPerPage
  return filteredItems.value.slice(start, end)
})

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}
</script>

<template>
  <div class="container max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
    <div class="mb-10">
      <h1 class="text-4xl font-bold tracking-tight mb-2">{{ title }}</h1>
      <p class="text-lg text-muted-foreground">
        Browse all {{ items.length }} {{ title.toLowerCase() }}
      </p>
    </div>

    <div class="mb-8">
      <div class="relative max-w-md">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          v-model="searchQuery"
          placeholder="Search..."
          class="pl-10"
        />
      </div>
    </div>

    <div class="rounded-lg border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-[50%]">Title</TableHead>
            <TableHead>Date</TableHead>
            <TableHead v-if="items.some(i => i.author)">Author</TableHead>
            <TableHead v-if="items.some(i => i.difficulty)">Difficulty</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="item in paginatedItems" :key="getItemPath(item)">
            <TableCell>
              <NuxtLink :to="getItemPath(item)" class="font-medium text-primary hover:underline inline-flex items-center gap-1 group">
                {{ item.title }}
                <ChevronRight class="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </NuxtLink>
              <p v-if="item.description" class="text-sm text-muted-foreground mt-1 line-clamp-2">
                {{ item.description }}
              </p>
            </TableCell>
            <TableCell>
              <span class="text-sm text-muted-foreground whitespace-nowrap">
                {{ formatDate(item.date) }}
              </span>
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

    <div v-if="totalPages > 1" class="mt-6 flex items-center justify-between">
      <p class="text-sm text-muted-foreground">
        Showing <span class="font-medium">{{ (currentPage - 1) * itemsPerPage + 1 }}</span> to 
        <span class="font-medium">{{ Math.min(currentPage * itemsPerPage, filteredItems.length) }}</span> of 
        <span class="font-medium">{{ filteredItems.length }}</span> results
      </p>
      <div class="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          :disabled="currentPage === 1"
          @click="previousPage"
        >
          <ChevronLeft class="h-4 w-4 mr-1" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          :disabled="currentPage === totalPages"
          @click="nextPage"
        >
          Next
          <ChevronRight class="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  </div>
</template>
