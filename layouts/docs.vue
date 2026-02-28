<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { BookOpen, GraduationCap, PanelLeft, ChevronRight, Menu, X, ClipboardCheck, Compass, Library, AlertCircle, Info, Wrench, Search } from 'lucide-vue-next'
import { useWindowSize } from '@vueuse/core'
import Button from '~/components/ui/button/Button.vue'
import SidebarFooter from '~/components/ui/sidebar/SidebarFooter.vue'
import Breadcrumb from '~/components/ui/breadcrumb/Breadcrumb.vue'
import BreadcrumbItem from '~/components/ui/breadcrumb/BreadcrumbItem.vue'
import BreadcrumbLink from '~/components/ui/breadcrumb/BreadcrumbLink.vue'
import BreadcrumbSeparator from '~/components/ui/breadcrumb/BreadcrumbSeparator.vue'
import BreadcrumbPage from '~/components/ui/breadcrumb/BreadcrumbPage.vue'
import Popover from '~/components/ui/popover/Popover.vue'
import PopoverTrigger from '~/components/ui/popover/PopoverTrigger.vue'
import PopoverContent from '~/components/ui/popover/PopoverContent.vue'
import TooltipProvider from '~/components/ui/tooltip/TooltipProvider.vue'
import Tooltip from '~/components/ui/tooltip/Tooltip.vue'
import TooltipTrigger from '~/components/ui/tooltip/TooltipTrigger.vue'
import TooltipContent from '~/components/ui/tooltip/TooltipContent.vue'

const route = useRoute()
const { width } = useWindowSize()
const isMobileMenuOpen = ref(false)
const sidebarRef = ref<HTMLElement | null>(null)

// Determine if we're on mobile (< 768px)
const isMobile = computed(() => width.value < 768)

// Desktop sidebar collapsed state (ignored on mobile)
const isDesktopCollapsed = ref(false)

// Detect operating system for keyboard shortcuts
const isMac = ref(false)
onMounted(() => {
  isMac.value = typeof window !== 'undefined' && 
    (navigator.platform.toUpperCase().indexOf('MAC') >= 0 || 
     navigator.platform.toUpperCase().indexOf('IPHONE') >= 0 ||
     navigator.platform.toUpperCase().indexOf('IPAD') >= 0)
})

// Open command palette
const openCommandPalette = () => {
  const { open } = useCommandPalette()
  open()
}

// Version comparison logic
const latestVersion = ref<string | null>(null)
const currentPageVersion = ref<string | null>(null)
const allVersions = ref<Array<{ version: string, versionStatus: string }>>([])
const isValidVersion = ref(true)

// Only show version UI on content detail pages (e.g. /lessons/my-lesson),
// not on listing pages (/lessons), the front page (/), or tools pages.
const isContentDetailPage = computed(() => {
  const pathParts = route.path.split('/').filter(Boolean)
  // Need at least 2 segments: <collection>/<slug>
  // Exclude CMS and tools routes which aren't versioned content
  if (pathParts.length < 2) return false
  if (pathParts[0] === 'cms' || pathParts[0] === 'tools' || pathParts[0] === 'embed') return false
  return true
})

// Fetch all versions and latest version
const fetchLatestVersion = async () => {
  if (!route.query.version) {
    // If no version param, fetch current page version
    await fetchCurrentPageVersion()
    return
  }
  
  try {
    const pathParts = route.path.split('/').filter(Boolean)
    if (pathParts.length >= 2) {
      const contentType = pathParts[0]
      const slug = pathParts.slice(1).join('/')
      
      // Fetch all available versions
      const { versions } = await useContentVersions(contentType as any, slug)
      allVersions.value = versions.value || []
      
      // Check if the requested version exists
      const requestedVersion = route.query.version as string
      isValidVersion.value = allVersions.value.some(v => v.version === requestedVersion)
      
      // Try to fetch the latest version (index.md)
      const latest = await queryCollection(contentType as any).path(`/${contentType}/${slug}`).first()
      if (latest?.version) {
        latestVersion.value = latest.version
      }
    }
  } catch (e) {
    console.error('Failed to fetch latest version:', e)
  }
}

// Fetch current page version for latest content
const fetchCurrentPageVersion = async () => {
  try {
    const pathParts = route.path.split('/').filter(Boolean)
    if (pathParts.length >= 2) {
      const contentType = pathParts[0]
      const slug = pathParts.slice(1).join('/')
      
      const content = await queryCollection(contentType as any).path(`/${contentType}/${slug}`).first()
      if (content?.version) {
        currentPageVersion.value = content.version
      }
    }
  } catch (e) {
    console.error('Failed to fetch current page version:', e)
  }
}

// Parse semantic version
const parseVersion = (version: string) => {
  const parts = version.split('.').map(Number)
  return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 }
}

// Determine all available version updates
const availableUpdates = computed(() => {
  if (!route.query.version || !latestVersion.value || allVersions.value.length === 0) return []
  
  const current = parseVersion(route.query.version as string)
  const latest = parseVersion(latestVersion.value)
  
  const updates = []
  
  // Find the highest minor version in the current major version (e.g., 3.4.0 when on 3.3.0)
  let highestMinorInMajor: { major: number, minor: number, patch: number, versionString: string } | null = null
  
  allVersions.value.forEach(v => {
    const parsed = parseVersion(v.version)
    // Only consider versions in the same major as current
    if (parsed.major === current.major && parsed.minor > current.minor) {
      if (!highestMinorInMajor || parsed.minor > highestMinorInMajor.minor || 
         (parsed.minor === highestMinorInMajor.minor && parsed.patch > highestMinorInMajor.patch)) {
        highestMinorInMajor = { ...parsed, versionString: v.version }
      }
    }
  })
  
  // Find the highest patch version in the current major.minor (e.g., 3.3.1 when on 3.3.0)
  let highestPatchInMinor: { major: number, minor: number, patch: number, versionString: string } | null = null
  
  allVersions.value.forEach(v => {
    const parsed = parseVersion(v.version)
    // Only consider versions in the same major.minor as current
    if (parsed.major === current.major && parsed.minor === current.minor && parsed.patch > current.patch) {
      if (!highestPatchInMinor || parsed.patch > highestPatchInMinor.patch) {
        highestPatchInMinor = { ...parsed, versionString: v.version }
      }
    }
  })
  
  // Check for major version update
  if (latest.major > current.major) {
    updates.push({
      type: 'major',
      title: 'Major Version Update Available',
      description: `Version ${latestVersion.value} is available and may contain significant updates and breaking changes.`,
      icon: AlertCircle,
      version: latestVersion.value
    })
  }
  
  // Check for minor version update (same major, higher minor)
  if (highestMinorInMajor) {
    updates.push({
      type: 'minor',
      title: 'Minor Version Update Available',
      description: `Version ${highestMinorInMajor.versionString} is available and may feature improvements and changes, but should not be significantly different.`,
      icon: Info,
      version: highestMinorInMajor.versionString
    })
  }
  
  // Check for patch update (same major and minor, higher patch)
  if (highestPatchInMinor) {
    updates.push({
      type: 'patch',
      title: 'Incremental Update Available',
      description: `Version ${highestPatchInMinor.versionString} is available with minor edits.`,
      icon: Info,
      version: highestPatchInMinor.versionString
    })
  }
  
  return updates
})

// Backward compatibility - get the most significant update type
const versionUpdateType = computed(() => {
  const updates = availableUpdates.value
  if (updates.length === 0) return null
  return updates[0].type
})

const updateMessage = computed(() => {
  const updates = availableUpdates.value
  if (updates.length === 0) return null
  return updates[0]
})

// Fetch latest version on mount
onMounted(() => {
  fetchLatestVersion()
})

// Re-fetch when route changes
watch(() => route.query.version, () => {
  fetchLatestVersion()
})

// Reset version state when navigating to a different page
watch(() => route.path, () => {
  currentPageVersion.value = null
  latestVersion.value = null
  allVersions.value = []
  isValidVersion.value = true
  fetchLatestVersion()
})

const navigationGroups = [
  {
    label: 'Library',
    icon: Library,
    items: [
      { title: 'Lessons', path: '/lessons' },
      { title: 'Lectures', path: '/lectures' },
      { title: 'Tutorials', path: '/tutorials' },
      { title: 'Articles', path: '/articles' },
      { title: 'Resources', path: '/resources' },
    ]
  },
  {
    label: 'Curriculum',
    icon: Compass,
    items: [
      { title: 'Pathways', path: '/pathways' },
      { title: 'Specializations', path: '/specializations' },
      { title: 'Books', path: '/books' },
    ]
  },
  {
    label: 'Assessments',
    icon: ClipboardCheck,
    items: [
      { title: 'Exercises', path: '/exercises' },
      { title: 'Projects', path: '/projects' },
    ]
  },
  {
    label: 'Tools',
    icon: Wrench,
    items: [
      { title: 'Outline Builder', path: '/tools/outline-builder' },
      { title: 'Guides', path: '/tools/guides' },
    ]
  }
]

const breadcrumbs = computed(() => {
  const path = route.path
  const segments = path.split('/').filter(Boolean)
  
  if (segments.length === 0) {
    return [{ label: 'Home', path: '/' }]
  }
  
  const crumbs = [{ label: 'Home', path: '/' }]
  
  segments.forEach((segment, index) => {
    const path = '/' + segments.slice(0, index + 1).join('/')
    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
    crumbs.push({ label, path })
  })
  
  return crumbs
})

const isActive = (path: string) => {
  return route.path === path || route.path.startsWith(path + '/')
}

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

// Close mobile menu when route changes
watch(() => route.path, () => {
  closeMobileMenu()
})

// Close mobile menu on escape key
const handleEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isMobile.value && isMobileMenuOpen.value) {
    closeMobileMenu()
  }
}

// Handle click outside sidebar on mobile
const handleClickOutside = (e: MouseEvent) => {
  if (!isMobile.value || !isMobileMenuOpen.value) return
  if (sidebarRef.value && !sidebarRef.value.contains(e.target as Node)) {
    closeMobileMenu()
  }
}

// Prevent body scroll when mobile menu is open
watch(isMobileMenuOpen, (isOpen) => {
  if (isMobile.value) {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }
})

// Close mobile menu when switching to desktop
watch(isMobile, (mobile, wasMobile) => {
  if (wasMobile && !mobile) {
    isMobileMenuOpen.value = false
    document.body.style.overflow = ''
  }
})

onMounted(() => {
  // Ensure mobile menu is closed on initial load
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
</script>

<template>
  <div class="flex min-h-screen bg-background">
    <!-- Skip Links for Accessibility -->
    <div class="sr-only focus-within:not-sr-only">
      <div class="fixed top-2 left-2 z-[100] flex gap-2 bg-background/95 backdrop-blur-sm border rounded-2xl p-2 shadow-lg">
        <Button
          asChild
          size="sm"
          class="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <a href="#main-content">
            Skip to main content
          </a>
        </Button>
        <Button
          @click="openCommandPalette"
          size="sm"
          class="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Open search ({{ isMac ? '⌘' : 'Ctrl' }}+K)
        </Button>
      </div>
    </div>

    <!-- Mobile backdrop overlay -->
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
        // Mobile styles: fixed overlay (default hidden)
        'fixed inset-y-0 left-0 z-50 w-64 border-r shadow-lg -translate-x-full',
        // Desktop styles: fixed positioning, always visible, full viewport height
        'md:fixed md:inset-y-0 md:left-0 md:translate-x-0 md:shadow-none md:z-30',
        // Mobile open state
        isMobile && isMobileMenuOpen && 'translate-x-0',
        // Desktop collapsed state
        !isMobile && (isDesktopCollapsed ? 'md:w-0 md:border-r-0' : 'md:w-64')
      ]"
    >
      <div :class="['flex flex-col h-full', !isMobile && isDesktopCollapsed && 'invisible']">
        <!-- Header -->
        <div class="flex h-14 items-center justify-between px-4 border-b md:justify-center md:border-b-0 shrink-0">
          <NuxtLink 
            to="/" 
            class="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            OER Platform
          </NuxtLink>
          <!-- Mobile close button -->
          <Button
            v-if="isMobile"
            variant="ghost"
            size="icon"
            @click="closeMobileMenu"
            class="h-8 w-8 md:hidden"
          >
            <X class="h-5 w-5" />
            <span class="sr-only">Close menu</span>
          </Button>
        </div>

        <!-- Content -->
        <nav class="flex-1 overflow-y-auto overflow-x-hidden py-2 px-3 min-h-0">
          <div v-for="group in navigationGroups" :key="group.label" class="mb-6">
            <h3 class="mb-2 px-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 flex items-center gap-2">
              <component :is="group.icon" class="h-3.5 w-3.5" />
              {{ group.label }}
            </h3>
            <div class="space-y-1">
              <NuxtLink
                v-for="item in group.items"
                :key="item.path"
                :to="item.path"
                :class="[
                  'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive(item.path)
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                ]"
              >
                {{ item.title }}
              </NuxtLink>
            </div>
          </div>
        </nav>

        <!-- Footer with Keyboard Shortcut -->
        <SidebarFooter class="shrink-0 border-t">
          <button
            @click="openCommandPalette"
            class="w-full flex items-center justify-between gap-2 px-2 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors group"
            aria-label="Open command palette"
          >
            <Search class="h-4 w-4" />
            <div class="flex items-center gap-1 text-xs">
              <kbd class="pointer-events-none select-none rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground group-hover:border-foreground/20">
                {{ isMac ? '⌘' : 'Ctrl' }}
              </kbd>
              <span class="text-muted-foreground">+</span>
              <kbd class="pointer-events-none select-none rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground group-hover:border-foreground/20">
                K
              </kbd>
            </div>
          </button>
        </SidebarFooter>
      </div>
    </aside>

    <!-- Main content -->
    <div :class="[
      'flex-1 overflow-auto flex flex-col',
      // Add left margin on desktop when sidebar is visible
      !isMobile && !isDesktopCollapsed && 'md:ml-64'
    ]">
      <header class="sticky top-0 z-10 shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div class="flex h-14 items-center gap-2 px-4">
          <Button
            variant="ghost"
            size="icon"
            @click="toggleSidebar"
            class="h-7 w-7 shrink-0"
          >
            <Menu class="h-4 w-4 md:hidden" />
            <PanelLeft class="h-4 w-4 hidden md:block" />
            <span class="sr-only">Toggle sidebar</span>
          </Button>
          
          <div class="h-4 w-px bg-border mx-2 shrink-0" />
          
          <!-- Breadcrumbs and version badge with horizontal scroll -->
          <div class="flex-1 min-w-0 overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            <div class="flex items-center gap-3 whitespace-nowrap">
              <Breadcrumb>
                <BreadcrumbItem v-for="(crumb, index) in breadcrumbs" :key="index">
                  <BreadcrumbLink v-if="index < breadcrumbs.length - 1" as-child>
                    <NuxtLink :to="crumb.path" class="flex items-center" :aria-label="index === 0 ? 'Home' : crumb.label" :title="index === 0 ? 'Home' : crumb.label">
                      <Icon v-if="index === 0" name="mdi:home" class="h-6 w-6" aria-hidden="true" />
                      <span v-else>{{ crumb.label }}</span>
                    </NuxtLink>
                  </BreadcrumbLink>
                  <BreadcrumbPage v-else class="flex items-center" :aria-label="index === 0 ? 'Home' : crumb.label">
                    <Icon v-if="index === 0" name="mdi:home" class="h-6 w-6" aria-hidden="true" />
                    <span v-else>{{ crumb.label }}</span>
                  </BreadcrumbPage>
                  <BreadcrumbSeparator v-if="index < breadcrumbs.length - 1">
                    <ChevronRight class="h-4 w-4" />
                  </BreadcrumbSeparator>
                </BreadcrumbItem>
              </Breadcrumb>
              
              <!-- Version badge -->
              <TooltipProvider v-if="isContentDetailPage && route.query.version" :delay-duration="300">
                <Tooltip>
                  <TooltipTrigger as-child>
                    <a 
                      :href="route.path"
                      :class="[
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all duration-200 cursor-pointer group',
                        !isValidVersion 
                          ? 'bg-warning/10 border border-warning text-warning hover:bg-warning/20 focus-visible:ring-warning' 
                          : 'bg-background border border-border text-foreground hover:bg-muted focus-visible:ring-ring'
                      ]"
                      :aria-label="`Remove version ${route.query.version} filter and return to latest version`"
                      role="button"
                    >
                      <AlertCircle v-if="!isValidVersion" class="w-3 h-3 transition-transform duration-200" aria-hidden="true" />
                      <span>Version {{ route.query.version }}</span>
                      <X class="w-0 h-3 opacity-0 group-hover:w-3 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200" aria-hidden="true" />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Remove
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </header>
      <main id="main-content" class="flex-1">
        <slot />
      </main>
      
      <!-- Version indicator badge with popover -->
      <div 
        class="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 flex justify-end"
      >
        <Popover v-if="isContentDetailPage && route.query.version">
          <PopoverTrigger
            :class="[
              'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all duration-200 cursor-pointer',
              !isValidVersion
                ? 'bg-warning/10 border border-warning text-warning hover:bg-warning/20 focus-visible:ring-warning'
                : 'bg-background border border-border text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring'
            ]"
            :aria-label="`View version ${route.query.version} information`"
          >
            <AlertCircle v-if="!isValidVersion" class="w-3 h-3 mr-1.5" aria-hidden="true" />
            Version {{ route.query.version }}
          </PopoverTrigger>
          <PopoverContent side="top" align="end" class="w-80">
            <div class="space-y-3">
              <!-- Show error if version doesn't exist -->
              <div v-if="!isValidVersion" class="flex items-start gap-3">
                <div class="mt-0.5 rounded-full bg-warning/10 p-2">
                  <AlertCircle class="h-4 w-4 text-warning" />
                </div>
                <div class="flex-1 space-y-2">
                  <div>
                    <h4 class="font-semibold text-sm text-foreground mb-1">Version Not Found</h4>
                    <p class="text-xs text-muted-foreground">
                      Version {{ route.query.version }} does not exist. Showing the latest version instead.
                    </p>
                  </div>
                  <a
                    :href="route.path"
                    class="inline-flex items-center text-xs font-medium text-primary hover:underline"
                  >
                    View Latest Version ({{ latestVersion }})
                  </a>
                </div>
              </div>
              
              <!-- Normal archived version view -->
              <template v-else>
                <div>
                  <h4 class="font-semibold text-sm text-foreground mb-1">Viewing Archived Version</h4>
                  <p class="text-xs text-muted-foreground">
                    You are currently viewing version {{ route.query.version }} of this content.
                  </p>
                </div>
                
                <!-- Show all available updates -->
                <div v-if="availableUpdates.length > 0" class="space-y-2">
                  <div 
                    v-for="update in availableUpdates" 
                    :key="update.type"
                    class="p-3 rounded-md bg-muted/50 border border-border"
                  >
                    <div class="flex items-start gap-2">
                      <component :is="update.icon" class="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                      <div class="flex-1">
                        <h5 class="font-medium text-xs text-foreground mb-1">{{ update.title }}</h5>
                        <p class="text-xs text-muted-foreground leading-relaxed">
                          <a 
                            :href="`${route.path}?version=${update.version}`"
                            class="font-medium text-primary hover:underline"
                          >
                            Version {{ update.version }}
                          </a>
                          {{ update.description.replace(/^Version \d+\.\d+\.\d+ /, '') }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              
                <div v-else-if="latestVersion" class="text-xs text-muted-foreground">
                  This is the latest version ({{ latestVersion }}).
                </div>
              </template>
            </div>
          </PopoverContent>
        </Popover>
        
        <!-- Latest version badge with popover -->
        <Popover v-else-if="isContentDetailPage && currentPageVersion">
          <PopoverTrigger as-child>
            <button 
              class="inline-flex items-center rounded-full bg-background border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer"
              :aria-label="`Current version ${currentPageVersion}. Click for details.`"
            >
              Version {{ currentPageVersion }}
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" :side-offset="8" class="w-80">
            <div class="space-y-3">
              <div class="flex items-start gap-3">
                <div class="mt-0.5 rounded-full bg-primary/10 p-2">
                  <Info class="h-4 w-4 text-primary" />
                </div>
                <div class="flex-1 space-y-1">
                  <p class="text-sm font-medium leading-none">Viewing Latest Version</p>
                  <p class="text-sm text-muted-foreground">
                    No updates are available for this content.
                  </p>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      <Footer />
    </div>
  </div>
</template>
