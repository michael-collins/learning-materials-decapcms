<script setup lang="ts">
const props = defineProps<{
  resource: any
  getImage: (resource: any) => Promise<string | null>
}>()

const imageUrl = ref<string | null>(null)
const fallbackImageUrl = ref<string | null>(null)
const imageLoading = ref(false)
const imageError = ref(false)

// Generate a consistent color based on resource name
const getColorFromString = (str: string): string => {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ]
  
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  return colors[Math.abs(hash) % colors.length]
}

const placeholderColor = computed(() => getColorFromString(props.resource.name || props.resource.url || 'default'))

const handleImageError = () => {
  imageError.value = true
  // Try fallback image if available
  if (fallbackImageUrl.value) {
    imageUrl.value = fallbackImageUrl.value
    imageError.value = false
    fallbackImageUrl.value = null
  }
}

onMounted(async () => {
  imageLoading.value = true
  try {
    const response = await props.getImage(props.resource)
    if (response?.primary) {
      imageUrl.value = response.primary
      fallbackImageUrl.value = response.fallback || null
    } else if (typeof response === 'string') {
      imageUrl.value = response
    }
  } catch (error) {
    console.error('Error loading image:', error)
    imageError.value = true
  } finally {
    imageLoading.value = false
  }
})
</script>

<template>
  <a
    :href="resource.url || '#'"
    :target="resource.url ? '_blank' : undefined"
    :rel="resource.url ? 'noopener noreferrer' : undefined"
    class="group relative overflow-hidden rounded-lg border border-border bg-card hover:border-primary/50 transition-all duration-200 hover:shadow-lg hover:shadow-primary/10 flex flex-col"
  >
    <!-- Image Section -->
    <div v-if="imageUrl && !imageError" class="relative w-full h-32 overflow-hidden bg-muted flex-shrink-0">
      <img
        :src="imageUrl"
        :alt="resource.alt || resource.name"
        @error="handleImageError"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </div>

    <!-- Placeholder for loading/error -->
    <div v-else :class="[
      'relative w-full h-32 overflow-hidden flex-shrink-0 flex items-center justify-center transition-all',
      placeholderColor,
      imageLoading ? 'opacity-60' : 'opacity-80 group-hover:opacity-100'
    ]">
      <svg v-if="imageLoading" class="w-6 h-6 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <svg v-else class="w-6 h-6 text-white drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>

    <!-- Content -->
    <div class="relative p-4 h-full flex flex-col justify-between flex-1">
      <!-- Type Badge -->
      <div class="flex justify-between items-start gap-2 mb-3">
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary whitespace-nowrap">
          {{ resource.type }}
        </span>
        <svg v-if="resource.url" class="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </div>

      <!-- Title -->
      <div class="mb-3 flex-1">
        <h3 class="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {{ resource.name }}
        </h3>
      </div>

      <!-- Description -->
      <div v-if="resource.description || resource.body" class="mb-3">
        <p class="text-sm text-muted-foreground line-clamp-2">
          {{ resource.description || resource.body }}
        </p>
      </div>

      <!-- Tags -->
      <div v-if="resource.tags && resource.tags.length > 0" class="flex flex-wrap gap-1 pt-3 border-t border-border/50">
        <span
          v-for="(tag, tagIndex) in resource.tags.slice(0, 3)"
          :key="tagIndex"
          class="inline-flex items-center px-2 py-1 rounded text-xs bg-secondary/50 text-secondary-foreground"
        >
          {{ tag }}
        </span>
        <span v-if="resource.tags.length > 3" class="inline-flex items-center px-2 py-1 rounded text-xs text-muted-foreground">
          +{{ resource.tags.length - 3 }}
        </span>
      </div>
    </div>
  </a>
</template>
