<script setup lang="ts">
import { ChevronRight, ChevronDown, FileText, FolderOpen } from 'lucide-vue-next'
import type { SidebarNode } from '~/composables/useBookOutline'

interface Props {
  nodes: SidebarNode[]
  bookSlug: string
  toggledSections: Set<string>
  depth?: number
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0
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
</script>

<template>
  <ul :class="['space-y-0.5', depth > 0 && 'ml-3 pl-3 border-l border-border/40']" role="list">
    <li v-for="node in nodes" :key="node.fullPath">
      <!-- Section heading (has children, no content) -->
      <div v-if="node.isSection">
        <button
          @click="emit('toggle', node)"
          :class="[
            'w-full flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
            'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            node.isActive && 'bg-accent text-accent-foreground'
          ]"
          :aria-expanded="isExpanded(node)"
        >
          <component
            :is="isExpanded(node) ? ChevronDown : ChevronRight"
            class="h-3.5 w-3.5 shrink-0 text-muted-foreground/60"
          />
          <FolderOpen v-if="isExpanded(node)" class="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
          <span class="truncate">{{ node.title }}</span>
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
        <div class="flex items-center">
          <!-- Expand toggle (if has children too) -->
          <button
            v-if="node.children.length"
            @click="emit('toggle', node)"
            class="p-1 rounded hover:bg-accent/50 transition-colors shrink-0"
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
              'flex-1 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors',
              node.isActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              !node.children.length && 'ml-0'
            ]"
          >
            <FileText class="h-3.5 w-3.5 shrink-0 opacity-60" />
            <span class="truncate">{{ node.title }}</span>
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
      <div v-else class="px-2 py-1.5 text-sm text-muted-foreground/50 italic truncate">
        {{ node.title }}
      </div>
    </li>
  </ul>
</template>
