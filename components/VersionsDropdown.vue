<template>
  <div>
    <button
      @click.stop="isOpen = !isOpen"
      class="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors text-left"
    >
      <GitBranch class="w-4 h-4" />
      <span>Versions</span>
    </button>

    <!-- Nested versions list -->
    <div v-if="isOpen" class="bg-muted/50 border-t border-b border-border pl-4">
      <div v-if="loading" class="px-4 py-2 text-sm text-muted-foreground">Loading...</div>
      <div v-else-if="error" class="px-4 py-2 text-sm text-red-600">{{ error }}</div>
      <div v-else-if="versions.length === 0" class="px-4 py-2 text-sm text-muted-foreground">No versions</div>
      
      <template v-else>
        <template v-if="!props.onVersionSelect">
          <a
            v-for="(version, vIndex) in versions"
            :key="`link-${vIndex}`"
            :href="version.version === 'latest' ? route.path : `${route.path}?version=${version.version}`"
            :class="[
              'flex items-center gap-2 px-4 py-2 text-sm transition-colors text-left hover:bg-muted',
              isCurrentVersion(version.version)
                ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium'
                : 'text-foreground'
            ]"
            @click="isOpen = false"
          >
            <Check v-if="isCurrentVersion(version.version)" class="w-4 h-4 flex-shrink-0" />
            <span v-else class="w-4 h-4 flex-shrink-0" />
            <div class="flex-1">
              <div class="font-medium">{{ version.version }}</div>
              <div v-if="version.publishedAt" class="text-xs text-muted-foreground">
                {{ formatDate(version.publishedAt) }}
              </div>
            </div>
          </a>
        </template>
        <template v-else>
          <button
            v-for="(version, vIndex) in versions"
            :key="`button-${vIndex}`"
            :class="[
              'w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors text-left hover:bg-muted',
              isCurrentVersion(version.version)
                ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium'
                : 'text-foreground'
            ]"
            @click="handleVersionSelect(version.version)"
          >
            <Check v-if="isCurrentVersion(version.version)" class="w-4 h-4 flex-shrink-0" />
            <span v-else class="w-4 h-4 flex-shrink-0" />
            <div class="flex-1">
              <div class="font-medium">{{ version.version }}</div>
              <div v-if="version.publishedAt" class="text-xs text-muted-foreground">
                {{ formatDate(version.publishedAt) }}
              </div>
            </div>
          </button>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from '#app'
import { GitBranch, Check } from 'lucide-vue-next'
import type { ContentVersion } from '~/composables/useContentVersions'

interface Props {
  contentType: 'exercises' | 'tutorials' | 'articles' | 'projects' | 'lectures' | 'lessons'
  slug: string
  currentVersion?: string
  onVersionSelect?: (version: string) => void
}

const props = defineProps<Props>()

const route = useRoute()
const isOpen = ref(false)

const emit = defineEmits<{
  versionSelected: [version: string]
}>()

// Fetch versions
const { versions, loading, error } = await useContentVersions(props.contentType, props.slug)

console.log(`[VersionsDropdown] Loaded versions for ${props.contentType}/${props.slug}:`, {
  count: versions.value?.length,
  versions: versions.value,
  loading: loading.value,
  error: error.value
})

const isCurrentVersion = (version: string) => {
  if (!props.currentVersion) return version === 'latest'
  return version === props.currentVersion
}

const handleVersionSelect = (version: string) => {
  isOpen.value = false
  if (props.onVersionSelect) {
    props.onVersionSelect(version)
  }
  emit('versionSelected', version)
}

const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  } catch {
    return dateStr
  }
}
</script>
