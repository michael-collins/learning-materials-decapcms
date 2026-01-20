<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-vue-next'
import Button from '~/components/ui/button/Button.vue'

interface Props {
  currentPage: number
  totalPages: number
  showFirstLast?: boolean
  maxVisiblePages?: number
}

interface Emits {
  (e: 'update:currentPage', page: number): void
}

const props = withDefaults(defineProps<Props>(), {
  showFirstLast: true,
  maxVisiblePages: 5
})

const emit = defineEmits<Emits>()

const goToPage = (page: number) => {
  if (page >= 1 && page <= props.totalPages) {
    emit('update:currentPage', page)
  }
}

const pageNumbers = computed(() => {
  const pages: (number | 'ellipsis')[] = []
  const { currentPage, totalPages, maxVisiblePages } = props
  
  if (totalPages <= maxVisiblePages) {
    // Show all pages if total is less than max
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i)
    }
  } else {
    // Always show first page
    pages.push(1)
    
    const leftSiblings = Math.floor((maxVisiblePages - 3) / 2)
    const rightSiblings = Math.ceil((maxVisiblePages - 3) / 2)
    
    let startPage = Math.max(2, currentPage - leftSiblings)
    let endPage = Math.min(totalPages - 1, currentPage + rightSiblings)
    
    // Adjust if we're near the start
    if (currentPage <= leftSiblings + 2) {
      endPage = Math.min(totalPages - 1, maxVisiblePages - 1)
      startPage = 2
    }
    
    // Adjust if we're near the end
    if (currentPage >= totalPages - rightSiblings - 1) {
      startPage = Math.max(2, totalPages - maxVisiblePages + 2)
      endPage = totalPages - 1
    }
    
    // Add left ellipsis
    if (startPage > 2) {
      pages.push('ellipsis')
    }
    
    // Add middle pages
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }
    
    // Add right ellipsis
    if (endPage < totalPages - 1) {
      pages.push('ellipsis')
    }
    
    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages)
    }
  }
  
  return pages
})
</script>

<template>
  <nav class="flex items-center justify-center gap-1" aria-label="Pagination">
    <!-- Previous Button -->
    <Button
      variant="outline"
      size="sm"
      :disabled="currentPage === 1"
      @click="goToPage(currentPage - 1)"
      class="h-9 w-9 p-0"
      aria-label="Previous page"
    >
      <ChevronLeft class="h-4 w-4" />
    </Button>
    
    <!-- Page Numbers -->
    <template v-for="(page, index) in pageNumbers" :key="index">
      <Button
        v-if="page === 'ellipsis'"
        variant="ghost"
        size="sm"
        disabled
        class="h-9 w-9 p-0"
        aria-label="More pages"
      >
        <MoreHorizontal class="h-4 w-4" />
      </Button>
      <Button
        v-else
        :variant="page === currentPage ? 'default' : 'outline'"
        size="sm"
        @click="goToPage(page)"
        class="h-9 w-9 p-0"
        :aria-label="`Page ${page}`"
        :aria-current="page === currentPage ? 'page' : undefined"
      >
        {{ page }}
      </Button>
    </template>
    
    <!-- Next Button -->
    <Button
      variant="outline"
      size="sm"
      :disabled="currentPage === totalPages"
      @click="goToPage(currentPage + 1)"
      class="h-9 w-9 p-0"
      aria-label="Next page"
    >
      <ChevronRight class="h-4 w-4" />
    </Button>
  </nav>
</template>
