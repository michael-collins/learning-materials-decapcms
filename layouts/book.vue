<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { BookOpen, ChevronRight, ChevronDown, ChevronLeft, PanelLeft, Menu, X, Search, Sun, Moon } from 'lucide-vue-next'
import { useWindowSize } from '@vueuse/core'
import Button from '~/components/ui/button/Button.vue'
import type { SidebarNode } from '~/composables/useBookOutline'
import { useBookTheme } from '~/composables/useBookTheme'

const route = useRoute()
const { isDark: isCurrentDark, toggleTheme } = useTheme()
const { width } = useWindowSize()
const isMobileMenuOpen = ref(false)
const sidebarRef = ref<HTMLElement | null>(null)
const isMobile = computed(() => width.value < 768)
const isDesktopCollapsed = ref(false)

// Detect OS for keyboard shortcuts
const isMac = ref(false)
onMounted(() => {
  isMac.value = typeof window !== 'undefined' &&
    (navigator.platform.toUpperCase().indexOf('MAC') >= 0 ||
     navigator.platform.toUpperCase().indexOf('IPHONE') >= 0 ||
     navigator.platform.toUpperCase().indexOf('IPAD') >= 0)
})

// Book data is provided by the page via injection
const bookTitle = useState<string>('book-title', () => '')
const bookSlug = useState<string>('book-slug', () => '')
const bookThemeName = useState<string>('book-theme', () => 'default')
const sidebarTree = useState<SidebarNode[]>('book-sidebar-tree', () => [])
const prevChapter = useState<{ title: string; fullPath: string } | null>('book-prev', () => null)
const nextChapter = useState<{ title: string; fullPath: string } | null>('book-next', () => null)

// Theme system
const { config: themeConfig, cssVarStyle } = useBookTheme(bookThemeName)

const rootClass = computed(() => themeConfig.value.rootClass)
const sidebarThemeClass = computed(() => themeConfig.value.sidebar.class)
const contentThemeClass = computed(() => themeConfig.value.content.class)
const headerThemeClass = computed(() => themeConfig.value.header.class)
const themeStyle = computed(() => cssVarStyle.value)

// Track which sections are manually toggled
const toggledSections = ref<Set<string>>(new Set())

function isSectionExpanded(node: SidebarNode): boolean {
  if (toggledSections.value.has(node.fullPath)) {
    // Manually toggled — invert the default
    return !node.isExpanded
  }
  return node.isExpanded
}

function toggleSection(node: SidebarNode) {
  const path = node.fullPath
  if (toggledSections.value.has(path)) {
    toggledSections.value.delete(path)
  } else {
    toggledSections.value.add(path)
  }
}

// Reset manual toggles when route changes
watch(() => route.path, () => {
  toggledSections.value.clear()
  closeMobileMenu()
})

const toggleSidebar = () => {
  if (isMobile.value) {
    isMobileMenuOpen.value = !isMobileMenuOpen.value
  } else {
    isDesktopCollapsed.value = !isDesktopCollapsed.value
  }
}

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
  document.body.style.overflow = ''
}

// Keyboard events
const handleEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isMobile.value && isMobileMenuOpen.value) {
    closeMobileMenu()
  }
}

const handleClickOutside = (e: MouseEvent) => {
  if (!isMobile.value || !isMobileMenuOpen.value) return
  if (sidebarRef.value && !sidebarRef.value.contains(e.target as Node)) {
    closeMobileMenu()
  }
}

// Prevent body scroll when mobile menu is open
watch(isMobileMenuOpen, (isOpen) => {
  if (isMobile.value) {
    document.body.style.overflow = isOpen ? 'hidden' : ''
  }
})

watch(isMobile, (mobile, wasMobile) => {
  if (wasMobile && !mobile) {
    isMobileMenuOpen.value = false
    document.body.style.overflow = ''
  }
})

onMounted(() => {
  isMobileMenuOpen.value = false
  document.body.style.overflow = ''
  document.addEventListener('keydown', handleEscape)
  document.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
  document.removeEventListener('mousedown', handleClickOutside)
  document.body.style.overflow = ''
})

// Open command palette
const openCommandPalette = () => {
  const { open } = useCommandPalette()
  open()
}

// Book-scoped search
const bookSearchQuery = ref('')
const bookSearchInputRef = ref<HTMLInputElement | null>(null)

function filterTree(nodes: SidebarNode[], query: string): SidebarNode[] {
  if (!query) return nodes
  const q = query.toLowerCase()
  const results: SidebarNode[] = []
  for (const node of nodes) {
    const titleMatch = node.title.toLowerCase().includes(q)
    const filteredChildren = filterTree(node.children, query)
    if (titleMatch || filteredChildren.length > 0) {
      results.push({
        ...node,
        children: filteredChildren,
        isExpanded: true, // auto-expand matching branches
      })
    }
  }
  return results
}

const filteredSidebarTree = computed(() =>
  filterTree(sidebarTree.value, bookSearchQuery.value)
)
</script>

<template>
  <div :class="['flex min-h-screen bg-background', rootClass]" :style="themeStyle">
    <!-- Skip Links -->
    <div class="sr-only focus-within:not-sr-only">
      <div class="fixed top-2 left-2 z-100 flex gap-2 bg-background/95 backdrop-blur-sm border rounded-2xl p-2 shadow-lg">
        <Button asChild size="sm" class="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
          <a href="#main-content">Skip to main content</a>
        </Button>
      </div>
    </div>

    <!-- Mobile backdrop -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isMobile && isMobileMenuOpen"
        class="fixed inset-0 bg-black/50 z-40 md:hidden"
        @click="closeMobileMenu"
      />
    </Transition>

    <!-- Sidebar -->
    <aside
      ref="sidebarRef"
      :class="[
        'bg-card transition-all duration-200 ease-in-out flex flex-col',
        'fixed inset-y-0 left-0 z-50 w-72 border-r -translate-x-full',
        'md:fixed md:inset-y-0 md:left-0 md:translate-x-0 md:z-30',
        isMobile && isMobileMenuOpen && 'translate-x-0',
        !isMobile && (isDesktopCollapsed ? 'md:w-0 md:border-r-0' : 'md:w-72'),
        rootClass === 'theme-lambda' ? 'shadow-none' : 'shadow-lg md:shadow-none',
        sidebarThemeClass,
      ]"
    >
      <div :class="['flex flex-col h-full', !isMobile && isDesktopCollapsed && 'invisible']">
        <!-- Book title header -->
        <div :class="[
          'flex h-14 items-center justify-between px-4 border-b shrink-0',
          rootClass === 'theme-lambda' ? 'uppercase tracking-tight text-xs' : '',
        ]">
          <NuxtLink
            :to="`/books/${bookSlug}`"
            class="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors truncate"
          >
            <BookOpen class="h-4 w-4 shrink-0" />
            <span class="truncate">{{ bookTitle || 'Book' }}</span>
          </NuxtLink>
          <Button
            v-if="isMobile"
            variant="ghost"
            size="icon"
            @click="closeMobileMenu"
            class="h-8 w-8 md:hidden shrink-0"
          >
            <X class="h-5 w-5" />
            <span class="sr-only">Close menu</span>
          </Button>
        </div>

        <!-- Sidebar tree navigation -->
        <nav class="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 min-h-0" aria-label="Book navigation">
          <BookSidebarTree :nodes="filteredSidebarTree" :book-slug="bookSlug" :toggled-sections="toggledSections" @toggle="toggleSection" />
          <p v-if="bookSearchQuery && filteredSidebarTree.length === 0" class="px-2 py-4 text-xs text-muted-foreground text-center">
            No results for "{{ bookSearchQuery }}"
          </p>
        </nav>

        <!-- Book search -->
        <div class="shrink-0 border-t px-2 py-2">
          <div class="relative">
            <Search class="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
            <input
              ref="bookSearchInputRef"
              v-model="bookSearchQuery"
              type="text"
              placeholder="Search this book…"
              class="w-full h-8 pl-7 pr-2 text-[13px] bg-muted/50 border border-border/50 rounded-md text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring focus:bg-background transition-colors"
              @keydown.escape="bookSearchQuery = ''"
            />
          </div>
        </div>
      </div>
    </aside>

    <!-- Main content area -->
    <div :class="[
      'flex-1 overflow-auto flex flex-col',
      !isMobile && !isDesktopCollapsed && 'md:ml-72'
    ]">
      <!-- Header -->
      <header :class="['sticky top-0 z-10 shrink-0 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60', headerThemeClass]">
        <div class="flex h-14 items-center gap-2 px-4">
          <Button variant="ghost" size="icon" @click="toggleSidebar" class="h-7 w-7 shrink-0">
            <Menu class="h-4 w-4 md:hidden" />
            <PanelLeft class="h-4 w-4 hidden md:block" />
            <span class="sr-only">Toggle sidebar</span>
          </Button>

          <div class="flex-1" />

          <!-- Theme toggle -->
          <Button
            variant="ghost"
            size="icon"
            @click="toggleTheme"
            :aria-label="isCurrentDark ? 'Switch to light mode' : 'Switch to dark mode'"
            class="h-7 w-7 shrink-0"
          >
            <Sun v-if="isCurrentDark" class="h-4 w-4" />
            <Moon v-else class="h-4 w-4" />
          </Button>
        </div>
      </header>

      <!-- Page content -->
      <main id="main-content" class="flex-1">
        <slot />
      </main>

      <!-- Prev/Next pagination -->
      <div v-if="prevChapter || nextChapter" :class="['border-t', rootClass === 'theme-lambda' ? 'border-border' : '']">
        <div class="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div class="flex items-stretch gap-4" :class="!prevChapter ? 'justify-end' : 'justify-between'">
            <NuxtLink
              v-if="prevChapter"
              :to="`/books/${bookSlug}/${prevChapter.fullPath}`"
              :class="[
                'group flex flex-col items-start gap-1 border px-4 py-3 transition-colors max-w-[45%]',
                rootClass === 'theme-lambda' ? 'hover:bg-accent hover:text-accent-foreground' : 'rounded-lg hover:bg-muted/50'
              ]"
            >
              <span class="flex items-center gap-1 text-xs text-muted-foreground">
                <ChevronLeft class="h-3 w-3" />
                Previous
              </span>
              <span class="text-sm font-medium group-hover:text-primary transition-colors truncate max-w-full">
                {{ prevChapter.title }}
              </span>
            </NuxtLink>

            <NuxtLink
              v-if="nextChapter"
              :to="`/books/${bookSlug}/${nextChapter.fullPath}`"
              :class="[
                'group flex flex-col items-end gap-1 border px-4 py-3 transition-colors max-w-[45%]',
                rootClass === 'theme-lambda' ? 'hover:bg-accent hover:text-accent-foreground' : 'rounded-lg hover:bg-muted/50'
              ]"
            >
              <span class="flex items-center gap-1 text-xs text-muted-foreground">
                Next
                <ChevronRight class="h-3 w-3" />
              </span>
              <span class="text-sm font-medium group-hover:text-primary transition-colors truncate max-w-full">
                {{ nextChapter.title }}
              </span>
            </NuxtLink>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
