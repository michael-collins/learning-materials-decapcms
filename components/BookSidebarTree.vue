<script setup lang="ts">
import { ChevronRight, ChevronDown, FileText, FolderOpen, BookOpen, Presentation, Dumbbell, FolderKanban, Newspaper, GraduationCap, Route, Lightbulb, Clapperboard, type LucideIcon } from 'lucide-vue-next'
import * as LucideIcons from 'lucide-vue-next'
import type { SidebarNode } from '~/composables/useBookOutline'

interface Props {
  nodes: SidebarNode[]
  bookSlug: string
  toggledSections: Set<string>
  depth?: number
  uppercaseTopLevel?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0,
  uppercaseTopLevel: false,
})

const emit = defineEmits<{
  toggle: [node: SidebarNode]
}>()

function isExpanded(node: SidebarNode): boolean {
  if (props.toggledSections.has(node.fullPath)) {
    return !node.isExpanded
  }
  return node.isExpanded
}

/** Map content collection prefix to a unique icon */
const contentTypeIcons: Record<string, LucideIcon> = {
  lessons: BookOpen,
  lectures: Presentation,
  tutorials: Lightbulb,
  exercises: Dumbbell,
  projects: FolderKanban,
  articles: Newspaper,
  pathways: Route,
  specializations: GraduationCap,
  videos: Clapperboard,
}

function getContentIcon(content?: string): LucideIcon {
  if (!content) return FileText
  const collection = content.split('/')[0]
  return (collection && contentTypeIcons[collection]) || FileText
}

/** Resolve a custom Lucide icon component by PascalCase name, falling back to content-type icon */
function getNodeIcon(node: SidebarNode): LucideIcon {
  if (node.icon) {
    const comp = (LucideIcons as any)[node.icon] || (LucideIcons as any)[`Lucide${node.icon}`] || null
    if (comp) return comp
  }
  return getContentIcon(node.content)
}
</script>

<template>
  <ul :class="['space-y-0.5', depth > 0 && 'ml-3 pl-3 border-l border-border/40']" role="list">
    <li v-for="(node, idx) in nodes" :key="node.fullPath" :class="[depth === 0 && idx > 0 && 'mt-4 pt-3 border-t border-border/30']">
      <!-- Section heading (has children, no content) -->
      <div v-if="node.isSection">
        <button
          @click="emit('toggle', node)"
          :class="[
            'w-full flex items-start gap-1.5 rounded-md px-2 py-1 text-[13px] leading-snug font-medium transition-colors',
            'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            node.isActive && 'bg-accent text-accent-foreground'
          ]"
          :aria-expanded="isExpanded(node)"
        >
          <component
            :is="isExpanded(node) ? ChevronDown : ChevronRight"
            class="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground/60"
          />
          <component v-if="node.icon" :is="getNodeIcon(node)" class="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground/60" />
          <span :class="['break-words text-left min-w-0', uppercaseTopLevel && depth === 0 && 'uppercase tracking-wide']">{{ node.title }}</span>
        </button>

        <!-- Expanded children -->
        <div v-if="isExpanded(node) && node.children.length">
          <BookSidebarTree
            :nodes="node.children"
            :book-slug="bookSlug"
            :toggled-sections="toggledSections"
            :depth="depth + 1"
            @toggle="(n: SidebarNode) => emit('toggle', n)"
          />
        </div>
      </div>

      <!-- Navigable chapter (has content) with possible children -->
      <div v-else-if="node.content">
        <div class="flex items-start">
          <!-- Expand toggle (if has children too) -->
          <button
            v-if="node.children.length"
            @click="emit('toggle', node)"
            class="p-1 rounded hover:bg-accent/50 transition-colors shrink-0 mt-0.5"
            :aria-expanded="isExpanded(node)"
            :aria-label="`Toggle ${node.title} section`"
          >
            <component
              :is="isExpanded(node) ? ChevronDown : ChevronRight"
              class="h-3 w-3 text-muted-foreground/60"
            />
          </button>
          <NuxtLink
            :to="`/books/${bookSlug}/${node.fullPath}`"
            :class="[
              'flex-1 flex items-start gap-1.5 rounded-md px-2 py-1 text-[13px] leading-snug transition-colors min-w-0',
              node.isActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              !node.children.length && 'ml-0'
            ]"
          >
            <component :is="getNodeIcon(node)" class="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-60" />
            <span :class="['break-words text-left min-w-0', uppercaseTopLevel && depth === 0 && 'uppercase tracking-wide']">{{ node.title }}</span>
          </NuxtLink>
        </div>

        <!-- Children of a navigable node -->
        <div v-if="isExpanded(node) && node.children.length">
          <BookSidebarTree
            :nodes="node.children"
            :book-slug="bookSlug"
            :toggled-sections="toggledSections"
            :depth="depth + 1"
            @toggle="(n: SidebarNode) => emit('toggle', n)"
          />
        </div>
      </div>

      <!-- Non-navigable leaf (no content, no children — just a label) -->
      <div v-else class="px-2 py-1 text-[13px] leading-snug text-muted-foreground/50 italic break-words text-left min-w-0">
        {{ node.title }}
      </div>
    </li>
  </ul>
</template>
