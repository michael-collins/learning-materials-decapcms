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
  Upload,
  ChevronDown,
  Pencil,
  Archive,
  Loader2,
  Copy,
} from 'lucide-vue-next'

definePageMeta({
  layout: 'cms',
  middleware: ['cms-auth'],
})

const route = useRoute()
const collectionName = computed(() => route.params.collection as string)

const { getCollection, config } = useCmsConfig()
const collection = computed(() => getCollection(collectionName.value))
const isLocalBackend = computed(() => config.value?.localBackend ?? false)
const showBatchPublish = ref(false)

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

// ─── Version dropdown state ─────────────────────────────
const router = useRouter()
const { getToken, restoreSession } = useCmsAuth()

/** Which item's version dropdown is currently open (by slug) */
const openVersionDropdown = ref<string | null>(null)
/** Cached versions per slug */
const versionCache = ref<Record<string, { currentVersion: string; versions: { version: string; versionStatus: string; createdAt?: string }[] }>>({})
/** Loading state per slug */
const versionLoading = ref<Record<string, boolean>>({})

/** Toggle version dropdown — fetches versions on first open */
async function toggleVersionDropdown(e: Event, itemSlug: string) {
  e.stopPropagation()
  e.preventDefault()

  if (openVersionDropdown.value === itemSlug) {
    openVersionDropdown.value = null
    return
  }

  openVersionDropdown.value = itemSlug

  // Fetch versions if not cached
  if (!versionCache.value[itemSlug]) {
    versionLoading.value[itemSlug] = true
    try {
      await restoreSession()
      const token = getToken()
      const res = await $fetch<{
        currentVersion: string
        versions: { version: string; versionStatus: string; createdAt?: string }[]
      }>('/api/cms/content/versions', {
        params: {
          collection: collectionName.value,
          slug: itemSlug,
          ...(token ? { token } : {}),
        },
      })
      versionCache.value[itemSlug] = res
    } catch {
      // If fetching fails, close the dropdown
      openVersionDropdown.value = null
    } finally {
      versionLoading.value[itemSlug] = false
    }
  }
}

/** Navigate to edit a specific version */
function editVersion(e: Event, itemSlug: string, version?: string) {
  e.stopPropagation()
  e.preventDefault()
  openVersionDropdown.value = null
  if (version) {
    router.push(`/cms/${collectionName.value}/edit/${itemSlug}?version=${version}`)
  } else {
    router.push(`/cms/${collectionName.value}/edit/${itemSlug}`)
  }
}

// ─── Duplicate ─────────────────────────────────────────
const duplicating = ref<string | null>(null)

async function duplicateItem(e: Event, item: { slug: string; title?: string }) {
  e.stopPropagation()
  e.preventDefault()
  duplicating.value = item.slug
  try {
    await restoreSession()
    const token = getToken()
    const res = await $fetch<{ frontmatter: Record<string, any>; body: string }>(
      '/api/cms/content/read',
      { params: { collection: collectionName.value, slug: item.slug, ...(token ? { token } : {}) } },
    )
    // Strip versioning fields; mark as a copy so the author can rename before saving
    const { version, versionStatus, date, ...fm } = res.frontmatter
    fm.title = `Copy of ${fm.title || item.title || 'Untitled'}`
    sessionStorage.setItem(
      `cms-duplicate-${collectionName.value}`,
      JSON.stringify({ frontmatter: fm, body: res.body }),
    )
    await navigateTo(`/cms/${collectionName.value}/new`)
  } catch {
    // silently ignore — user stays on the list page
  } finally {
    duplicating.value = null
  }
}

/** Close dropdown when clicking outside */
function handleClickOutside() {
  openVersionDropdown.value = null
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
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
          v-if="isLocalBackend"
          class="flex items-center gap-2 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
          @click="showBatchPublish = true"
        >
          <Upload class="h-4 w-4" />
          <span class="hidden sm:inline">Publish Changes</span>
        </button>
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
        custom
        v-slot="{ navigate }"
      >
        <div
          role="link"
          tabindex="0"
          class="cursor-pointer group flex items-center gap-3 rounded-md border bg-card px-4 py-3 transition-colors hover:border-primary/50 hover:bg-accent/50"
          @click="navigate"
          @keydown.enter="navigate"
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
                class="relative shrink-0"
              >
                <button
                  type="button"
                  class="flex items-center gap-0.5 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 transition-colors hover:bg-blue-500/20 dark:text-blue-400"
                  @click="toggleVersionDropdown($event, item.slug)"
                  title="Select version to edit"
                >
                  v{{ item.version }}
                  <ChevronDown class="h-2.5 w-2.5" />
                </button>

                <!-- Version dropdown -->
                <div
                  v-if="openVersionDropdown === item.slug"
                  class="absolute left-0 top-full z-50 mt-1 min-w-50 rounded-md border bg-popover p-1 shadow-md"
                  @click.stop
                >
                  <!-- Loading -->
                  <div v-if="versionLoading[item.slug]" class="flex items-center justify-center py-3">
                    <Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>

                  <template v-else-if="versionCache[item.slug]">
                    <!-- Latest version -->
                    <button
                      type="button"
                      class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                      @click="editVersion($event, item.slug)"
                    >
                      <Pencil class="h-3.5 w-3.5 text-muted-foreground" />
                      <span class="flex-1">v{{ versionCache[item.slug]?.currentVersion }}</span>
                      <span class="text-[10px] font-medium text-green-600 dark:text-green-400">latest</span>
                    </button>

                    <!-- Divider if there are archived versions -->
                    <div
                      v-if="versionCache[item.slug]?.versions?.length"
                      class="my-1 border-t"
                    />

                    <!-- Archived versions -->
                    <button
                      v-for="v in versionCache[item.slug]?.versions"
                      :key="v.version"
                      type="button"
                      class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                      @click="editVersion($event, item.slug, v.version)"
                    >
                      <Archive class="h-3.5 w-3.5 text-muted-foreground" />
                      <span class="flex-1">v{{ v.version }}</span>
                      <span class="text-[10px] text-muted-foreground">archived</span>
                    </button>

                    <!-- No archived versions -->
                    <p
                      v-if="versionCache[item.slug]?.versions?.length === 0"
                      class="px-2 py-1.5 text-xs text-muted-foreground"
                    >
                      No archived versions
                    </p>
                  </template>
                </div>
              </span>
            </div>
            <p v-if="item.description" class="mt-0.5 truncate text-xs text-muted-foreground">
              {{ item.description }}
            </p>
          </div>

          <!-- Meta -->
          <div class="hidden shrink-0 items-center gap-3 text-xs text-muted-foreground sm:flex">
            <span v-if="item.date">{{ formatDate(item.date) }}</span>
            <!-- View on site -->
            <NuxtLink
              :to="item.path"
              class="rounded p-1 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
              title="View published page"
              @click.stop
            >
              <Eye class="h-3.5 w-3.5" />
            </NuxtLink>
            <!-- Edit -->
            <NuxtLink
              :to="`/cms/${collectionName}/edit/${item.slug}`"
              class="rounded p-1 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
              title="Edit"
              @click.stop
            >
              <Pencil class="h-3.5 w-3.5" />
            </NuxtLink>
            <!-- Duplicate -->
            <button
              type="button"
              class="rounded p-1 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100 disabled:cursor-not-allowed"
              title="Duplicate"
              :disabled="duplicating === item.slug"
              @click="duplicateItem($event, item)"
            >
              <Loader2 v-if="duplicating === item.slug" class="h-3.5 w-3.5 animate-spin" />
              <Copy v-else class="h-3.5 w-3.5" />
            </button>
          </div>
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

    <!-- Batch Publish Dialog -->
    <CmsBatchPublishDialog
      v-model:open="showBatchPublish"
      :collections="[collectionName]"
    />
  </div>
</template>
