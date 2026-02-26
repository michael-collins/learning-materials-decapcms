<script setup lang="ts">
/**
 * CMS Item Viewer — displays a single content item's frontmatter and body.
 */
import {
  ChevronLeft,
  ExternalLink,
  Eye,
  FileText,
  Pencil,
} from 'lucide-vue-next'

definePageMeta({
  layout: 'cms',
  middleware: ['cms-auth'],
})

const route = useRoute()
const collectionName = computed(() => route.params.collection as string)
const slug = computed(() => {
  const s = route.params.slug
  if (Array.isArray(s)) return s.join('/')
  return s ?? ''
})

const { getCollection } = useCmsConfig()
const collection = computed(() => getCollection(collectionName.value))

// Fetch the specific item
const { data: item, status } = useAsyncData(
  `cms-item-${collectionName.value}-${slug.value}`,
  async () => {
    try {
      const result = await queryCollection(collectionName.value as any)
        .path(`/${collectionName.value}/${slug.value}`)
        .first()
      return result
    } catch {
      return null
    }
  }
)

// Extract frontmatter fields (everything except body/content system fields)
const systemFields = new Set(['id', '_id', 'body', 'excerpt', 'navigation', 'stem', 'extension', 'meta', 'seo'])

const frontmatterFields = computed(() => {
  if (!item.value) return []
  return Object.entries(item.value)
    .filter(([key]) => !key.startsWith('_') && !systemFields.has(key))
    .map(([key, value]) => ({ key, value }))
})

function formatValue(value: any): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) {
    if (value.length === 0) return '(empty)'
    return value.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(', ')
  }
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

function isArray(value: any): boolean {
  return Array.isArray(value)
}

function isObject(value: any): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
</script>

<template>
  <div class="p-6 md:p-8">
    <!-- Loading -->
    <div v-if="status === 'pending'" class="space-y-4">
      <div class="h-8 w-64 animate-pulse rounded bg-muted" />
      <div class="h-48 animate-pulse rounded-lg bg-muted" />
    </div>

    <!-- Not Found -->
    <div
      v-else-if="!item"
      class="flex flex-col items-center justify-center py-20"
    >
      <FileText class="mb-4 h-12 w-12 text-muted-foreground/50" />
      <p class="text-lg font-medium">Item not found</p>
      <p class="text-sm text-muted-foreground">
        Could not find "{{ slug }}" in {{ collectionName }}
      </p>
      <NuxtLink
        :to="`/cms/${collectionName}`"
        class="mt-4 flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
      >
        <ChevronLeft class="h-4 w-4" />
        Back to {{ collection?.label || collectionName }}
      </NuxtLink>
    </div>

    <!-- Item View -->
    <template v-else>
      <!-- Header -->
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div class="mb-1 flex items-center gap-2">
            <NuxtLink
              :to="`/cms/${collectionName}`"
              class="text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft class="h-4 w-4" />
            </NuxtLink>
            <span class="text-sm text-muted-foreground">
              {{ collection?.label || collectionName }}
            </span>
          </div>
          <h1 class="text-2xl font-bold tracking-tight">
            {{ item.title || slug }}
          </h1>
        </div>

        <div class="flex items-center gap-2">
          <NuxtLink
            :to="item.path || `/${collectionName}/${slug}`"
            class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent"
          >
            <Eye class="h-4 w-4" />
            <span class="hidden sm:inline">View</span>
          </NuxtLink>
          <NuxtLink
            :to="`/cms/${collectionName}/edit/${slug}`"
            class="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Pencil class="h-4 w-4" />
            <span class="hidden sm:inline">Edit</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Frontmatter Fields -->
      <div class="rounded-lg border bg-card">
        <div class="border-b px-4 py-3">
          <h2 class="text-sm font-semibold">Frontmatter</h2>
        </div>
        <div class="divide-y">
          <div
            v-for="{ key, value } in frontmatterFields"
            :key="key"
            class="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-4"
          >
            <dt class="w-40 shrink-0 text-sm font-medium text-muted-foreground">
              {{ key }}
            </dt>
            <dd class="min-w-0 flex-1 text-sm">
              <!-- Array values as tags -->
              <template v-if="isArray(value)">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="(v, i) in (value as any[])"
                    :key="i"
                    class="rounded-md bg-muted px-2 py-0.5 text-xs"
                  >
                    {{ typeof v === 'object' ? JSON.stringify(v) : v }}
                  </span>
                  <span v-if="(value as any[]).length === 0" class="text-muted-foreground">(empty)</span>
                </div>
              </template>

              <!-- Object values as JSON -->
              <template v-else-if="isObject(value)">
                <pre class="overflow-auto rounded-md bg-muted p-2 text-xs">{{ JSON.stringify(value, null, 2) }}</pre>
              </template>

              <!-- Boolean -->
              <template v-else-if="typeof value === 'boolean'">
                <span :class="value ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'">
                  {{ value ? 'Yes' : 'No' }}
                </span>
              </template>

              <!-- Scalar -->
              <template v-else>
                {{ formatValue(value) }}
              </template>
            </dd>
          </div>
        </div>
      </div>

      <!-- Quick Edit Link -->
      <div class="mt-6 rounded-lg border border-dashed bg-muted/30 p-8 text-center">
        <Pencil class="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
        <p class="text-sm text-muted-foreground">
          <NuxtLink
            :to="`/cms/${collectionName}/edit/${slug}`"
            class="text-primary hover:underline"
          >
            Edit this item →
          </NuxtLink>
        </p>
      </div>
    </template>
  </div>
</template>
