<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed, ref, watch, nextTick } from 'vue'
import { useSpecializationBundle } from '~/composables/useSpecializationBundle'
import { useBodyOverflow } from '~/composables/useBodyOverflow'
import Button from '~/components/ui/button/Button.vue'
import { X, ExternalLink, ChevronLeft, ChevronRight, ChevronDown, Book, FileText, Dumbbell, Lightbulb, FolderKanban } from 'lucide-vue-next'

interface Props {
  open: boolean
  slug: string | null
}

const props = defineProps<Props>()
const emit = defineEmits(['close'])

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
    const content = await queryCollection(type === 'articles' ? 'articles' : type)
      .path(`${basePath}/${slug}`)
      .first()
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
}

const selectOverview = () => {
  selectedItemIndex.value = null
  announceForA11y(`Viewing lesson overview`)
}

const selectItem = (index: number) => {
  selectedItemIndex.value = index
  if (selectedLesson.value?.items[index]) {
    announceForA11y(`Selected ${selectedLesson.value.items[index].type}: ${selectedLesson.value.items[index].title}`)
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
  if (!selectedLesson.value || selectedItemIndex.value === null) return
  if (selectedItemIndex.value < selectedLesson.value.items.length - 1) {
    selectedItemIndex.value++
  } else if (selectedLessonIndex.value < lessons.value.length - 1) {
    nextLesson()
  }
}

const prevItem = () => {
  if (selectedItemIndex.value === null) return
  if (selectedItemIndex.value > 0) {
    selectedItemIndex.value--
  } else if (selectedLessonIndex.value > 0) {
    prevLesson()
    const previousLesson = lessons.value[selectedLessonIndex.value]
    selectedItemIndex.value = Math.max(0, previousLesson.items.length - 1)
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

const getItemPath = (type: string, slug: string) => {
  return `/${type}/${slug}`
}

const close = () => {
  emit('close')
  selectedLessonIndex.value = 0
  selectedItemIndex.value = null
  announceForA11y('Specialization modal closed')
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
  if (newLessons.length > 0 && selectedLessonIndex.value === 0) {
    selectLesson(0)
    expandedLessonIndices.value = new Set([0])
  }
})

// Load content when selected item changes
watch(selectedItem, () => {
  loadItemContent()
})

// Handle body overflow when modal opens/closes
watch(() => props.open, (isOpen) => {
  toggle(isOpen)
  if (isOpen) {
    announceForA11y(`${specialization.value?.title || 'Specialization'} modal opened. ${lessons.value.length} lessons available.`)
    nextTick(() => {
      closeButtonRef.value?.$el?.focus()
    })
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
        class="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center overflow-y-auto p-4"
        role="presentation"
        @click.self="close"
      >
        <dialog
          ref="modalRef"
          open
          class="relative w-full h-full bg-background rounded-xl shadow-2xl border border-border overflow-hidden flex"
          :aria-labelledby="`modal-title-${specialization?.slug}`"
          :aria-describedby="`modal-desc-${specialization?.slug}`"
        >
          <!-- Left column: Header + Lessons -->
          <div class="w-1/3 flex flex-col border-r border-border bg-muted/30">
            <!-- Header -->
            <div class="relative bg-gradient-to-r from-primary/10 to-secondary/10 p-6 md:p-8 border-b border-border">
              <div class="flex justify-between items-start gap-4">
                <div class="space-y-2 flex-1">
                  <p class="text-xs uppercase tracking-[0.08em] text-muted-foreground">Specialization</p>
                  <h2 :id="`modal-title-${specialization?.slug}`" class="text-2xl font-bold leading-tight">{{ specialization?.title || 'Loading...' }}</h2>
                  <p v-if="specialization?.whoItsFor" :id="`modal-desc-${specialization?.slug}`" class="text-sm text-muted-foreground">{{ specialization.whoItsFor }}</p>
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
                  @click.stop="close"
                  aria-label="Close specialization modal"
                  class="shrink-0"
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
            <div class="flex-1 p-6 md:p-8 space-y-4 overflow-y-auto" aria-label="Lesson list">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold">Lessons</h3>
                <span class="text-sm text-muted-foreground">{{ lessons.length }} total</span>
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
          <section class="flex-1 flex flex-col overflow-hidden" aria-label="Lesson preview">
              <!-- Scrollable content area -->
              <div class="flex-1 p-6 md:p-8 overflow-y-auto">
                <div v-if="loading" class="space-y-4">
                  <div class="h-8 w-3/4 rounded bg-muted animate-pulse" />
                  <div class="h-4 w-full rounded bg-muted animate-pulse" />
                  <div class="h-4 w-5/6 rounded bg-muted animate-pulse" />
                </div>

                <div v-else-if="!selectedLesson" class="h-full rounded-lg border border-dashed border-border flex items-center justify-center text-center text-sm text-muted-foreground">
                  Select a lesson to preview
                </div>

                <div v-else class="space-y-6">
                  <!-- Breadcrumb -->
                  <div class="flex items-center justify-between border-b border-border pb-4">
                    <div class="flex items-center gap-2 text-sm text-muted-foreground">
                      <span class="font-medium text-foreground">{{ selectedLesson.title }}</span>
                      <template v-if="!isOverviewMode && selectedItem">
                        <span>/</span>
                        <span class="font-medium text-foreground">{{ selectedItem.title }}</span>
                      </template>
                      <template v-else>
                        <span>/</span>
                        <span class="font-medium text-foreground">Overview</span>
                      </template>
                    </div>
                    <NuxtLink
                      v-if="!isOverviewMode && selectedItem"
                      :to="getItemPath(selectedItem.type, selectedItem.slug)"
                      class="inline-flex items-center gap-2 text-sm text-primary hover:underline shrink-0"
                      @click.stop
                    >
                      Open
                      <ExternalLink class="w-4 h-4" />
                    </NuxtLink>
                  </div>

                  <!-- Overview content (lesson details) -->
                  <div v-if="isOverviewMode" class="space-y-6">
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

                    <div v-else-if="selectedItemContent" class="space-y-4">
                      <div v-if="selectedItemContent.description" class="text-sm text-muted-foreground pb-4 border-b border-border">
                        {{ selectedItemContent.description }}
                      </div>

                      <div class="prose-content space-y-3">
                        <ContentRenderer v-if="selectedItemContent.body" :value="selectedItemContent" />
                      </div>
                    </div>

                    <div v-else-if="selectedItem" class="text-sm text-muted-foreground text-center py-8">
                      Unable to load content
                    </div>
                  </div>
                </div>
              </div>

              <!-- Sticky footer with lesson navigation -->
              <div v-if="selectedLesson" class="flex items-center justify-between px-6 md:px-8 py-4 border-t border-border bg-muted/30">
                <Button
                  size="sm"
                  variant="outline"
                  :disabled="selectedLessonIndex === 0"
                  @click="prevLesson"
                >
                  <ChevronLeft class="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <span class="text-xs text-muted-foreground">{{ selectedLessonIndex + 1 }} / {{ lessons.length }}</span>
                <Button
                  size="sm"
                  variant="outline"
                  :disabled="selectedLessonIndex === lessons.length - 1"
                  @click="nextLesson"
                >
                  Next
                  <ChevronRight class="w-4 h-4 ml-1" />
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

/* Content rendering styles */
:deep(.prose-content) {
  font-size: 0.95rem;
  line-height: 1.6;
  color: hsl(var(--foreground));
}


:deep(.prose-content a:hover) {
  text-decoration: none;
}
:deep(.prose-content h1),
:deep(.prose-content h2),
:deep(.prose-content h3),
:deep(.prose-content h4),
:deep(.prose-content h5),
:deep(.prose-content h6) {
  color: hsl(var(--foreground));
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

:deep(.prose-content h1) { font-size: 1.5rem; }
:deep(.prose-content h2) { font-size: 1.25rem; }
:deep(.prose-content h3) { font-size: 1.1rem; }
:deep(.prose-content h4) { font-size: 1rem; }

:deep(.prose-content p) {
  margin-bottom: 1rem;
}

:deep(.prose-content ul),
:deep(.prose-content ol) {
  margin-left: 1.5rem;
  margin-bottom: 1rem;
}

:deep(.prose-content li) {
  margin-bottom: 0.5rem;
}

:deep(.prose-content code) {
  background-color: hsl(var(--muted));
  color: hsl(var(--foreground));
  padding: 0.2rem 0.4rem;
  border-radius: 0.25rem;
  font-size: 0.9em;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
}

:deep(.prose-content pre) {
  background-color: hsl(var(--muted));
  color: hsl(var(--foreground));
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin-bottom: 1rem;
}

:deep(.prose-content pre code) {
  background-color: transparent;
  padding: 0;
  color: inherit;
}

:deep(.prose-content blockquote) {
  border-left: 4px solid hsl(var(--primary));
  padding-left: 1rem;
  color: hsl(var(--muted-foreground));
  font-style: italic;
  margin-bottom: 1rem;
}

:deep(.prose-content a) {
  color: hsl(var(--primary));
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s;
}

:deep(.prose-content a:hover) {
  border-bottom-color: hsl(var(--primary));
}

:deep(.prose-content img) {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

:deep(.prose-content table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

:deep(.prose-content th),
:deep(.prose-content td) {
  border: 1px solid hsl(var(--border));
  padding: 0.5rem;
  text-align: left;
}

:deep(.prose-content th) {
  background-color: hsl(var(--muted));
  font-weight: 600;
  color: hsl(var(--foreground));
}

:deep(.prose-content hr) {
  border: none;
  border-top: 1px solid hsl(var(--border));
  margin: 1.5rem 0;
}

:deep(.prose-content h1 a),
:deep(.prose-content h2 a),
:deep(.prose-content h3 a),
:deep(.prose-content h4 a),
:deep(.prose-content h5 a),
:deep(.prose-content h6 a) {
  color: hsl(var(--foreground));
  text-decoration: none;
}
</style>
