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

definePageMeta({
  layout: 'docs'
})

const { data: lessons, pending } = await useAsyncData('lessons', () =>
  queryCollection('lessons').all()
)

const searchQuery = ref('')
const selectedSpecialization = ref('')
const currentPage = ref(1)
const itemsPerPage = 20

const sortedLessons = computed(() => {
  if (!lessons.value) return []
  return [...lessons.value].sort((a, b) => {
    // Sort by specialization first, then by order
    if (a.specialization !== b.specialization) {
      return (a.specialization || '').localeCompare(b.specialization || '')
    }
    return (a.order || 0) - (b.order || 0)
  })
})

// Get unique specializations
const specializations = computed(() => {
  if (!lessons.value) return []
  const specs = new Set<string>()
  lessons.value.forEach(lesson => {
    if (lesson.specialization) {
      specs.add(lesson.specialization)
    }
  })
  return Array.from(specs).sort()
})

// Format specialization name for display
const formatSpecialization = (slug: string) => {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

const filteredLessons = computed(() => {
  let filtered = sortedLessons.value
  
  // Filter by specialization
  if (selectedSpecialization.value) {
    filtered = filtered.filter(lesson => lesson.specialization === selectedSpecialization.value)
  }
  
  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(lesson => {
      return lesson.title.toLowerCase().includes(query) ||
        lesson.description?.toLowerCase().includes(query) ||
        lesson.specialization?.toLowerCase().includes(query)
    })
  }
  
  return filtered
})

const totalPages = computed(() => 
  Math.ceil(filteredLessons.value.length / itemsPerPage)
)

const paginatedLessons = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredLessons.value.slice(start, end)
})

const getLessonPath = (lesson: any) => {
  return lesson._path || `/lessons/${lesson.slug}`
}

const updatePage = (page: number) => {
  currentPage.value = page
}

// Reset to first page when filters change
watch([searchQuery, selectedSpecialization], () => {
  currentPage.value = 1
})
</script>

<template>
  <div class="container max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
    <div class="mb-10">
      <h1 class="text-4xl font-bold tracking-tight mb-2">Lessons</h1>
      <p class="text-lg text-muted-foreground">
        Structured learning units organized by specialization, each containing lectures, exercises, and projects.
      </p>
    </div>

    <div class="mb-8 flex flex-col sm:flex-row gap-4">
      <div class="relative flex-1 max-w-md">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          v-model="searchQuery"
          placeholder="Search lessons..."
          class="pl-10"
        />
      </div>
      
      <div v-if="specializations.length > 1" class="w-full sm:w-64">
        <select
          v-model="selectedSpecialization"
          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">All Specializations</option>
          <option v-for="spec in specializations" :key="spec" :value="spec">
            {{ formatSpecialization(spec) }}
          </option>
        </select>
      </div>
    </div>

    <div class="rounded-lg border bg-card shadow-sm">
      <div v-if="pending" class="p-12 text-center">
        <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
        <p class="mt-4 text-sm text-muted-foreground">Loading...</p>
      </div>
      <div v-else-if="paginatedLessons.length === 0" class="p-12 text-center">
        <p class="text-muted-foreground">No lessons found.</p>
      </div>
      <Table v-else>
        <TableHeader>
          <TableRow>
            <TableHead class="w-[50%]">Title</TableHead>
            <TableHead>Specialization</TableHead>
            <TableHead>Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="lesson in paginatedLessons" :key="lesson.slug || lesson._path">
            <TableCell>
              <NuxtLink :to="getLessonPath(lesson)" class="font-medium text-primary hover:underline inline-flex items-center gap-1 group">
                {{ lesson.title }}
                <ChevronRight class="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </NuxtLink>
              <p v-if="lesson.description" class="text-sm text-muted-foreground mt-1 line-clamp-2">
                {{ lesson.description }}
              </p>
            </TableCell>
            <TableCell>
              <span v-if="lesson.specialization" class="text-sm">
                {{ formatSpecialization(lesson.specialization) }}
              </span>
              <span v-else class="text-sm text-muted-foreground">-</span>
            </TableCell>
            <TableCell>
              <span v-if="lesson.estimatedDuration" class="text-sm">
                {{ lesson.estimatedDuration }}
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
        <span class="font-medium">{{ Math.min(currentPage * itemsPerPage, filteredLessons.length) }}</span> of 
        <span class="font-medium">{{ filteredLessons.length }}</span> results
      </p>
      <Pagination
        :current-page="currentPage"
        :total-pages="totalPages"
        @update:current-page="updatePage"
      />
    </div>
  </div>
</template>
