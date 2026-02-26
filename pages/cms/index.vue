<script setup lang="ts">
/**
 * CMS Dashboard — overview of all collections with item counts.
 */
import {
  FileText,
  GraduationCap,
  ClipboardCheck,
  FolderOpen,
  ArrowRight,
  RefreshCw,
} from 'lucide-vue-next'
import type { CmsCollection } from '~/lib/cms/config-types'

definePageMeta({
  layout: 'cms',
  middleware: ['cms-auth'],
})

const { collections, groups, config, status: configStatus, refresh } = useCmsConfig()

// Fetch item counts for each collection
const collectionCounts = ref<Record<string, number>>({})
const countsLoading = ref(true)

async function fetchCounts() {
  countsLoading.value = true
  const counts: Record<string, number> = {}

  for (const col of collections.value) {
    try {
      // Use Nuxt Content's queryCollection to count items
      const items = await queryCollection(col.name as any).all()
      counts[col.name] = items?.length ?? 0
    } catch {
      counts[col.name] = 0
    }
  }

  collectionCounts.value = counts
  countsLoading.value = false
}

// Fetch counts once config is loaded
watch(
  () => configStatus.value,
  (status) => {
    if (status === 'success') {
      fetchCounts()
    }
  },
  { immediate: true }
)

// Map group labels to icons
const groupIcons: Record<string, any> = {
  'Content': FileText,
  'Curriculum': GraduationCap,
  'Assessment': ClipboardCheck,
  'Other': FolderOpen,
}

// Total items
const totalItems = computed(() =>
  Object.values(collectionCounts.value).reduce((sum, n) => sum + n, 0)
)
</script>

<template>
  <div class="p-6 md:p-8">
    <!-- Page Header -->
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Manage your learning materials content
        </p>
      </div>
      <button
        class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent"
        @click="refresh(); fetchCounts()"
      >
        <RefreshCw class="h-4 w-4" />
        Refresh
      </button>
    </div>

    <!-- Stats Row -->
    <div class="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
      <div class="rounded-lg border bg-card p-4">
        <p class="text-sm text-muted-foreground">Collections</p>
        <p class="text-2xl font-bold">{{ collections.length }}</p>
      </div>
      <div class="rounded-lg border bg-card p-4">
        <p class="text-sm text-muted-foreground">Total Items</p>
        <p class="text-2xl font-bold">
          <span v-if="countsLoading" class="inline-block h-7 w-12 animate-pulse rounded bg-muted" />
          <span v-else>{{ totalItems }}</span>
        </p>
      </div>
      <div class="rounded-lg border bg-card p-4">
        <p class="text-sm text-muted-foreground">Branch</p>
        <p class="text-lg font-semibold">{{ config?.backend?.branch || '—' }}</p>
      </div>
      <div class="rounded-lg border bg-card p-4">
        <p class="text-sm text-muted-foreground">Workflow</p>
        <p class="text-lg font-semibold capitalize">
          {{ config?.publishMode?.replace('_', ' ') || 'Simple' }}
        </p>
      </div>
    </div>

    <!-- Collection Groups -->
    <div class="space-y-8">
      <div v-for="group in groups" :key="group.label">
        <div class="mb-3 flex items-center gap-2">
          <component
            :is="groupIcons[group.label] || FolderOpen"
            class="h-5 w-5 text-muted-foreground"
          />
          <h2 class="text-lg font-semibold">{{ group.label }}</h2>
          <span class="text-sm text-muted-foreground">
            ({{ group.collections.length }} collections)
          </span>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NuxtLink
            v-for="col in group.collections"
            :key="col.name"
            :to="`/cms/${col.name}`"
            class="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-accent/50"
          >
            <div class="flex items-start justify-between">
              <div>
                <h3 class="font-medium">{{ col.label }}</h3>
                <p class="mt-0.5 text-xs text-muted-foreground">
                  {{ col.isFolderCollection ? col.contentPath : 'File collection' }}
                </p>
              </div>
              <ArrowRight class="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
            <div class="mt-3 flex items-baseline gap-1">
              <span v-if="countsLoading" class="inline-block h-6 w-8 animate-pulse rounded bg-muted" />
              <template v-else>
                <span class="text-xl font-bold">{{ collectionCounts[col.name] ?? 0 }}</span>
                <span class="text-sm text-muted-foreground">items</span>
              </template>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="configStatus === 'pending'" class="space-y-6">
      <div class="h-8 w-48 animate-pulse rounded bg-muted" />
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="i in 6" :key="i" class="h-28 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  </div>
</template>
