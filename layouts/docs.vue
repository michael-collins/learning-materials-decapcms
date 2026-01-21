<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { BookOpen, GraduationCap, PanelLeft, ChevronRight, Menu, X, ClipboardCheck, Compass, Library } from 'lucide-vue-next'
import { useWindowSize } from '@vueuse/core'
import Button from '~/components/ui/button/Button.vue'
import Breadcrumb from '~/components/ui/breadcrumb/Breadcrumb.vue'
import BreadcrumbItem from '~/components/ui/breadcrumb/BreadcrumbItem.vue'
import BreadcrumbLink from '~/components/ui/breadcrumb/BreadcrumbLink.vue'
import BreadcrumbSeparator from '~/components/ui/breadcrumb/BreadcrumbSeparator.vue'
import BreadcrumbPage from '~/components/ui/breadcrumb/BreadcrumbPage.vue'

const route = useRoute()
const { width } = useWindowSize()
const isMobileMenuOpen = ref(false)
const sidebarRef = ref<HTMLElement | null>(null)

// Determine if we're on mobile (< 768px)
const isMobile = computed(() => width.value < 768)

// Desktop sidebar collapsed state (ignored on mobile)
const isDesktopCollapsed = ref(false)

const navigationGroups = [
  {
    label: 'Assessments',
    icon: ClipboardCheck,
    items: [
      { title: 'Exercises', path: '/exercises' },
      { title: 'Projects', path: '/projects' },
    ]
  },
  {
    label: 'Curriculum',
    icon: Compass,
    items: [
      { title: 'Pathways', path: '/pathways' },
      { title: 'Specializations', path: '/specializations' },
    ]
  },
  {
    label: 'Library',
    icon: Library,
    items: [
      { title: 'Lectures', path: '/lectures' },
      { title: 'Tutorials', path: '/tutorials' },
      { title: 'Articles', path: '/articles' },
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
  if (isMobile.value) {
    isMobileMenuOpen.value = false
  }
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
        'bg-card transition-all duration-200 ease-in-out flex-shrink-0',
        // Mobile styles: fixed overlay
        'md:border-r md:relative',
        isMobile ? [
          'fixed inset-y-0 left-0 z-50 w-64 border-r shadow-lg',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        ] : [
          // Desktop styles: inline with push
          'relative',
          isDesktopCollapsed ? 'w-0 border-r-0' : 'w-64'
        ]
      ]"
    >
      <div :class="['h-full flex flex-col', !isMobile && isDesktopCollapsed && 'invisible']">
        <!-- Header -->
        <div class="flex h-14 items-center justify-between px-4 border-b md:justify-center md:border-b-0">
          <NuxtLink 
            to="/" 
            class="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            Learning Materials
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
        <nav class="flex-1 overflow-auto py-2 px-3">
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
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex-1 overflow-auto flex flex-col">
      <header class="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
        <Button
          variant="ghost"
          size="icon"
          @click="toggleSidebar"
          class="h-7 w-7"
        >
          <Menu v-if="isMobile" class="h-4 w-4" />
          <PanelLeft v-else class="h-4 w-4" />
          <span class="sr-only">{{ isMobile ? 'Open menu' : 'Toggle sidebar' }}</span>
        </Button>
        
        <div class="h-4 w-px bg-border mx-2" />
        
        <Breadcrumb>
          <BreadcrumbItem v-for="(crumb, index) in breadcrumbs" :key="index">
            <BreadcrumbLink v-if="index < breadcrumbs.length - 1" as-child>
              <NuxtLink :to="crumb.path" class="flex items-center">
                <Icon v-if="index === 0" name="mdi:home" class="h-6 w-6" />
                <span v-else>{{ crumb.label }}</span>
              </NuxtLink>
            </BreadcrumbLink>
            <BreadcrumbPage v-else class="flex items-center">
              <Icon v-if="index === 0" name="mdi:home" class="h-6 w-6" />
              <span v-else>{{ crumb.label }}</span>
            </BreadcrumbPage>
            <BreadcrumbSeparator v-if="index < breadcrumbs.length - 1">
              <ChevronRight class="h-4 w-4" />
            </BreadcrumbSeparator>
          </BreadcrumbItem>
        </Breadcrumb>
      </header>
      <main class="flex-1">
        <slot />
      </main>
      <Footer />
    </div>
  </div>
</template>
