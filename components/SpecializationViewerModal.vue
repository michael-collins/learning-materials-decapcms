<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSpecializationBundle } from '~/composables/useSpecializationBundle'
import { useBodyOverflow } from '~/composables/useBodyOverflow'
import Button from '~/components/ui/button/Button.vue'
import VersionsDropdown from '~/components/VersionsDropdown.vue'
import { X, ExternalLink, ChevronLeft, ChevronRight, ChevronDown, Book, FileText, Dumbbell, Lightbulb, FolderKanban, Download, Copy, Check, Menu, MoreVertical, Pencil, Eye } from 'lucide-vue-next'

interface Props {
  open: boolean
  slug: string | null
}

const props = defineProps<Props>()
const emit = defineEmits(['close'])

const route = useRoute()
const router = useRouter()

const { toggle } = useBodyOverflow()

const modalRef = ref<HTMLElement | null>(null)
const closeButtonRef = ref<InstanceType<typeof Button> | null>(null)
const triggerElementRef = ref<HTMLElement | null>(null)

const activeSlug = computed(() => props.slug)
const { specialization, lessons, loading } = useSpecializationBundle(activeSlug)

const selectedLessonIndex = ref(0)
const selectedItemIndex = ref<number | null>(null) // null means overview mode
const expandedLessonIndices = ref<Set<number>>(new Set())
const selectedItemContent = ref<any>(null)
const loadingItemContent = ref(false)
const isEmbedOpen = ref(false)
const isCopied = ref(false)
const showLessonsSidebar = ref(false)
const selectedModalVersion = ref<string | undefined>(undefined)

const selectedLesson = computed(() => lessons.value[selectedLessonIndex.value] || null)
const selectedItem = computed(() => {
  if (selectedItemIndex.value === null || !selectedLesson.value) return null
  return selectedLesson.value.items[selectedItemIndex.value] || null
})
const isOverviewMode = computed(() => selectedItemIndex.value === null)

const toggleLessonExpansion = (index: number) => {
  if (expandedLessonIndices.value.has(index)) {
    // Collapse the current lesson
    expandedLessonIndices.value.delete(index)
  } else {
    // Expand this lesson and collapse all others
    expandedLessonIndices.value = new Set([index])
  }
  expandedLessonIndices.value = new Set(expandedLessonIndices.value)
}

// Fetch the full content of a selected item
const loadItemContent = async () => {
  if (!selectedItem.value) {
    selectedItemContent.value = null
    return
  }

  loadingItemContent.value = true
  try {
    const { type, slug } = selectedItem.value
    const basePath = type === 'articles' ? '/articles' : `/${type}`
    
    let content = null
    
    // Try to load versioned content if a version is selected
    if (selectedModalVersion.value) {
      const versionedPath = `${basePath}/${slug}/v${selectedModalVersion.value}`
      content = await queryCollection(type === 'articles' ? 'articles' : type)
        .path(versionedPath)
        .first()
    }
    
    // If no versioned content found or no version selected, load latest
    if (!content) {
      const latestPath = `${basePath}/${slug}`
      content = await queryCollection(type === 'articles' ? 'articles' : type)
        .path(latestPath)
        .first()
    }
    
    selectedItemContent.value = content
  } catch (error) {
    console.error('Failed to load content:', error)
    selectedItemContent.value = null
  } finally {
    loadingItemContent.value = false
  }
}

// Announce to screen readers
const announceForA11y = (message: string) => {
  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', 'polite')
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message
  document.body.appendChild(announcement)
  setTimeout(() => announcement.remove(), 1000)
}

// Trap focus within modal
const trapFocus = (e: KeyboardEvent) => {
  if (e.key !== 'Tab' || !modalRef.value) return

  const focusableElements = modalRef.value.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  const firstElement = focusableElements[0] as HTMLElement
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

  if (e.shiftKey && document.activeElement === firstElement) {
    e.preventDefault()
    lastElement?.focus()
  } else if (!e.shiftKey && document.activeElement === lastElement) {
    e.preventDefault()
    firstElement?.focus()
  }
}

const selectLesson = (index: number) => {
  selectedLessonIndex.value = index
  selectedItemIndex.value = null // Start in overview mode
  announceForA11y(`Selected lesson: ${lessons.value[index]?.title}`)
  updateURL()
}

const selectOverview = () => {
  selectedItemIndex.value = null
  announceForA11y(`Viewing lesson overview`)
  updateURL()
}

const selectItem = (index: number) => {
  selectedItemIndex.value = index
  // Expand the current lesson when selecting an item
  expandedLessonIndices.value = new Set([selectedLessonIndex.value])
  if (selectedLesson.value?.items[index]) {
    announceForA11y(`Selected ${selectedLesson.value.items[index].type}: ${selectedLesson.value.items[index].title}`)
  }
  updateURL()
}

// URL state management
const updateURL = () => {
  if (!props.open || !specialization.value) return
  
  const lesson = lessons.value[selectedLessonIndex.value]
  if (!lesson) return
  
  const query: Record<string, string> = {
    modal: specialization.value.slug,
    lesson: lesson.slug
  }
  
  if (selectedItemIndex.value !== null && selectedLesson.value?.items[selectedItemIndex.value]) {
    const item = selectedLesson.value.items[selectedItemIndex.value]
    query.item = item.slug
  }
  
  router.replace({ query })
}

const syncFromURL = () => {
  if (!props.open || !lessons.value.length) return
  
  const lessonSlug = route.query.lesson as string
  const itemSlug = route.query.item as string
  
  if (lessonSlug) {
    const lessonIndex = lessons.value.findIndex(l => l.slug === lessonSlug)
    if (lessonIndex !== -1) {
      selectedLessonIndex.value = lessonIndex
      expandedLessonIndices.value = new Set([lessonIndex])
      
      if (itemSlug) {
        const lesson = lessons.value[lessonIndex]
        const itemIndex = lesson.items?.findIndex((i: any) => i.slug === itemSlug)
        if (itemIndex !== undefined && itemIndex !== -1) {
          selectedItemIndex.value = itemIndex
        } else {
          selectedItemIndex.value = null
        }
      } else {
        selectedItemIndex.value = null
      }
    }
  }
}

// Embed functionality
const embedUrl = computed(() => {
  if (typeof window === 'undefined' || !selectedItemContent.value) return ''
  const item = selectedItem.value
  if (!item) return ''
  const basePath = item.type === 'articles' ? '/articles' : `/${item.type}`
  const embedPath = `/embed${basePath}/${item.slug}`
  return `${window.location.origin}${embedPath}`
})

const embedCode = computed(() => {
  return `<iframe src="${embedUrl.value}" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`
})

const copyEmbedCode = async () => {
  try {
    await navigator.clipboard.writeText(embedCode.value)
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

const nextLesson = () => {
  if (selectedLessonIndex.value < lessons.value.length - 1) {
    selectLesson(selectedLessonIndex.value + 1)
  }
}

const prevLesson = () => {
  if (selectedLessonIndex.value > 0) {
    selectLesson(selectedLessonIndex.value - 1)
  }
}

const nextItem = () => {
  if (!selectedLesson.value) return
  
  // If in overview mode, go to first item
  if (selectedItemIndex.value === null) {
    if (selectedLesson.value.items.length > 0) {
      selectedItemIndex.value = 0
      expandedLessonIndices.value = new Set([selectedLessonIndex.value])
    } else if (selectedLessonIndex.value < lessons.value.length - 1) {
      const nextLessonIndex = selectedLessonIndex.value + 1
      selectLesson(nextLessonIndex)
      expandedLessonIndices.value = new Set([nextLessonIndex])
      selectedItemIndex.value = null
    }
  } else if (selectedItemIndex.value < selectedLesson.value.items.length - 1) {
    // Go to next item in current lesson
    selectedItemIndex.value++
  } else if (selectedLessonIndex.value < lessons.value.length - 1) {
    // Move to next lesson
    const nextLessonIndex = selectedLessonIndex.value + 1
    selectLesson(nextLessonIndex)
    expandedLessonIndices.value = new Set([nextLessonIndex])
    selectedItemIndex.value = null
  }
}

const prevItem = () => {
  if (!selectedLesson.value) return
  
  // If viewing an item, go to previous item
  if (selectedItemIndex.value !== null && selectedItemIndex.value > 0) {
    selectedItemIndex.value--
  } else if (selectedItemIndex.value === null) {
    // If in overview, go to previous lesson's last item (or overview if no items)
    if (selectedLessonIndex.value > 0) {
      const prevLessonIndex = selectedLessonIndex.value - 1
      selectLesson(prevLessonIndex)
      expandedLessonIndices.value = new Set([prevLessonIndex])
      const previousLesson = lessons.value[prevLessonIndex]
      selectedItemIndex.value = previousLesson.items.length > 0 ? previousLesson.items.length - 1 : null
    }
  } else if (selectedItemIndex.value === 0) {
    // If at first item, go to lesson overview
    selectedItemIndex.value = null
  }
}

const getItemIcon = (type: string) => {
  switch (type) {
    case 'lectures': return Book
    case 'tutorials': return FileText
    case 'exercises': return Dumbbell
    case 'articles': return Lightbulb
    case 'projects': return FolderKanban
    default: return FileText
  }
}

// Calculate current item position in the entire specialization
const getCurrentItemNumber = () => {
  let itemNumber = 0
  for (let i = 0; i < selectedLessonIndex.value; i++) {
    itemNumber += 1 + lessons.value[i].items.length // 1 for overview + items
  }
  if (isOverviewMode.value) {
    itemNumber += 1 // Overview is item 1 of current lesson
  } else {
    itemNumber += 1 + (selectedItemIndex.value || 0) // Overview + item offset
  }
  return itemNumber
}

// Calculate total items in the specialization
const getTotalItemCount = () => {
  let total = 0
  for (const lesson of lessons.value) {
    total += 1 + lesson.items.length // 1 for overview + items
  }
  return total
}

// Check if we can navigate forward
const canNavigateNext = () => {
  const currentPos = getCurrentItemNumber()
  const total = getTotalItemCount()
  return currentPos < total
}

// Check if we can navigate backward
const canNavigatePrev = () => {
  return getCurrentItemNumber() > 1
}

const getItemPath = (type: string, slug: string) => {
  return `/${type}/${slug}`
}

const getDecapEditUrl = () => {
  if (isOverviewMode.value && selectedLesson.value) {
    return `/admin/#/collections/lessons/${selectedLesson.value.slug}`
  } else if (!isOverviewMode.value && selectedItem.value) {
    return `/admin/#/collections/${selectedItem.value.type}/${selectedItem.value.slug}`
  }
  return null
}

const closeDrawer = () => {
  showLessonsSidebar.value = false
}

const exportCommonCartridge = async () => {
  try {
    if (!specialization.value?.slug) return
    const response = await fetch(`/api/export-common-cartridge?slug=${specialization.value.slug}`)
    if (!response.ok) throw new Error('Export failed')
    
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${specialization.value.slug}-cartridge.zip`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
    announceForA11y('Common Cartridge exported successfully')
  } catch (error) {
    console.error('Failed to export Common Cartridge:', error)
    announceForA11y('Failed to export Common Cartridge')
  }
}

const close = () => {
  emit('close')
  selectedLessonIndex.value = 0
  selectedItemIndex.value = null
  announceForA11y('Specialization modal closed')
  // Clear URL parameters
  const query = { ...route.query }
  delete query.modal
  delete query.lesson
  delete query.item
  router.replace({ query })
  // Restore focus to trigger element
  nextTick(() => {
    triggerElementRef.value?.focus()
  })
}

const onKey = (e: KeyboardEvent) => {
  if (!props.open) return
  
  // Focus trap
  trapFocus(e)
  
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    if (!expandedLessonIndices.value.has(selectedLessonIndex.value)) {
      toggleLessonExpansion(selectedLessonIndex.value)
    } else if (selectedLesson.value?.items.length) {
      nextItem()
    }
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    if (expandedLessonIndices.value.has(selectedLessonIndex.value)) {
      toggleLessonExpansion(selectedLessonIndex.value)
    } else if (selectedItemIndex.value !== null && selectedItemIndex.value > 0) {
      prevItem()
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (selectedLessonIndex.value < lessons.value.length - 1) {
      selectLesson(selectedLessonIndex.value + 1)
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (selectedLessonIndex.value > 0) {
      selectLesson(selectedLessonIndex.value - 1)
    }
  }
}

// Auto-select first lesson and expand it when lessons load
watch(lessons, (newLessons) => {
  if (newLessons.length > 0) {
    // Try to sync from URL first
    const hasURLState = route.query.lesson || route.query.item
    if (hasURLState) {
      syncFromURL()
    } else if (selectedLessonIndex.value === 0) {
      // If no URL state and still on first lesson, initialize and update URL
      expandedLessonIndices.value = new Set([0])
      updateURL()
    }
  }
})

// Load content when selected item changes
watch(selectedItem, () => {
  selectedModalVersion.value = undefined
  loadItemContent()
})

// Watch for URL changes (browser back/forward)
watch(() => route.query, (newQuery, oldQuery) => {
  if (props.open && (newQuery.lesson !== oldQuery.lesson || newQuery.item !== oldQuery.item)) {
    syncFromURL()
  }
}, { deep: true })

// Handle body overflow when modal opens/closes
watch(() => props.open, (isOpen) => {
  toggle(isOpen)
  if (isOpen) {
    announceForA11y(`${specialization.value?.title || 'Specialization'} modal opened. ${lessons.value.length} lessons available.`)
    syncFromURL()
    nextTick(() => {
      closeButtonRef.value?.$el?.focus()
    })
  }
})

// Handle version selection in modal
const handleModalVersionSelect = (version: string) => {
  selectedModalVersion.value = version === 'latest' ? undefined : version
  // Reload content with new version
  loadItemContent()
}

// Watch for version changes and reload content
watch(selectedModalVersion, () => {
  if (selectedItem.value) {
    loadItemContent()
  }
})

onMounted(() => {
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  toggle(false)
})
</script>

<template>
  <Teleport to="body">
    <transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center overflow-y-auto p-4"
        role="presentation"
      >
        <dialog
          ref="modalRef"
          open
          class="relative w-full h-full bg-background rounded-xl shadow-2xl border border-border overflow-hidden flex flex-col lg:flex-row"
          :aria-labelledby="`modal-title-${specialization?.slug}`"
          :aria-describedby="`modal-desc-${specialization?.slug}`"
        >
          <!-- Mobile Lessons Drawer Backdrop -->
          <div
            v-if="showLessonsSidebar"
            class="absolute inset-0 z-40 bg-black/40 lg:hidden"
            @click.stop="showLessonsSidebar = false"
          />

          <!-- Left column: Header + Lessons (Drawer on mobile, sidebar on desktop) -->
          <div
            class="absolute left-0 top-0 bottom-0 z-50 w-3/4 max-w-sm flex flex-col border-r border-border bg-background transition-transform duration-300 ease-in-out lg:static lg:w-1/3 lg:max-w-none lg:translate-x-0 lg:z-auto"
            :class="showLessonsSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
          >
            <!-- Header -->
            <div class="relative bg-gradient-to-r from-primary/10 to-secondary/10 p-4 sm:p-6 border-b border-border">
              <div class="flex justify-between items-start gap-4">
                <div class="space-y-2 flex-1">
                  <p class="text-xs uppercase tracking-[0.08em] text-muted-foreground">Specialization</p>
                  <h2 :id="`modal-title-${specialization?.slug}`" class="text-xl sm:text-2xl font-bold leading-tight">{{ specialization?.title || 'Loading...' }}</h2>
                  <p v-if="specialization?.whoItsFor" :id="`modal-desc-${specialization?.slug}`" class="text-xs sm:text-sm text-muted-foreground">{{ specialization.whoItsFor }}</p>
                  <div class="flex gap-2 flex-wrap text-sm text-muted-foreground">
                    <span v-if="specialization?.difficulty" class="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">{{ specialization.difficulty }}</span>
                    <span v-if="specialization?.estimatedDuration" class="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">{{ specialization.estimatedDuration }}</span>
                    <span v-if="specialization?.targetRole" class="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">{{ specialization.targetRole }}</span>
                  </div>
                </div>
                <Button
                  ref="closeButtonRef"
                  size="icon"
                  variant="ghost"
                  @click.stop="closeDrawer"
                  aria-label="Close lessons drawer"
                  class="shrink-0 lg:hidden"
                >
                  <X class="w-5 h-5" />
                </Button>
              </div>
              <div v-if="specialization?.image" class="mt-4">
                <NuxtImg
                  :src="specialization.image"
                  :alt="specialization.imageAlt || specialization.title"
                  class="w-full h-32 object-cover rounded-lg border border-border"
                  loading="lazy"
                />
              </div>
              <NuxtLink
                v-if="specialization?.slug"
                :to="`/specializations/${specialization.slug}`"
                class="inline-flex items-center gap-2 text-xs text-primary hover:underline mt-3"
                @click.stop
              >
                View full page
                <ExternalLink class="w-3 h-3" />
              </NuxtLink>
            </div>

            <!-- Lessons list -->
            <div class="flex-1 p-4 sm:p-6 space-y-3 overflow-y-auto" aria-label="Lesson list">
              <div class="flex items-center justify-between">
                <h3 class="text-base sm:text-lg font-semibold">Lessons</h3>
                <span class="text-xs sm:text-sm text-muted-foreground">{{ lessons.length }} total</span>
              </div>

              <div v-if="loading" class="space-y-3">
                <div v-for="i in 3" :key="i" class="h-16 rounded-lg bg-muted animate-pulse" />
              </div>

              <div v-else-if="lessons.length === 0" class="text-sm text-muted-foreground">
                No lessons found for this specialization.
              </div>

              <div v-else class="space-y-3">
                <div v-for="(lesson, lessonIdx) in lessons" :key="lesson.slug" class="rounded-lg border transition-all"
                  :class="[
                    expandedLessonIndices.has(lessonIdx as number)
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:border-primary/40'
                  ]"
                >
                  <!-- Lesson header button -->
                  <button
                    type="button"
                    :aria-expanded="expandedLessonIndices.has(lessonIdx as number)"
                    :aria-label="`Lesson ${lesson.order || (lessonIdx as number) + 1}: ${lesson.title}${lesson.estimatedDuration ? '. Duration: ' + lesson.estimatedDuration : ''}`"
                    class="w-full text-left"
                    @click="toggleLessonExpansion(lessonIdx as number); selectLesson(lessonIdx as number)"
                  >
                    <div class="p-4 flex items-start gap-3">
                      <div v-if="lesson.order" class="mt-1 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                        :class="[
                          selectedLessonIndex === lessonIdx
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-primary/10 text-primary'
                        ]"
                      >
                        {{ lesson.order }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                          <h4 class="font-semibold text-foreground">{{ lesson.title }}</h4>
                          <span v-if="lesson.estimatedDuration" class="text-xs text-muted-foreground">| {{ lesson.estimatedDuration }}</span>
                        </div>
                        <p v-if="lesson.description" class="text-sm text-muted-foreground line-clamp-2 mt-1">{{ lesson.description }}</p>
                        <div v-if="lesson.items.length" class="mt-3 text-xs text-muted-foreground">
                          {{ lesson.items.length }} item{{ lesson.items.length !== 1 ? 's' : '' }}
                        </div>
                      </div>
                      <ChevronDown
                        class="w-5 h-5 text-muted-foreground shrink-0 transition-transform"
                        :class="{ 'rotate-180': expandedLessonIndices.has(lessonIdx as number) }"
                      />
                    </div>
                  </button>

                  <!-- Content items - shown when expanded -->
                  <div v-if="expandedLessonIndices.has(lessonIdx as number)" class="px-4 pb-4 pt-2 space-y-2 border-t border-border/50">
                    <!-- Overview button -->
                    <button
                      type="button"
                      :aria-current="selectedLessonIndex === lessonIdx && isOverviewMode ? 'location' : undefined"
                      aria-label="Lesson overview"
                      class="w-full flex items-start gap-3 p-3 rounded-lg transition-all group text-left"
                      :class="[
                        selectedLessonIndex === lessonIdx && isOverviewMode
                          ? 'bg-primary/10'
                          : 'hover:bg-muted/50'
                      ]"
                      @click="selectLesson(lessonIdx as number); selectOverview()"
                    >
                      <Book class="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div class="flex-1 min-w-0">
                        <h5 class="font-semibold text-foreground group-hover:text-primary transition-colors">Overview</h5>
                        <p class="text-sm text-muted-foreground">View lesson details and objectives</p>
                      </div>
                    </button>
                    
                    <!-- Content items -->
                    <button
                      v-for="(item, itemIdx) in lesson.items"
                      :key="`${item.type}-${item.slug}`"
                      type="button"
                      :aria-current="selectedLessonIndex === lessonIdx && selectedItemIndex === itemIdx ? 'location' : undefined"
                      :aria-label="`${item.type}: ${item.title}${item.estimatedDuration ? '. Duration: ' + item.estimatedDuration : ''}`"
                      class="w-full flex items-start gap-3 p-3 rounded-lg transition-all group text-left"
                      :class="[
                        selectedLessonIndex === lessonIdx && selectedItemIndex === itemIdx
                          ? 'bg-primary/10'
                          : 'hover:bg-muted/50'
                      ]"
                      @click="selectLesson(lessonIdx as number); selectItem(itemIdx as number)"
                    >
                      <component :is="getItemIcon(item.type)" class="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                          <span class="text-xs uppercase tracking-[0.08em] text-muted-foreground font-semibold">{{ item.type }}</span>
                          <span v-if="item.estimatedDuration" class="text-xs text-muted-foreground">| {{ item.estimatedDuration }}</span>
                        </div>
                        <h5 class="font-semibold text-foreground group-hover:text-primary transition-colors">{{ item.title }}</h5>
                        <p v-if="item.description" class="text-sm text-muted-foreground line-clamp-2 mt-1">{{ item.description }}</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right column: Full-height content viewer -->
          <section class="w-full lg:flex-1 flex flex-col overflow-hidden" aria-label="Lesson preview">
              <!-- Scrollable content area -->
              <div class="flex-1 p-4 sm:p-6 overflow-y-auto">
                <div v-if="loading" class="space-y-4">
                  <div class="h-8 w-3/4 rounded bg-muted animate-pulse" />
                  <div class="h-4 w-full rounded bg-muted animate-pulse" />
                  <div class="h-4 w-5/6 rounded bg-muted animate-pulse" />
                </div>

                <div v-else-if="!selectedLesson" class="flex flex-col h-full rounded-lg border border-dashed border-border">
                  <!-- Header with close button when no lessons -->
                  <div class="flex items-center justify-between gap-2 p-4 sm:p-6 border-b border-border">
                    <span class="text-sm text-muted-foreground">No lessons available</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      @click.stop="close"
                      aria-label="Close modal"
                    >
                      <X class="w-5 h-5 text-foreground" />
                    </Button>
                  </div>
                  <!-- Center content -->
                  <div class="flex-1 flex items-center justify-center text-center text-sm text-muted-foreground px-4 sm:px-6">
                    Select a lesson to preview
                  </div>
                </div>

                <div v-else class="space-y-6">
                  <!-- Breadcrumb, More Menu, and Close Button -->
                  <div class="flex items-center gap-2 border-b border-border pb-3">
                    <!-- Hamburger menu button for mobile -->
                    <Button
                      size="icon"
                      variant="ghost"
                      @click="showLessonsSidebar = !showLessonsSidebar"
                      aria-label="Toggle lessons navigation"
                      class="lg:hidden shrink-0"
                    >
                      <Menu class="w-5 h-5" />
                    </Button>
                    
                    <!-- Breadcrumb -->
                    <div class="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground min-w-0 flex-1">
                      <span class="font-medium text-foreground">{{ selectedLesson.title }}</span>
                      <template v-if="!isOverviewMode && selectedItem">
                        <span>/</span>
                        <span class="font-medium text-foreground">{{ selectedItem.title }}</span>
                        <span v-if="selectedModalVersion" class="ml-1 inline-flex items-center rounded-full bg-warning/10 border border-warning/20 px-2 py-0.5 text-xs font-semibold text-warning">
                          Version {{ selectedModalVersion }}
                        </span>
                      </template>
                      <template v-else>
                        <span>/</span>
                        <span class="font-medium text-foreground">Overview</span>
                      </template>
                    </div>

                    <!-- Action buttons (right-aligned) -->
                    <div class="flex items-center gap-2 shrink-0">
                      <!-- More menu dropdown -->
                      <div class="relative group">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="More options"
                        >
                          <MoreVertical class="w-5 h-5 text-foreground" />
                        </Button>
                        <div class="absolute right-0 mt-0 w-56 bg-background border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                          <!-- Edit button -->
                          <a
                            v-if="getDecapEditUrl()"
                            :href="getDecapEditUrl()"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted rounded-t-lg transition-colors"
                            @click.stop
                          >
                            <Pencil class="w-4 h-4" />
                            Edit page
                          </a>
                          <div v-if="getDecapEditUrl()" class="h-px bg-border" />
                          
                          <!-- Versions dropdown -->
                          <VersionsDropdown 
                            v-if="!isOverviewMode && selectedItem"
                            :content-type="selectedItem.type"
                            :slug="selectedItem.slug"
                            :current-version="selectedModalVersion"
                            :on-version-select="handleModalVersionSelect"
                          />
                          <div v-if="!isOverviewMode && selectedItem" class="h-px bg-border" />
                          
                          <NuxtLink
                            v-if="isOverviewMode && selectedLesson"
                            :to="`/lessons/${selectedLesson.slug}`"
                            class="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                            :class="getDecapEditUrl() ? '' : 'rounded-t-lg'"
                            @click.stop
                          >
                            <Eye class="w-4 h-4" />
                            View full page
                          </NuxtLink>
                          <NuxtLink
                            v-else-if="!isOverviewMode && selectedItem"
                            :to="getItemPath(selectedItem.type, selectedItem.slug)"
                            class="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                            :class="getDecapEditUrl() ? '' : 'rounded-t-lg'"
                            @click.stop
                          >
                            <Eye class="w-4 h-4" />
                            View full page
                          </NuxtLink>
                          <div v-if="(isOverviewMode && selectedLesson) || (!isOverviewMode && selectedItem)" class="h-px bg-border" />
                          <button
                            @click.stop="exportCommonCartridge"
                            class="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted rounded-b-lg transition-colors text-left"
                          >
                            <Download class="w-4 h-4" />
                            Export Common Cartridge
                          </button>
                        </div>
                      </div>
                      
                      <!-- Close button -->
                      <Button
                        size="icon"
                        variant="ghost"
                        @click.stop="close"
                        aria-label="Close modal"
                      >
                        <X class="w-5 h-5 text-foreground" />
                      </Button>
                    </div>
                  </div>

                  <!-- Overview content (lesson details) -->
                  <div v-if="isOverviewMode" class="space-y-6 prose dark:prose-invert max-w-none prose-headings:text-foreground prose-headings:font-bold prose-headings:tracking-tight prose-h3:text-2xl prose-h4:text-sm prose-p:text-foreground prose-p:text-base prose-p:leading-7 prose-li:text-foreground prose-li:text-sm prose-strong:text-foreground">
                    <div class="space-y-2">
                      <div class="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-[0.08em]">
                        <span>Lesson {{ selectedLesson.order || selectedLessonIndex + 1 }}</span>
                        <span v-if="selectedLesson.estimatedDuration">| {{ selectedLesson.estimatedDuration }}</span>
                      </div>
                      <h3 class="text-2xl font-bold">{{ selectedLesson.title }}</h3>
                      <p v-if="selectedLesson.description" class="text-muted-foreground">{{ selectedLesson.description }}</p>
                    </div>

                    <!-- Learning objectives -->
                    <div v-if="selectedLesson.learningObjectives?.length" class="space-y-2">
                      <h4 class="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">Learning Objectives</h4>
                      <ul class="list-disc list-inside space-y-1 text-sm">
                        <li v-for="(objective, i) in selectedLesson.learningObjectives" :key="i">{{ objective }}</li>
                      </ul>
                    </div>
                  </div>

                  <!-- Item content -->
                  <div v-else>
                    <div v-if="loadingItemContent" class="space-y-4">
                      <div class="h-8 w-3/4 rounded bg-muted animate-pulse" />
                      <div class="h-4 w-full rounded bg-muted animate-pulse" />
                      <div class="h-4 w-5/6 rounded bg-muted animate-pulse" />
                    </div>

                    <div v-else-if="selectedItemContent" class="space-y-6">
                      <!-- Item header -->
                      <div class="space-y-4">
                        <NuxtImg
                          v-if="selectedItemContent.image"
                          :src="selectedItemContent.image"
                          :alt="selectedItemContent.imageAlt || selectedItemContent.title"
                          class="w-full object-cover rounded-lg"
                          loading="lazy"
                        />
                        
                        <h3 class="text-2xl sm:text-3xl font-bold tracking-tight">{{ selectedItemContent.title }}</h3>
                        
                        <div class="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <div v-if="selectedItemContent.difficulty">
                            <span class="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary">
                              {{ selectedItemContent.difficulty }}
                            </span>
                          </div>
                          <div v-if="selectedItemContent.difficulty && selectedItemContent.tags && selectedItemContent.tags.length > 0" class="h-4 w-px bg-border"></div>
                          <div v-if="selectedItemContent.tags && selectedItemContent.tags.length > 0" class="flex flex-wrap gap-2">
                            <span
                              v-for="tag in selectedItemContent.tags"
                              :key="tag"
                              class="inline-flex items-center rounded-full bg-muted border border-border px-3 py-1 text-xs font-medium text-foreground"
                            >
                              {{ tag }}
                            </span>
                          </div>
                        </div>

                        <!-- Attachments -->
                        <div v-if="selectedItemContent.attachments && selectedItemContent.attachments.length > 0" class="pt-4 border-t">
                          <div class="space-y-2">
                            <a
                              v-for="(attachment, index) in selectedItemContent.attachments.filter((a: any) => a.url)"
                              :key="`url-${index}`"
                              :href="attachment.url"
                              target="_blank"
                              rel="noopener noreferrer"
                              class="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors group"
                            >
                              <div class="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                <ExternalLink class="w-4 h-4 text-primary" />
                              </div>
                              <div class="flex-1 min-w-0">
                                <h4 class="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">
                                  {{ attachment.title }}
                                </h4>
                              </div>
                              <ExternalLink class="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                            </a>
                            <a
                              v-for="(attachment, index) in selectedItemContent.attachments.filter((a: any) => a.file)"
                              :key="`file-${index}`"
                              :href="attachment.file"
                              download
                              class="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors group"
                            >
                              <div class="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                <Download class="w-4 h-4 text-primary" />
                              </div>
                              <div class="flex-1 min-w-0">
                                <h4 class="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">
                                  {{ attachment.title }}
                                </h4>
                              </div>
                              <Download class="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                            </a>
                          </div>
                        </div>
                      </div>

                      <!-- Item body content -->
                      <div class="prose dark:prose-invert max-w-none prose-headings:text-foreground prose-headings:font-bold prose-headings:tracking-tight prose-h2:text-3xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-foreground prose-p:text-base prose-p:leading-7 prose-li:text-foreground prose-li:text-base prose-code:text-foreground prose-code:text-sm prose-code:bg-muted/50 dark:prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:border prose-code:border-border/50 prose-pre:bg-muted dark:prose-pre:bg-[#0a0a0a] prose-pre:text-foreground prose-pre:border prose-pre:border-border/50 prose-a:text-primary prose-a:font-medium prose-a:no-underline prose-strong:text-foreground prose-blockquote:text-foreground prose-blockquote:border-l-primary">
                        <ContentRenderer v-if="selectedItemContent.body" :value="selectedItemContent" />
                      </div>

                      <!-- Embed section -->
                      <div v-if="selectedItemContent.allowEmbed" class="mt-8 pt-8 border-t">
                        <button
                          @click="isEmbedOpen = !isEmbedOpen"
                          class="flex items-center justify-between w-full text-left group"
                          :aria-label="isEmbedOpen ? 'Hide embed code' : 'Show embed code'"
                          :aria-expanded="isEmbedOpen"
                        >
                          <h4 class="text-xl font-bold text-foreground">Embed</h4>
                          <ChevronDown
                            :class="['w-5 h-5 text-muted-foreground transition-transform', isEmbedOpen ? 'rotate-180' : '']"
                          />
                        </button>
                        <div v-if="isEmbedOpen" class="mt-6 space-y-4">
                          <p class="text-sm text-muted-foreground">
                            Copy the code below to embed this content on your website:
                          </p>
                          <div class="relative">
                            <pre class="p-4 bg-muted dark:bg-[#0a0a0a] rounded-lg border border-border overflow-x-auto text-sm"><code>{{ embedCode }}</code></pre>
                            <Button
                              @click="copyEmbedCode"
                              size="sm"
                              variant="outline"
                              class="absolute top-2 right-2"
                            >
                              <Check v-if="isCopied" class="w-4 h-4 mr-2" />
                              <Copy v-else class="w-4 h-4 mr-2" />
                              {{ isCopied ? 'Copied!' : 'Copy' }}
                            </Button>
                          </div>
                          <div class="mt-4">
                            <p class="text-xs text-muted-foreground mb-2">Preview:</p>
                            <div class="border border-border rounded-lg p-2 bg-muted/30">
                              <iframe
                                :src="embedUrl"
                                class="w-full h-96 rounded"
                                frameborder="0"
                              ></iframe>
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- AI Usage License (AIUL) -->
                      <AIULComponent v-if="selectedItemContent.aiLicense" :license="selectedItemContent.aiLicense" class="mt-8 pt-8 border-t" />

                      <!-- Creative Commons License -->
                      <div v-if="selectedItemContent.license" class="mt-8 pt-8 border-t">
                        <p class="text-sm text-muted-foreground leading-relaxed">
                          <span class="font-medium text-foreground">{{ selectedItemContent.title }}</span>
                          <span v-if="selectedItemContent.author"> by {{ selectedItemContent.author }}</span>
                          is licensed under
                          <span class="font-medium text-foreground">{{ selectedItemContent.license }}</span>
                        </p>
                      </div>
                    </div>

                    <div v-else-if="selectedItem" class="text-sm text-muted-foreground text-center py-8">
                      Unable to load content
                    </div>
                  </div>
                </div>
              </div>

              <!-- Sticky footer with item navigation -->
              <div v-if="selectedLesson" class="flex items-center justify-between gap-2 px-4 sm:px-6 py-3 border-t border-border bg-muted/30 dark:bg-muted/50 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  :disabled="!canNavigatePrev()"
                  @click="prevItem"
                  class="text-xs sm:text-sm text-foreground"
                >
                  <ChevronLeft class="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span class="hidden sm:inline">Previous</span>
                  <span class="sm:hidden">Prev</span>
                </Button>
                <span class="text-xs text-muted-foreground order-last sm:order-none w-full sm:w-auto text-center py-2 sm:py-0">{{ getCurrentItemNumber() }} / {{ getTotalItemCount() }}</span>
                <Button
                  size="sm"
                  variant="outline"
                  :disabled="!canNavigateNext()"
                  @click="nextItem"
                  class="text-xs sm:text-sm text-foreground"
                >
                  <span class="hidden sm:inline">Next</span>
                  <span class="sm:hidden">Next</span>
                  <ChevronRight class="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                </Button>
              </div>
            </section>
          </dialog>
        </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Prose link styling for modal */
:deep(.prose a) {
  text-decoration: none;
}

:deep(.prose a:hover) {
  text-decoration: underline;
  text-decoration-color: hsl(var(--primary) / 0.6);
  text-underline-offset: 3px;
}

:deep(.prose h1 a),
:deep(.prose h2 a),
:deep(.prose h3 a),
:deep(.prose h4 a),
:deep(.prose h5 a),
:deep(.prose h6 a) {
  color: hsl(var(--foreground));
  text-decoration: none;
}
</style>
