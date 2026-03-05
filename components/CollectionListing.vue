<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import Input from '~/components/ui/input/Input.vue'
import Table from '~/components/ui/table/Table.vue'
import TableHeader from '~/components/ui/table/TableHeader.vue'
import TableBody from '~/components/ui/table/TableBody.vue'
import TableRow from '~/components/ui/table/TableRow.vue'
import TableHead from '~/components/ui/table/TableHead.vue'
import TableCell from '~/components/ui/table/TableCell.vue'
import Pagination from '~/components/ui/pagination/Pagination.vue'
import {
  Search, ChevronRight, X, SlidersHorizontal,
  ArrowUpDown, ArrowUp, ArrowDown,
  Layers, List, ChevronDown, ChevronUp, Columns2
} from 'lucide-vue-next'

interface CollectionItem {
  title: string
  description?: string
  date: string
  authors?: { name: string; url?: string }[]
  author?: string
  authorUrl?: string
  difficulty?: string
  course?: string
  image?: string
  imageAlt?: string
  tags?: string[]
  _path?: string
  path?: string
  slug?: string
  previewable?: boolean
}

function resolveAuthorLabel(item: CollectionItem): string {
  if (item.authors && item.authors.length > 0) return item.authors.map(a => a.name).join(', ')
  return item.author ?? ''
}

interface Props {
  title?: string
  description?: string
  items: CollectionItem[]
  itemsPerPage?: number
  loading?: boolean
  selectable?: boolean
  storageKey?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Items',
  itemsPerPage: 10,
  loading: false,
  selectable: false,
})

const emit = defineEmits<{ (e: 'select', item: CollectionItem): void }>()
const selectable = computed(() => props.selectable)

const sk = props.storageKey || `collection-filters-${props.title.toLowerCase().replace(/\s+/g, '-')}`

// ── Persisted state ──────────────────────────────────────────────────────────
const searchQuery        = useLocalStorage(`${sk}:search`, '')
const selectedAuthor     = useLocalStorage(`${sk}:author`, '')
const selectedDifficulty = useLocalStorage(`${sk}:difficulty`, '')
const selectedCourse     = useLocalStorage(`${sk}:course`, '')
const selectedTags       = useLocalStorage<string[]>(`${sk}:tags`, [])

type SortField  = 'title' | 'author' | 'difficulty' | 'date'
type SortDir    = 'asc' | 'desc'
type GroupField = '' | 'course' | 'author' | 'difficulty' | 'tag'

const sortField = useLocalStorage<SortField>(`${sk}:sortField`, 'title')
const sortDir   = useLocalStorage<SortDir>(`${sk}:sortDir`, 'asc')
const groupBy   = useLocalStorage<GroupField>(`${sk}:groupBy`, '')

// ── Template refs ───────────────────────────────────────────────────────────
const containerEl = ref<HTMLElement | null>(null)
const isMounted = ref(false)
onMounted(() => { isMounted.value = true })

function scrollToContainer() {
  nextTick(() => {
    containerEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function scrollToGroup(key: string) {
  nextTick(() => {
    const el = containerEl.value?.querySelector<HTMLElement>(`[data-group-key="${key}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

// ── Transient state ──────────────────────────────────────────────────────────
const currentPage    = ref(1)
const groupPages     = ref<Map<string, number>>(new Map())
const collapsedGroups = ref<Set<string>>(new Set())

// ── Path helpers ─────────────────────────────────────────────────────────────
const getItemPath = (item: CollectionItem) =>
  item._path || item.path || `/articles/${item.slug}` || '#'

// ── Filter option lists ──────────────────────────────────────────────────────
const authors = computed(() => {
  const set = new Set<string>()
  props.items.forEach(item => { const l = resolveAuthorLabel(item); if (l) set.add(l) })
  return Array.from(set).sort()
})

const difficultyOrder = ['Beginner', 'Intermediate', 'Advanced']
const difficulties = computed(() => {
  const set = new Set<string>()
  props.items.forEach(item => { if (item.difficulty) set.add(item.difficulty) })
  return Array.from(set).sort((a, b) => {
    const ai = difficultyOrder.indexOf(a), bi = difficultyOrder.indexOf(b)
    if (ai !== -1 && bi !== -1) return ai - bi
    return ai !== -1 ? -1 : bi !== -1 ? 1 : a.localeCompare(b)
  })
})

const courses = computed(() => {
  const set = new Set<string>()
  props.items.forEach(item => { if (item.course) set.add(item.course) })
  return Array.from(set).sort()
})

const allTags = computed(() => {
  const set = new Set<string>()
  props.items.forEach(item => item.tags?.forEach(t => set.add(t)))
  return Array.from(set).sort()
})

const hasAnyAuthor     = computed(() => props.items.some(i => (i.authors && i.authors.length > 0) || i.author))
const hasAnyImage      = computed(() => props.items.some(i => i.image))
const hasAnyDifficulty = computed(() => props.items.some(i => i.difficulty))
const hasAnyTags       = computed(() => props.items.some(i => i.tags && i.tags.length > 0))
const hasAnyCourse     = computed(() => props.items.some(i => i.course))
const hasAnyDate       = computed(() => props.items.some(i => i.date))

// ── Column management ────────────────────────────────────────────────────────
type ColumnKey = 'image' | 'title' | 'tags' | 'difficulty' | 'author' | 'course' | 'date'

const defaultColumns: ColumnKey[] = ['image', 'title', 'tags', 'difficulty']
const visibleColumns = useLocalStorage<ColumnKey[]>(`${sk}:columns`, defaultColumns)
const showColumnPicker = ref(false)

interface ColumnDef {
  key: ColumnKey
  label: string
  required?: boolean
  hasData: () => boolean
  defaultOn: boolean
}

const columnDefs: ColumnDef[] = [
  { key: 'image',      label: 'Image',      hasData: () => hasAnyImage.value,      defaultOn: true  },
  { key: 'title',      label: 'Title',      hasData: () => true,                   defaultOn: true,  required: true },
  { key: 'tags',       label: 'Tags',       hasData: () => hasAnyTags.value,       defaultOn: true  },
  { key: 'difficulty', label: 'Difficulty', hasData: () => hasAnyDifficulty.value, defaultOn: true  },
  { key: 'author',     label: 'Author',     hasData: () => hasAnyAuthor.value,     defaultOn: false },
  { key: 'course',     label: 'Course',     hasData: () => hasAnyCourse.value,     defaultOn: false },
  { key: 'date',       label: 'Date',       hasData: () => hasAnyDate.value,       defaultOn: false },
]

const availableColumns = computed(() => columnDefs.filter(c => c.hasData()))

function showCol(key: ColumnKey): boolean {
  return visibleColumns.value.includes(key)
}

function toggleColumn(key: ColumnKey) {
  if (key === 'title') return
  if (visibleColumns.value.includes(key)) {
    visibleColumns.value = visibleColumns.value.filter(k => k !== key)
  } else {
    visibleColumns.value = [...visibleColumns.value, key]
  }
}

const groupByOptions = computed(() => {
  const opts: { value: GroupField; label: string }[] = []
  if (courses.value.length > 1)      opts.push({ value: 'course',     label: 'Course' })
  if (authors.value.length > 1)      opts.push({ value: 'author',     label: 'Author' })
  if (difficulties.value.length > 1) opts.push({ value: 'difficulty', label: 'Difficulty' })
  if (allTags.value.length > 0)      opts.push({ value: 'tag',        label: 'Tag' })
  return opts
})

// ── Sort helper ──────────────────────────────────────────────────────────────
function toggleSort(field: SortField) {
  if (sortField.value === field) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortField.value = field; sortDir.value = 'asc' }
}

function sortItems(items: CollectionItem[]): CollectionItem[] {
  return [...items].sort((a, b) => {
    let cmp = 0
    if      (sortField.value === 'title')      cmp = a.title.localeCompare(b.title)
    else if (sortField.value === 'author')     cmp = resolveAuthorLabel(a).localeCompare(resolveAuthorLabel(b))
    else if (sortField.value === 'date')       cmp = new Date(a.date).getTime() - new Date(b.date).getTime()
    else if (sortField.value === 'difficulty') {
      const ai = difficultyOrder.indexOf(a.difficulty ?? ''), bi = difficultyOrder.indexOf(b.difficulty ?? '')
      if (ai !== -1 && bi !== -1) cmp = ai - bi
      else cmp = ai !== -1 ? -1 : bi !== -1 ? 1 : (a.difficulty ?? '').localeCompare(b.difficulty ?? '')
    }
    return sortDir.value === 'asc' ? cmp : -cmp
  })
}

// ── Filtering + sorting ──────────────────────────────────────────────────────
const filteredItems = computed(() => {
  let f = props.items

  if (selectedAuthor.value)     f = f.filter(i => resolveAuthorLabel(i) === selectedAuthor.value)
  if (selectedDifficulty.value) f = f.filter(i => i.difficulty === selectedDifficulty.value)
  if (selectedCourse.value)     f = f.filter(i => i.course === selectedCourse.value)
  if (selectedTags.value.length > 0)
    f = f.filter(i => selectedTags.value.some(t => i.tags?.includes(t)))
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    f = f.filter(i =>
      i.title.toLowerCase().includes(q) ||
      i.description?.toLowerCase().includes(q) ||
      resolveAuthorLabel(i).toLowerCase().includes(q) ||
      i.tags?.some(t => t.toLowerCase().includes(q))
    )
  }

  return sortItems(f)
})

// ── Groups ───────────────────────────────────────────────────────────────────
interface Group { key: string; label: string; items: CollectionItem[] }

const groups = computed<Group[]>(() => {
  if (!groupBy.value) return []
  const field = groupBy.value
  const map = new Map<string, CollectionItem[]>()

  filteredItems.value.forEach(item => {
    let keys: string[]
    if      (field === 'tag')        keys = item.tags?.length ? item.tags : ['(No tag)']
    else if (field === 'author')     keys = [resolveAuthorLabel(item) || '(No author)']
    else if (field === 'course')     keys = [item.course || '(No course)']
    else if (field === 'difficulty') keys = [item.difficulty || '(No difficulty)']
    else keys = ['Other']

    keys.forEach(k => {
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(item)
    })
  })

  const entries = Array.from(map.entries())
  if (field === 'difficulty') {
    entries.sort(([a], [b]) => {
      const ai = difficultyOrder.indexOf(a), bi = difficultyOrder.indexOf(b)
      if (ai !== -1 && bi !== -1) return ai - bi
      return ai !== -1 ? -1 : bi !== -1 ? 1 : a.localeCompare(b)
    })
  } else {
    entries.sort(([a], [b]) => a === '(No tag)' || a.startsWith('(') ? 1 : b.startsWith('(') ? -1 : a.localeCompare(b))
  }

  return entries.map(([key, items]) => ({ key, label: key, items }))
})

// ── Group pagination helpers ─────────────────────────────────────────────────
function getGroupPage(key: string)        { return groupPages.value.get(key) ?? 1 }
function getGroupTotalPages(items: CollectionItem[]) { return Math.ceil(items.length / props.itemsPerPage) }

function setGroupPage(key: string, page: number) {
  const next = new Map(groupPages.value); next.set(key, page); groupPages.value = next
  scrollToGroup(key)
}

function getPaginatedGroupItems(key: string, items: CollectionItem[]) {
  const start = (getGroupPage(key) - 1) * props.itemsPerPage
  return items.slice(start, start + props.itemsPerPage)
}

function toggleGroup(key: string) {
  const next = new Set(collapsedGroups.value)
  next.has(key) ? next.delete(key) : next.add(key)
  collapsedGroups.value = next
}

// ── Flat pagination ──────────────────────────────────────────────────────────
const totalPages    = computed(() => Math.ceil(filteredItems.value.length / props.itemsPerPage))
const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * props.itemsPerPage
  return filteredItems.value.slice(start, start + props.itemsPerPage)
})

// ── Filter chips ─────────────────────────────────────────────────────────────
const activeFilters = computed(() => {
  const chips: { key: string; label: string; remove: () => void }[] = []
  if (selectedDifficulty.value) chips.push({ key: 'difficulty', label: selectedDifficulty.value, remove: () => { selectedDifficulty.value = '' } })
  if (selectedCourse.value)     chips.push({ key: 'course',     label: selectedCourse.value,     remove: () => { selectedCourse.value = '' } })
  if (selectedAuthor.value)     chips.push({ key: 'author',     label: selectedAuthor.value,     remove: () => { selectedAuthor.value = '' } })
  selectedTags.value.forEach(tag =>
    chips.push({ key: `tag:${tag}`, label: tag, remove: () => { selectedTags.value = selectedTags.value.filter(t => t !== tag) } })
  )
  return chips
})

const hasActiveFilters = computed(() => activeFilters.value.length > 0 || searchQuery.value !== '')

function clearAllFilters() {
  searchQuery.value = ''; selectedAuthor.value = ''; selectedDifficulty.value = ''
  selectedCourse.value = ''; selectedTags.value = []
}

function toggleTag(tag: string) {
  selectedTags.value = selectedTags.value.includes(tag)
    ? selectedTags.value.filter(t => t !== tag)
    : [...selectedTags.value, tag]
}

// ── Misc ─────────────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try { return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) }
  catch { return dateStr }
}

const canPreview = (item: CollectionItem) => props.selectable && item.previewable !== false
const handleSelect = (item: CollectionItem, event?: Event) => {
  if (!canPreview(item)) return
  event?.preventDefault()
  emit('select', item)
}
const updatePage = (page: number) => { currentPage.value = page; scrollToContainer() }

watch([searchQuery, selectedAuthor, selectedDifficulty, selectedCourse, selectedTags, sortField, sortDir], () => {
  currentPage.value = 1
})
watch([groupBy, searchQuery, selectedAuthor, selectedDifficulty, selectedCourse, selectedTags], () => {
  groupPages.value = new Map()
  collapsedGroups.value = new Set()
})
</script>

<template>
  <div ref="containerEl" class="container max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
    <!-- Page header -->
    <div class="mb-8">
      <h1 class="text-4xl font-bold tracking-tight mb-2">{{ title }}</h1>
      <p v-if="description" class="text-lg text-muted-foreground">{{ description }}</p>
    </div>

    <!-- Toolbar -->
    <div class="mb-6 space-y-3">
      <!-- Row 1: Search + filter dropdowns -->
      <div class="flex flex-wrap gap-3 items-center">
        <div class="relative flex-1 min-w-[200px] max-w-md">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input v-model="searchQuery" placeholder="Search..." class="pl-10" />
        </div>
        <select v-if="difficulties.length > 1" v-model="selectedDifficulty"
          class="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="">All Difficulties</option>
          <option v-for="d in difficulties" :key="d" :value="d">{{ d }}</option>
        </select>
        <select v-if="courses.length > 1" v-model="selectedCourse"
          class="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="">All Courses</option>
          <option v-for="c in courses" :key="c" :value="c">{{ c }}</option>
        </select>
        <select v-if="authors.length > 1" v-model="selectedAuthor"
          class="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="">All Authors</option>
          <option v-for="a in authors" :key="a" :value="a">{{ a }}</option>
        </select>
        <button v-if="hasActiveFilters" type="button"
          class="h-10 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
          @click="clearAllFilters">
          <X class="h-3.5 w-3.5" /> Clear all
        </button>
        <!-- Column picker -->
        <div class="relative">
          <button type="button"
            :class="['h-10 inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors',
              showColumnPicker ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40']"
            @click="showColumnPicker = !showColumnPicker">
            <Columns2 class="h-3.5 w-3.5" /> Columns
          </button>
          <div v-if="showColumnPicker"
            class="absolute right-0 top-11 z-50 min-w-[170px] rounded-md border border-border bg-popover shadow-lg p-1.5 space-y-0.5">
            <div class="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Show/hide columns</div>
            <label v-for="col in availableColumns" :key="col.key"
              :class="['flex items-center gap-2.5 rounded px-2 py-1.5 text-sm select-none',
                col.required ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-muted']">
              <input type="checkbox" :checked="showCol(col.key)" :disabled="col.required"
                class="accent-primary h-3.5 w-3.5" @change="toggleColumn(col.key)" />
              {{ col.label }}
            </label>
          </div>
          <!-- backdrop to close -->
          <div v-if="showColumnPicker" class="fixed inset-0 z-40" @click="showColumnPicker = false" />
        </div>
      </div>

      <!-- Row 2: Tag chips -->
      <div v-if="allTags.length > 0" class="flex flex-wrap gap-2 items-center">
        <span class="text-xs text-muted-foreground font-medium uppercase tracking-wide mr-1">Tags:</span>
        <button v-for="tag in allTags" :key="tag" type="button"
          :class="['inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer',
            selectedTags.includes(tag)
              ? 'bg-primary border-primary text-primary-foreground'
              : 'border-border bg-muted text-muted-foreground hover:border-primary/50 hover:text-foreground']"
          @click="toggleTag(tag)">
          {{ tag }}
        </button>
      </div>

      <!-- Row 3: Group-by + active filter chips -->
      <div class="flex flex-wrap items-center gap-3">
        <div v-if="groupByOptions.length > 0" class="flex items-center gap-2">
          <span class="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1">
            <Layers class="h-3.5 w-3.5" /> Group by:
          </span>
          <div class="flex gap-1 flex-wrap">
            <button type="button"
              :class="['inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                !isMounted || groupBy === ''
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'border-border bg-muted text-muted-foreground hover:border-primary/50 hover:text-foreground']"
              @click="groupBy = ''">
              <List class="h-3 w-3" /> None
            </button>
            <button v-for="opt in groupByOptions" :key="opt.value" type="button"
              :class="['inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                isMounted && groupBy === opt.value
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'border-border bg-muted text-muted-foreground hover:border-primary/50 hover:text-foreground']"
              @click="groupBy = opt.value">
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div v-if="activeFilters.length > 0" class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <SlidersHorizontal class="h-3 w-3" /> Filtered by:
          </span>
          <button v-for="chip in activeFilters" :key="chip.key" type="button"
            class="inline-flex items-center gap-1 rounded-full bg-accent border border-primary/20 px-2.5 py-0.5 text-xs font-medium text-accent-foreground hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive transition-colors"
            @click="chip.remove()">
            {{ chip.label }} <X class="h-3 w-3" />
          </button>
          <span class="text-xs text-muted-foreground">{{ filteredItems.length }} of {{ items.length }} results</span>
        </div>
      </div>
    </div>

    <ClientOnly>
      <template #fallback>
        <div class="rounded-lg border bg-card shadow-sm divide-y divide-border">
          <div v-for="n in 5" :key="n" class="flex items-center gap-4 px-4 py-4">
            <div class="h-4 bg-muted rounded animate-pulse w-1/2"></div>
            <div class="h-4 bg-muted rounded animate-pulse w-1/6"></div>
            <div class="h-4 bg-muted rounded animate-pulse w-1/6"></div>
          </div>
        </div>
      </template>

    <!-- Loading -->
    <div v-if="loading" class="rounded-lg border bg-card shadow-sm p-12 text-center">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      <p class="mt-4 text-sm text-muted-foreground">Loading...</p>
    </div>

    <template v-else-if="filteredItems.length === 0">
      <div class="rounded-lg border bg-card shadow-sm p-12 text-center">
        <p class="text-muted-foreground">No {{ title.toLowerCase() }} found.</p>
        <button v-if="hasActiveFilters" type="button" class="mt-3 text-sm text-primary hover:underline" @click="clearAllFilters">
          Clear filters
        </button>
      </div>
    </template>

    <!-- Grouped view -->
    <template v-else-if="groupBy">
      <div class="space-y-6">
        <div v-for="group in groups" :key="group.key" :data-group-key="group.key" class="rounded-lg border bg-card shadow-sm overflow-hidden">
          <button type="button"
            class="w-full flex items-center justify-between px-5 py-3.5 bg-muted/50 border-b border-border hover:bg-muted/80 transition-colors"
            @click="toggleGroup(group.key)">
            <div class="flex items-center gap-2.5">
              <span class="font-semibold text-sm">{{ group.label }}</span>
              <span class="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-2 py-px text-xs font-medium text-primary">
                {{ group.items.length }}
              </span>
            </div>
            <ChevronDown v-if="!collapsedGroups.has(group.key)" class="h-4 w-4 text-muted-foreground" />
            <ChevronUp v-else class="h-4 w-4 text-muted-foreground" />
          </button>

          <template v-if="!collapsedGroups.has(group.key)">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead v-if="showCol('image') && hasAnyImage" class="w-[160px]"></TableHead>
                  <TableHead class="w-[50%]">
                    <button type="button" class="inline-flex items-center gap-1 hover:text-foreground transition-colors" @click="toggleSort('title')">
                      Title
                      <ArrowUp v-if="sortField === 'title' && sortDir === 'asc'" class="h-3.5 w-3.5 text-primary" />
                      <ArrowDown v-else-if="sortField === 'title' && sortDir === 'desc'" class="h-3.5 w-3.5 text-primary" />
                      <ArrowUpDown v-else class="h-3.5 w-3.5 opacity-40" />
                    </button>
                  </TableHead>
                  <TableHead v-if="showCol('tags') && hasAnyTags">Tags</TableHead>
                  <TableHead v-if="showCol('author') && hasAnyAuthor">
                    <button type="button" class="inline-flex items-center gap-1 hover:text-foreground transition-colors" @click="toggleSort('author')">
                      Author
                      <ArrowUp v-if="sortField === 'author' && sortDir === 'asc'" class="h-3.5 w-3.5 text-primary" />
                      <ArrowDown v-else-if="sortField === 'author' && sortDir === 'desc'" class="h-3.5 w-3.5 text-primary" />
                      <ArrowUpDown v-else class="h-3.5 w-3.5 opacity-40" />
                    </button>
                  </TableHead>
                  <TableHead v-if="showCol('difficulty') && hasAnyDifficulty">
                    <button type="button" class="inline-flex items-center gap-1 hover:text-foreground transition-colors" @click="toggleSort('difficulty')">
                      Difficulty
                      <ArrowUp v-if="sortField === 'difficulty' && sortDir === 'asc'" class="h-3.5 w-3.5 text-primary" />
                      <ArrowDown v-else-if="sortField === 'difficulty' && sortDir === 'desc'" class="h-3.5 w-3.5 text-primary" />
                      <ArrowUpDown v-else class="h-3.5 w-3.5 opacity-40" />
                    </button>
                  </TableHead>
                  <TableHead v-if="showCol('course') && hasAnyCourse">Course</TableHead>
                  <TableHead v-if="showCol('date') && hasAnyDate">
                    <button type="button" class="inline-flex items-center gap-1 hover:text-foreground transition-colors" @click="toggleSort('date')">
                      Date
                      <ArrowUp v-if="sortField === 'date' && sortDir === 'asc'" class="h-3.5 w-3.5 text-primary" />
                      <ArrowDown v-else-if="sortField === 'date' && sortDir === 'desc'" class="h-3.5 w-3.5 text-primary" />
                      <ArrowUpDown v-else class="h-3.5 w-3.5 opacity-40" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="item in getPaginatedGroupItems(group.key, group.items)" :key="getItemPath(item)">
                  <TableCell v-if="showCol('image') && hasAnyImage" class="py-2">
                    <NuxtLink v-if="item.image" :to="getItemPath(item)" class="block">
                      <NuxtImg :src="item.image" :alt="item.imageAlt || item.title" width="128" height="64" fit="cover" class="rounded object-cover w-32 h-16" loading="lazy" />
                    </NuxtLink>
                  </TableCell>
                  <TableCell>
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <NuxtLink :to="getItemPath(item)" class="font-medium text-primary hover:underline inline-flex items-center gap-1 group" @click="handleSelect(item, $event)">
                          {{ item.title }}
                          <ChevronRight class="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </NuxtLink>
                        <p v-if="item.description" class="text-sm text-muted-foreground mt-1 line-clamp-2">{{ item.description }}</p>
                      </div>
                      <button v-if="canPreview(item)" type="button"
                        class="shrink-0 inline-flex items-center gap-1 rounded-md border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground hover:border-primary/40 hover:text-primary transition-colors"
                        @click="handleSelect(item, $event)">
                        <Icon name="mingcute:layout-11-line" class="w-4 h-4" /> Preview
                      </button>
                    </div>
                  </TableCell>
                  <TableCell v-if="showCol('tags') && hasAnyTags">
                    <div v-if="item.tags && item.tags.length > 0" class="flex flex-wrap gap-1">
                      <button v-for="tag in item.tags" :key="tag" type="button"
                        :class="['inline-flex items-center rounded-full border px-2 py-px text-[11px] font-medium transition-colors',
                          selectedTags.includes(tag) ? 'bg-primary border-primary text-primary-foreground' : 'border-border bg-muted/50 text-muted-foreground hover:border-primary/40 hover:text-primary']"
                        @click.prevent="toggleTag(tag)">
                        {{ tag }}
                      </button>
                    </div>
                    <span v-else class="text-sm text-muted-foreground">-</span>
                  </TableCell>
                  <TableCell v-if="showCol('author') && hasAnyAuthor">
                    <button v-if="resolveAuthorLabel(item)" type="button"
                      :class="['text-sm hover:text-primary transition-colors', selectedAuthor === resolveAuthorLabel(item) ? 'text-primary font-medium' : 'text-foreground']"
                      @click="selectedAuthor = selectedAuthor === resolveAuthorLabel(item) ? '' : resolveAuthorLabel(item)">
                      {{ resolveAuthorLabel(item) }}
                    </button>
                    <span v-else class="text-sm text-muted-foreground">-</span>
                  </TableCell>
                  <TableCell v-if="showCol('difficulty') && hasAnyDifficulty">
                    <button v-if="item.difficulty" type="button"
                      :class="['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-colors',
                        selectedDifficulty === item.difficulty ? 'bg-primary border-primary text-primary-foreground' : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20']"
                      @click="selectedDifficulty = selectedDifficulty === item.difficulty ? '' : item.difficulty">
                      {{ item.difficulty }}
                    </button>
                    <span v-else class="text-sm text-muted-foreground">-</span>
                  </TableCell>
                  <TableCell v-if="showCol('course') && hasAnyCourse">
                    <button v-if="item.course" type="button"
                      :class="['text-sm hover:text-primary transition-colors', selectedCourse === item.course ? 'text-primary font-medium' : 'text-foreground']"
                      @click="selectedCourse = selectedCourse === item.course ? '' : item.course">
                      {{ item.course }}
                    </button>
                    <span v-else class="text-sm text-muted-foreground">-</span>
                  </TableCell>
                  <TableCell v-if="showCol('date') && hasAnyDate">
                    <span class="text-sm text-muted-foreground">{{ item.date ? formatDate(item.date) : '-' }}</span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <!-- Per-group pagination -->
            <div v-if="getGroupTotalPages(group.items) > 1" class="px-5 py-3 border-t border-border flex items-center justify-between gap-4 bg-muted/20">
              <p class="text-xs text-muted-foreground">
                {{ (getGroupPage(group.key) - 1) * itemsPerPage + 1 }}–{{ Math.min(getGroupPage(group.key) * itemsPerPage, group.items.length) }}
                of {{ group.items.length }}
              </p>
              <Pagination
                :current-page="getGroupPage(group.key)"
                :total-pages="getGroupTotalPages(group.items)"
                @update:current-page="setGroupPage(group.key, $event)"
              />
            </div>
          </template>
        </div>
      </div>
    </template>

    <!-- Flat view -->
    <template v-else>
      <div class="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead v-if="showCol('image') && hasAnyImage" class="w-[160px]"></TableHead>
              <TableHead class="w-[50%]">
                <button type="button" class="inline-flex items-center gap-1 hover:text-foreground transition-colors" @click="toggleSort('title')">
                  Title
                  <ArrowUp v-if="sortField === 'title' && sortDir === 'asc'" class="h-3.5 w-3.5 text-primary" />
                  <ArrowDown v-else-if="sortField === 'title' && sortDir === 'desc'" class="h-3.5 w-3.5 text-primary" />
                  <ArrowUpDown v-else class="h-3.5 w-3.5 opacity-40" />
                </button>
              </TableHead>
              <TableHead v-if="showCol('tags') && hasAnyTags">Tags</TableHead>
              <TableHead v-if="showCol('author') && hasAnyAuthor">
                <button type="button" class="inline-flex items-center gap-1 hover:text-foreground transition-colors" @click="toggleSort('author')">
                  Author
                  <ArrowUp v-if="sortField === 'author' && sortDir === 'asc'" class="h-3.5 w-3.5 text-primary" />
                  <ArrowDown v-else-if="sortField === 'author' && sortDir === 'desc'" class="h-3.5 w-3.5 text-primary" />
                  <ArrowUpDown v-else class="h-3.5 w-3.5 opacity-40" />
                </button>
              </TableHead>
              <TableHead v-if="showCol('difficulty') && hasAnyDifficulty">
                <button type="button" class="inline-flex items-center gap-1 hover:text-foreground transition-colors" @click="toggleSort('difficulty')">
                  Difficulty
                  <ArrowUp v-if="sortField === 'difficulty' && sortDir === 'asc'" class="h-3.5 w-3.5 text-primary" />
                  <ArrowDown v-else-if="sortField === 'difficulty' && sortDir === 'desc'" class="h-3.5 w-3.5 text-primary" />
                  <ArrowUpDown v-else class="h-3.5 w-3.5 opacity-40" />
                </button>
              </TableHead>
              <TableHead v-if="showCol('course') && hasAnyCourse">Course</TableHead>
              <TableHead v-if="showCol('date') && hasAnyDate">
                <button type="button" class="inline-flex items-center gap-1 hover:text-foreground transition-colors" @click="toggleSort('date')">
                  Date
                  <ArrowUp v-if="sortField === 'date' && sortDir === 'asc'" class="h-3.5 w-3.5 text-primary" />
                  <ArrowDown v-else-if="sortField === 'date' && sortDir === 'desc'" class="h-3.5 w-3.5 text-primary" />
                  <ArrowUpDown v-else class="h-3.5 w-3.5 opacity-40" />
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="item in paginatedItems" :key="getItemPath(item)">
              <TableCell v-if="showCol('image') && hasAnyImage" class="py-2">
                <NuxtLink v-if="item.image" :to="getItemPath(item)" class="block">
                  <NuxtImg :src="item.image" :alt="item.imageAlt || item.title" width="128" height="64" fit="cover" class="rounded object-cover w-32 h-16" loading="lazy" />
                </NuxtLink>
              </TableCell>
              <TableCell>
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <NuxtLink :to="getItemPath(item)" class="font-medium text-primary hover:underline inline-flex items-center gap-1 group" @click="handleSelect(item, $event)">
                      {{ item.title }}
                      <ChevronRight class="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </NuxtLink>
                    <p v-if="item.description" class="text-sm text-muted-foreground mt-1 line-clamp-2">{{ item.description }}</p>
                  </div>
                  <button v-if="canPreview(item)" type="button"
                    class="shrink-0 inline-flex items-center gap-1 rounded-md border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground hover:border-primary/40 hover:text-primary transition-colors"
                    @click="handleSelect(item, $event)">
                    <Icon name="mingcute:layout-11-line" class="w-4 h-4" /> Preview
                  </button>
                </div>
              </TableCell>
              <TableCell v-if="showCol('tags') && hasAnyTags">
                <div v-if="item.tags && item.tags.length > 0" class="flex flex-wrap gap-1">
                  <button v-for="tag in item.tags" :key="tag" type="button"
                    :class="['inline-flex items-center rounded-full border px-2 py-px text-[11px] font-medium transition-colors',
                      selectedTags.includes(tag) ? 'bg-primary border-primary text-primary-foreground' : 'border-border bg-muted/50 text-muted-foreground hover:border-primary/40 hover:text-primary']"
                    @click.prevent="toggleTag(tag)">
                    {{ tag }}
                  </button>
                </div>
                <span v-else class="text-sm text-muted-foreground">-</span>
              </TableCell>
              <TableCell v-if="showCol('author') && hasAnyAuthor">
                <button v-if="resolveAuthorLabel(item)" type="button"
                  :class="['text-sm hover:text-primary transition-colors', selectedAuthor === resolveAuthorLabel(item) ? 'text-primary font-medium' : 'text-foreground']"
                  @click="selectedAuthor = selectedAuthor === resolveAuthorLabel(item) ? '' : resolveAuthorLabel(item)">
                  {{ resolveAuthorLabel(item) }}
                </button>
                <span v-else class="text-sm text-muted-foreground">-</span>
              </TableCell>
              <TableCell v-if="showCol('difficulty') && hasAnyDifficulty">
                <button v-if="item.difficulty" type="button"
                  :class="['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-colors',
                    selectedDifficulty === item.difficulty ? 'bg-primary border-primary text-primary-foreground' : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20']"
                  @click="selectedDifficulty = selectedDifficulty === item.difficulty ? '' : item.difficulty">
                  {{ item.difficulty }}
                </button>
                <span v-else class="text-sm text-muted-foreground">-</span>
              </TableCell>
              <TableCell v-if="showCol('course') && hasAnyCourse">
                <button v-if="item.course" type="button"
                  :class="['text-sm hover:text-primary transition-colors', selectedCourse === item.course ? 'text-primary font-medium' : 'text-foreground']"
                  @click="selectedCourse = selectedCourse === item.course ? '' : item.course">
                  {{ item.course }}
                </button>
                <span v-else class="text-sm text-muted-foreground">-</span>
              </TableCell>
              <TableCell v-if="showCol('date') && hasAnyDate">
                <span class="text-sm text-muted-foreground">{{ item.date ? formatDate(item.date) : '-' }}</span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div v-if="totalPages > 1" class="mt-8 flex flex-col items-center gap-4">
        <p class="text-sm text-muted-foreground">
          Showing <span class="font-medium">{{ (currentPage - 1) * itemsPerPage + 1 }}</span> to
          <span class="font-medium">{{ Math.min(currentPage * itemsPerPage, filteredItems.length) }}</span> of
          <span class="font-medium">{{ filteredItems.length }}</span> results
        </p>
        <Pagination :current-page="currentPage" :total-pages="totalPages" @update:current-page="updatePage" />
      </div>
    </template>

    </ClientOnly>
  </div>
</template>
