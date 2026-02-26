<script setup lang="ts">
/**
 * CMS Collection Browser — lists all items in a collection.
 * Provides search, sort, and pagination.
 */
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Plus,
  ExternalLink,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-vue-next'

definePageMeta({
  layout: 'cms',
  middleware: ['cms-auth'],
})

const route = useRoute()
const collectionName = computed(() => route.params.collection as string)

const { getCollection } = useCmsConfig()
const collection = computed(() => getCollection(collectionName.value))

const {
  items,
  totalItems,
  totalPages,
  page,
  search,
  sortBy,
  sortDir,
  sortableFields,
  status,
  refresh,
} = useCmsContent(collectionName)

// Toggle sort direction or change sort field
function toggleSort(field: string) {
  if (sortBy.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortDir.value = 'asc'
  }
}

// Format date for display
function formatDate(date: string | undefined): string {
  if (!date) return '—'
  try {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return date
  }
}
</script>

<template>
  <div class="p-6 md:p-8">
    <!-- Header -->
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="flex items-center gap-2">
          <NuxtLink to="/cms" class="text-muted-foreground hover:text-foreground">
            <ChevronLeft class="h-4 w-4" />
          </NuxtLink>
          <h1 class="text-2xl font-bold tracking-tight">
            {{ collection?.label || collectionName }}
          </h1>
        </div>
        <p class="mt-0.5 text-sm text-muted-foreground">
          {{ totalItems }} items
          <template v-if="collection?.isFolderCollection">
            · {{ collection.contentPath }}
          </template>
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent"
          @click="refresh()"
        >
          <RefreshCw class="h-4 w-4" />
        </button>
        <NuxtLink
          :to="`/cms/${collectionName}/new`"
          class="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus class="h-4 w-4" />
          <span class="hidden sm:inline">New</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Search & Sort -->
    <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          v-model="search"
          type="text"
          placeholder="Search items..."
          class="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-muted-foreground">Sort:</span>
        <button
          v-for="field in sortableFields"
          :key="field"
          :class="[
            'flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
            sortBy === field ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'
          ]"
          @click="toggleSort(field)"
        >
          {{ field }}
          <component
            :is="sortBy === field ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown"
            class="h-3 w-3"
          />
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="status === 'pending'" class="space-y-2">
      <div v-for="i in 8" :key="i" class="h-14 animate-pulse rounded-md bg-muted" />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="totalItems === 0"
      class="flex flex-col items-center justify-center rounded-lg border border-dashed py-16"
    >
      <FileText class="mb-3 h-10 w-10 text-muted-foreground/50" />
      <p class="text-sm text-muted-foreground">
        {{ search ? 'No items match your search.' : 'No items in this collection yet.' }}
      </p>
      <NuxtLink
        v-if="!search"
        :to="`/cms/${collectionName}/new`"
        class="mt-3 flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
      >
        <Plus class="h-4 w-4" />
        Create First Item
      </NuxtLink>
    </div>

    <!-- Item List -->
    <div v-else class="space-y-1">
      <NuxtLink
        v-for="item in items"
        :key="item.id"
        :to="`/cms/${collectionName}/${item.slug}`"
        class="group flex items-center gap-3 rounded-md border bg-card px-4 py-3 transition-colors hover:border-primary/50 hover:bg-accent/50"
      >
        <!-- Icon -->
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <FileText class="h-4 w-4 text-muted-foreground" />
        </div>

        <!-- Content -->
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="truncate font-medium">{{ item.title }}</span>
            <span
              v-if="item.draft"
              class="shrink-0 rounded bg-yellow-500/10 px-1.5 py-0.5 text-[10px] font-medium text-yellow-600 dark:text-yellow-400"
            >
              Draft
            </span>
            <span
              v-if="item.version"
              class="shrink-0 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400"
            >
              v{{ item.version }}
            </span>
          </div>
          <p v-if="item.description" class="mt-0.5 truncate text-xs text-muted-foreground">
            {{ item.description }}
          </p>
        </div>

        <!-- Meta -->
        <div class="hidden shrink-0 items-center gap-4 text-xs text-muted-foreground sm:flex">
          <span v-if="item.date">{{ formatDate(item.date) }}</span>
          <!-- View on site -->
          <NuxtLink
            :to="item.path"
            class="rounded p-1 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
            title="View on site"
            @click.stop
          >
            <Eye class="h-3.5 w-3.5" />
          </NuxtLink>
        </div>
      </NuxtLink>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="mt-6 flex items-center justify-between">
      <p class="text-sm text-muted-foreground">
        Page {{ page }} of {{ totalPages }}
      </p>
      <div class="flex items-center gap-1">
        <button
          :disabled="page <= 1"
          class="rounded-md border p-2 transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
          @click="page--"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>
        <button
          :disabled="page >= totalPages"
          class="rounded-md border p-2 transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
          @click="page++"
        >
          <ChevronRight class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>
