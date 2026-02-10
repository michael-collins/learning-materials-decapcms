<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Search, FileText, Presentation, BookOpen, Dumbbell, FolderKanban, Newspaper, GraduationCap, Route, Sparkles, Settings, Download, HelpCircle } from 'lucide-vue-next'
import { useCommandPalette } from '~/composables/useCommandPalette'
import { cn } from '~/lib/utils'

interface SearchIndexItem {
  id: string
  title: string
  type: string
  description: string
  searchText?: string
  tags?: string[]
  difficulty?: string
  published?: boolean
  versionStatus?: string
}

interface Command {
  id: string
  title: string
  description?: string
  category: 'navigation' | 'content' | 'tools'
  icon: any
  action: () => void
  keywords?: string[]
}

interface ContentItem extends SearchIndexItem {
  score?: number
}

const router = useRouter()
const { isOpen, close } = useCommandPalette()
const query = ref('')
const selectedIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)
const resultsRef = ref<HTMLElement | null>(null)
const searchIndex = ref<SearchIndexItem[]>([])
const isLoading = ref(false)

// Icon mapping for content types
const contentTypeIcons: Record<string, any> = {
  lessons: BookOpen,
  lectures: Presentation,
  tutorials: FileText,
  exercises: Dumbbell,
  projects: FolderKanban,
  articles: Newspaper,
  pathways: Route,
  specializations: GraduationCap,
}

// Load search index on mount
onMounted(async () => {
  try {
    isLoading.value = true
    const response = await fetch('/semantic-search-index.json')
    if (response.ok) {
      const data = await response.json()
      searchIndex.value = data.content || []
    }
  } catch (error) {
    console.error('Failed to load search index:', error)
  } finally {
    isLoading.value = false
  }
})

// Static commands
const staticCommands = computed<Command[]>(() => [
  {
    id: 'home',
    title: 'Go to Home',
    description: 'Return to the homepage',
    category: 'navigation',
    icon: Search,
    action: () => {
      router.push('/')
      close()
    },
    keywords: ['home', 'main', 'start']
  },
  {
    id: 'lessons',
    title: 'Browse All Lessons',
    description: 'View all available lessons',
    category: 'navigation',
    icon: BookOpen,
    action: () => {
      router.push('/lessons')
      close()
    },
    keywords: ['lessons', 'browse', 'list']
  },
  {
    id: 'exercises',
    title: 'Browse All Exercises',
    description: 'View all practice exercises',
    category: 'navigation',
    icon: Dumbbell,
    action: () => {
      router.push('/exercises')
      close()
    },
    keywords: ['exercises', 'practice', 'hands-on']
  },
  {
    id: 'projects',
    title: 'Browse All Projects',
    description: 'View all project assignments',
    category: 'navigation',
    icon: FolderKanban,
    action: () => {
      router.push('/projects')
      close()
    },
    keywords: ['projects', 'assignments']
  },
  {
    id: 'pathways',
    title: 'Browse Learning Pathways',
    description: 'Explore learning paths',
    category: 'navigation',
    icon: Route,
    action: () => {
      router.push('/pathways')
      close()
    },
    keywords: ['pathways', 'paths', 'tracks', 'career']
  },
  {
    id: 'specializations',
    title: 'Browse Specializations',
    description: 'View all specializations',
    category: 'navigation',
    icon: GraduationCap,
    action: () => {
      router.push('/specializations')
      close()
    },
    keywords: ['specializations', 'courses']
  }
])

// Fuzzy search helper
function fuzzyMatch(text: string, search: string): number {
  const textLower = text.toLowerCase()
  const searchLower = search.toLowerCase()
  
  // Exact match gets highest score
  if (textLower === searchLower) return 100
  if (textLower.includes(searchLower)) return 50
  
  // Fuzzy matching
  let score = 0
  let searchIndex = 0
  let lastMatchIndex = -1
  
  for (let i = 0; i < textLower.length && searchIndex < searchLower.length; i++) {
    if (textLower[i] === searchLower[searchIndex]) {
      score += 1
      // Bonus for consecutive matches
      if (lastMatchIndex === i - 1) {
        score += 5
      }
      lastMatchIndex = i
      searchIndex++
    }
  }
  
  // Return 0 if not all search characters were matched
  if (searchIndex < searchLower.length) return 0
  
  // Bonus for matches at word boundaries
  const words = textLower.split(/\s+/)
  for (const word of words) {
    if (word.startsWith(searchLower)) {
      score += 20
      break
    }
  }
  
  return score
}

// Filter and score content
const filteredContent = computed<ContentItem[]>(() => {
  if (!query.value.trim()) return []
  
  const searchTerm = query.value.trim()
  const results: ContentItem[] = []
  
  for (const item of searchIndex.value) {
    // Skip unpublished content
    if (item.published === false) continue
    // Prefer latest versions
    if (item.versionStatus && item.versionStatus !== 'latest') continue
    
    let score = 0
    
    // Score title
    const titleScore = fuzzyMatch(item.title, searchTerm)
    score += titleScore * 3
    
    // Score description
    if (item.description) {
      const descScore = fuzzyMatch(item.description, searchTerm)
      score += descScore
    }
    
    // Score tags
    if (item.tags) {
      for (const tag of item.tags) {
        const tagScore = fuzzyMatch(tag, searchTerm)
        score += tagScore * 2
      }
    }
    
    // Score type
    const typeScore = fuzzyMatch(item.type, searchTerm)
    score += typeScore * 1.5
    
    if (score > 0) {
      results.push({ ...item, score })
    }
  }
  
  // Sort by score descending
  results.sort((a, b) => (b.score || 0) - (a.score || 0))
  
  // Limit to top 50 results
  return results.slice(0, 50)
})

// Filter static commands
const filteredCommands = computed<Command[]>(() => {
  if (!query.value.trim()) return staticCommands.value
  
  const searchTerm = query.value.toLowerCase()
  return staticCommands.value.filter(cmd => {
    const titleMatch = cmd.title.toLowerCase().includes(searchTerm)
    const descMatch = cmd.description?.toLowerCase().includes(searchTerm)
    const keywordMatch = cmd.keywords?.some(kw => kw.includes(searchTerm))
    return titleMatch || descMatch || keywordMatch
  })
})

// Group filtered results
const groupedResults = computed(() => {
  const groups: Array<{ title: string; items: (Command | ContentItem)[] }> = []
  
  // Commands group (only if we have a query or showing all)
  if (filteredCommands.value.length > 0) {
    groups.push({
      title: 'Commands',
      items: filteredCommands.value.slice(0, 5)
    })
  }
  
  // Content groups by type
  if (filteredContent.value.length > 0) {
    const contentByType: Record<string, ContentItem[]> = {}
    
    for (const item of filteredContent.value) {
      if (!contentByType[item.type]) {
        contentByType[item.type] = []
      }
      contentByType[item.type]!.push(item)
    }
    
    // Add groups in a specific order
    const typeOrder = ['lessons', 'pathways', 'specializations', 'tutorials', 'exercises', 'projects', 'lectures', 'articles']
    for (const type of typeOrder) {
      if (contentByType[type] && contentByType[type].length > 0) {
        groups.push({
          title: type.charAt(0).toUpperCase() + type.slice(1),
          items: contentByType[type].slice(0, 8)
        })
      }
    }
  }
  
  return groups
})

// Flatten all items for keyboard navigation
const allItems = computed(() => {
  return groupedResults.value.flatMap(group => group.items)
})

// Reset selection when results change
watch([query, allItems], () => {
  selectedIndex.value = 0
  
  // Scroll to top of results
  if (resultsRef.value) {
    resultsRef.value.scrollTop = 0
  }
})

// Focus input when dialog opens
watch(isOpen, (open) => {
  if (open) {
    query.value = ''
    selectedIndex.value = 0
    // Focus after dialog animation
    setTimeout(() => {
      inputRef.value?.focus()
    }, 100)
  }
})

// Handle item selection
function selectItem(item: Command | ContentItem) {
  if ('action' in item) {
    // It's a command
    item.action()
  } else {
    // It's content
    router.push(item.id)
    close()
  }
}

// Keyboard navigation
function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, allItems.value.length - 1)
    scrollToSelected()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
    scrollToSelected()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const item = allItems.value[selectedIndex.value]
    if (item) {
      selectItem(item)
    }
  } else if (e.key === 'Escape') {
    close()
  }
}

// Scroll selected item into view
function scrollToSelected() {
  const container = resultsRef.value
  if (!container) return
  
  const selectedElement = container.querySelector(`[data-index="${selectedIndex.value}"]`)
  if (selectedElement) {
    selectedElement.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth'
    })
  }
}

// Check if item is a command
function isCommand(item: any): item is Command {
  return 'action' in item
}

// Get icon for item
function getIcon(item: Command | ContentItem) {
  if (isCommand(item)) {
    return item.icon
  }
  return contentTypeIcons[item.type] || FileText
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent 
      class="max-w-2xl p-0 gap-0 overflow-hidden"
      @open-auto-focus="(e) => e.preventDefault()"
    >
      <DialogTitle class="sr-only">Command Palette</DialogTitle>
      <DialogDescription class="sr-only">
        Search for content and navigate through the learning platform. Use arrow keys to navigate, Enter to select, and Escape to close.
      </DialogDescription>
      
      <!-- Search Input -->
      <div class="flex items-center border-b px-4 py-3">
        <Search class="h-4 w-4 text-muted-foreground shrink-0 mr-3" />
        <input
          ref="inputRef"
          v-model="query"
          type="text"
          placeholder="Search lessons, exercises, pathways... or type a command"
          class="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          @keydown="handleKeyDown"
          aria-label="Search command palette"
          role="combobox"
          aria-expanded="true"
          aria-controls="command-palette-results"
          :aria-activedescendant="allItems.length > 0 ? `command-item-${selectedIndex}` : undefined"
          autocomplete="off"
        />
        <kbd v-if="query.length === 0" class="hidden sm:inline-block pointer-events-none select-none rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          ESC
        </kbd>
      </div>

      <!-- Results -->
      <div
        ref="resultsRef"
        id="command-palette-results"
        role="listbox"
        class="max-h-[60vh] overflow-y-auto overscroll-contain"
        :aria-label="`${allItems.length} results`"
      >
        <div v-if="isLoading" class="px-4 py-8 text-center text-sm text-muted-foreground">
          Loading search index...
        </div>
        
        <div v-else-if="query && allItems.length === 0" class="px-4 py-8 text-center text-sm text-muted-foreground">
          No results found for "{{ query }}"
        </div>
        
        <div v-else-if="!query && allItems.length === 0" class="px-4 py-8 text-center text-sm text-muted-foreground">
          <p class="mb-2">Start typing to search...</p>
          <p class="text-xs">Try searching for lessons, exercises, or commands like "pathways"</p>
        </div>

        <!-- Results by group -->
        <div v-for="(group, groupIndex) in groupedResults" :key="group.title" class="py-2">
          <div class="px-4 py-1.5 text-xs font-medium text-muted-foreground">
            {{ group.title }}
          </div>
          
          <button
            v-for="(item, itemIndex) in group.items"
            :key="isCommand(item) ? item.id : item.id"
            :data-index="groupedResults.slice(0, groupIndex).reduce((sum, g) => sum + g.items.length, 0) + itemIndex"
            :id="`command-item-${groupedResults.slice(0, groupIndex).reduce((sum, g) => sum + g.items.length, 0) + itemIndex}`"
            role="option"
            :aria-selected="selectedIndex === groupedResults.slice(0, groupIndex).reduce((sum, g) => sum + g.items.length, 0) + itemIndex"
            :class="cn(
              'w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors',
              'hover:bg-accent focus-visible:bg-accent focus-visible:outline-none',
              selectedIndex === groupedResults.slice(0, groupIndex).reduce((sum, g) => sum + g.items.length, 0) + itemIndex && 'bg-accent'
            )"
            @click="selectItem(item)"
            @mouseenter="selectedIndex = groupedResults.slice(0, groupIndex).reduce((sum, g) => sum + g.items.length, 0) + itemIndex"
          >
            <component
              :is="getIcon(item)"
              class="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground"
            />
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">
                {{ isCommand(item) ? item.title : item.title }}
              </div>
              <div v-if="isCommand(item) ? item.description : item.description" class="text-xs text-muted-foreground truncate mt-0.5">
                {{ isCommand(item) ? item.description : item.description }}
              </div>
              <div v-if="!isCommand(item) && item.tags && item.tags.length > 0" class="flex flex-wrap gap-1 mt-1">
                <span
                  v-for="tag in item.tags.slice(0, 3)"
                  :key="tag"
                  class="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
            <div v-if="!isCommand(item) && item.difficulty" class="shrink-0 text-xs text-muted-foreground capitalize">
              {{ item.difficulty }}
            </div>
          </button>
        </div>
      </div>

      <!-- Footer hint -->
      <div class="border-t px-4 py-2 text-[10px] text-muted-foreground flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="hidden sm:inline-flex items-center gap-1">
            <kbd class="pointer-events-none select-none rounded border bg-muted px-1.5 py-0.5 font-medium">↑↓</kbd>
            Navigate
          </span>
          <span class="hidden sm:inline-flex items-center gap-1">
            <kbd class="pointer-events-none select-none rounded border bg-muted px-1.5 py-0.5 font-medium">Enter</kbd>
            Select
          </span>
        </div>
        <span class="text-[10px]">
          {{ allItems.length }} result{{ allItems.length !== 1 ? 's' : '' }}
        </span>
      </div>
    </DialogContent>
  </Dialog>
</template>
