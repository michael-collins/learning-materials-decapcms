<script setup lang="ts">
import { ref, computed } from 'vue'
import { BookOpen, GraduationCap, PanelLeft, ChevronRight } from 'lucide-vue-next'
import Button from '~/components/ui/button/Button.vue'
import Breadcrumb from '~/components/ui/breadcrumb/Breadcrumb.vue'
import BreadcrumbItem from '~/components/ui/breadcrumb/BreadcrumbItem.vue'
import BreadcrumbLink from '~/components/ui/breadcrumb/BreadcrumbLink.vue'
import BreadcrumbSeparator from '~/components/ui/breadcrumb/BreadcrumbSeparator.vue'
import BreadcrumbPage from '~/components/ui/breadcrumb/BreadcrumbPage.vue'

const route = useRoute()
const isCollapsed = ref(false)

const navigationGroups = [
  {
    label: 'Content',
    items: [
      { title: 'Articles', path: '/articles' },
      { title: 'Tutorials', path: '/tutorials' },
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
  isCollapsed.value = !isCollapsed.value
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-background">
    <!-- Sidebar -->
    <aside 
      :class="[
        'border-r bg-card transition-all duration-200 ease-in-out flex-shrink-0',
        isCollapsed ? 'w-0 border-r-0' : 'w-64'
      ]"
    >
      <div :class="['h-full flex flex-col', isCollapsed && 'invisible']">
        <!-- Header -->
        <div class="flex h-14 items-center justify-center px-4">
          <NuxtLink 
            to="/" 
            class="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            Learning Materials
          </NuxtLink>
        </div>

        <!-- Content -->
        <nav class="flex-1 overflow-auto py-2 px-3">
          <div v-for="group in navigationGroups" :key="group.label" class="space-y-1">
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
          <PanelLeft class="h-4 w-4" />
          <span class="sr-only">Toggle sidebar</span>
        </Button>
        
        <div class="h-4 w-px bg-border mx-2" />
        
        <Breadcrumb>
          <BreadcrumbItem v-for="(crumb, index) in breadcrumbs" :key="index">
            <BreadcrumbLink v-if="index < breadcrumbs.length - 1" as-child>
              <NuxtLink :to="crumb.path">{{ crumb.label }}</NuxtLink>
            </BreadcrumbLink>
            <BreadcrumbPage v-else>{{ crumb.label }}</BreadcrumbPage>
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
