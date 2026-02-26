<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  LayoutDashboard,
  FileText,
  GraduationCap,
  ClipboardCheck,
  FolderOpen,
  ChevronRight,
  LogOut,
  ExternalLink,
  PanelLeft,
  Menu,
  X,
  ImageIcon,
  FileEdit,
} from 'lucide-vue-next'
import { useWindowSize } from '@vueuse/core'

const route = useRoute()
const { user, logout, restoreSession, isAuthenticated, isLoading } = useCmsAuth()
const { groups, config, status: configStatus } = useCmsConfig()
const { width } = useWindowSize()

const isMobile = computed(() => width.value < 768)
const isSidebarOpen = ref(true)
const isMobileMenuOpen = ref(false)

// Auto-collapse sidebar on form pages (new/edit)
const isFormPage = computed(() => {
  const path = route.path
  return path.match(/\/cms\/[^/]+\/new$/) || path.match(/\/cms\/[^/]+\/edit\//)
})

// Restore session on mount
onMounted(async () => {
  await restoreSession()
})

// Close mobile menu on route change, auto-collapse sidebar on form pages
watch(() => route.path, () => {
  isMobileMenuOpen.value = false
  if (isFormPage.value) {
    isSidebarOpen.value = false
  }
}, { immediate: true })

// Map group labels to icons
const groupIcons: Record<string, any> = {
  'Content': FileText,
  'Curriculum': GraduationCap,
  'Assessment': ClipboardCheck,
  'Other': FolderOpen,
}

function getGroupIcon(label: string) {
  return groupIcons[label] || FolderOpen
}

function handleLogout() {
  logout()
  navigateTo('/cms/login')
}
</script>

<template>
  <div class="flex h-screen bg-background">
    <!-- Mobile Menu Toggle -->
    <button
      v-if="isMobile"
      class="fixed top-3 left-3 z-50 rounded-md border bg-background p-2 shadow-sm md:hidden"
      @click="isMobileMenuOpen = !isMobileMenuOpen"
    >
      <component :is="isMobileMenuOpen ? X : Menu" class="h-5 w-5" />
    </button>

    <!-- Sidebar Overlay (mobile) -->
    <Transition name="fade">
      <div
        v-if="isMobile && isMobileMenuOpen"
        class="fixed inset-0 z-40 bg-black/50"
        @click="isMobileMenuOpen = false"
      />
    </Transition>

    <!-- Sidebar -->
    <aside
      :class="[
        'flex h-full flex-col border-r bg-card transition-all duration-200',
        isMobile
          ? 'fixed inset-y-0 left-0 z-40 w-64 transform ' + (isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full')
          : isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
      ]"
    >
      <!-- Sidebar Header -->
      <div class="flex items-center gap-2 border-b p-4">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <LayoutDashboard class="h-4 w-4" />
        </div>
        <div class="flex-1">
          <h2 class="text-sm font-semibold">Content CMS</h2>
          <p class="text-xs text-muted-foreground">{{ config?.backend?.repo?.split('/')[1] || 'Loading...' }}</p>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-auto p-3">
        <!-- Dashboard -->
        <NuxtLink
          to="/cms"
          :class="[
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            route.path === '/cms' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
          ]"
        >
          <LayoutDashboard class="h-4 w-4" />
          Dashboard
        </NuxtLink>

        <!-- Media Manager -->
        <NuxtLink
          to="/cms/media"
          :class="[
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            route.path === '/cms/media' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
          ]"
        >
          <ImageIcon class="h-4 w-4" />
          Media
        </NuxtLink>

        <!-- Drafts -->
        <NuxtLink
          to="/cms/drafts"
          :class="[
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            route.path === '/cms/drafts' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
          ]"
        >
          <FileEdit class="h-4 w-4" />
          Drafts
        </NuxtLink>

        <!-- Collection Groups -->
        <div v-if="configStatus === 'success'" class="mt-4 flex flex-col gap-4">
          <div v-for="group in groups" :key="group.label">
            <div class="flex items-center gap-2 px-3 py-1.5">
              <component :is="getGroupIcon(group.label)" class="h-3.5 w-3.5 text-muted-foreground" />
              <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {{ group.label }}
              </span>
            </div>
            <ul class="flex flex-col gap-0.5">
              <li v-for="col in group.collections" :key="col.name">
                <NuxtLink
                  :to="`/cms/${col.name}`"
                  :class="[
                    'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    route.path.startsWith(`/cms/${col.name}`) ? 'bg-accent text-accent-foreground font-medium' : 'text-foreground/80'
                  ]"
                >
                  <ChevronRight class="h-3.5 w-3.5 text-muted-foreground/50" />
                  {{ col.label }}
                </NuxtLink>
              </li>
            </ul>
          </div>
        </div>

        <!-- Loading skeleton -->
        <div v-else-if="configStatus === 'pending'" class="mt-4 space-y-3 px-3">
          <div v-for="i in 4" :key="i" class="h-6 animate-pulse rounded bg-muted" />
        </div>
      </nav>

      <!-- Sidebar Footer -->
      <div class="border-t p-3">
        <!-- User Info & Logout -->
        <div v-if="isAuthenticated" class="mt-2 flex items-center gap-2 rounded-md px-3 py-1.5">
          <img
            :src="user?.avatarUrl"
            :alt="user?.name"
            class="h-6 w-6 rounded-full"
          />
          <span class="flex-1 truncate text-xs font-medium">{{ user?.name }}</span>
          <button
            class="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Log out"
            @click="handleLogout"
          >
            <LogOut class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- Top Bar -->
      <header class="flex h-12 items-center gap-3 border-b px-4">
        <button
          v-if="!isMobile"
          class="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent"
          @click="isSidebarOpen = !isSidebarOpen"
        >
          <PanelLeft class="h-4 w-4" />
        </button>

        <!-- Breadcrumbs will be injected by child pages -->
        <div id="cms-breadcrumbs" class="flex-1" />

        <!-- Status indicators -->
        <div class="flex items-center gap-2 text-xs text-muted-foreground">
          <span v-if="config?.publishMode === 'editorial_workflow'" class="rounded bg-blue-500/10 px-2 py-0.5 text-blue-600 dark:text-blue-400">
            Editorial
          </span>
          <span class="rounded bg-muted px-2 py-0.5">
            {{ config?.backend?.branch || 'main' }}
          </span>
        </div>
      </header>

      <!-- Page Content -->
      <main class="flex-1 overflow-auto">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
