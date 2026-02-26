<script setup lang="ts">
/**
 * MediaBrowser — Reusable media browser with grid/list views.
 *
 * Used both as a standalone page component and as a picker
 * that can be embedded in image/file fields.
 *
 * Features:
 * - Grid (thumbnails) and list views
 * - File type filtering (images, documents, 3D, video, all)
 * - Search by filename
 * - Drag-and-drop upload
 * - Delete with confirmation
 * - Copy URL to clipboard
 * - Select mode for field integration
 */
import {
  Grid3x3, List, Search, Upload, Trash2, Copy, Check,
  Image as ImageIcon, File, FileText, Box, Film, Music,
  FolderOpen, RefreshCw, X,
} from 'lucide-vue-next'

interface MediaFile {
  name: string
  path: string
  size: number
  type: string
  ext: string
  modified: string
  contentType: string
}

const props = withDefaults(defineProps<{
  /** When true, acts as a picker — clicking a file emits 'select' */
  selectMode?: boolean
  /** Filter to only show these file types */
  allowedTypes?: string[]
}>(), {
  selectMode: false,
  allowedTypes: () => [],
})

const emit = defineEmits<{
  select: [file: MediaFile]
}>()

// ─── State ─────────────────────────────────────────────────
const viewMode = ref<'grid' | 'list'>('grid')
const typeFilter = ref('all')
const searchQuery = ref('')
const files = ref<MediaFile[]>([])
const folders = ref<string[]>([])
const loading = ref(false)
const error = ref('')
const currentFolder = ref('uploads')

// Upload state
const uploading = ref(false)
const uploadProgress = ref('')
const isDragOver = ref(false)

// Delete state
const deleteTarget = ref<MediaFile | null>(null)
const deleting = ref(false)

// Clipboard feedback
const copiedPath = ref('')

// ─── Computed ──────────────────────────────────────────────
const typeOptions = computed(() => {
  const base = [
    { value: 'all', label: 'All Files' },
    { value: 'image', label: 'Images' },
    { value: 'document', label: 'Documents' },
    { value: '3d', label: '3D Models' },
    { value: 'video', label: 'Video' },
    { value: 'audio', label: 'Audio' },
  ]
  if (props.allowedTypes.length > 0) {
    return base.filter((o) => o.value === 'all' || props.allowedTypes.includes(o.value))
  }
  return base
})

const filteredFiles = computed(() => {
  // Already filtered by API, but re-filter if allowedTypes is set
  if (props.allowedTypes.length > 0) {
    return files.value.filter((f) => props.allowedTypes.includes(f.type))
  }
  return files.value
})

// ─── Fetch files ───────────────────────────────────────────
async function fetchFiles() {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({
      folder: currentFolder.value,
      type: typeFilter.value,
    })
    if (searchQuery.value) {
      params.set('search', searchQuery.value)
    }
    const res = await $fetch<{ files: MediaFile[]; folders: string[] }>(`/api/cms/media/list?${params}`)
    files.value = res.files
    folders.value = res.folders || []
  } catch (err: any) {
    error.value = err.data?.message || err.message || 'Failed to load media'
  } finally {
    loading.value = false
  }
}

// Debounced search
let searchTimeout: ReturnType<typeof setTimeout>
watch(searchQuery, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(fetchFiles, 300)
})

watch(typeFilter, fetchFiles)

// Initial load
onMounted(fetchFiles)

// ─── Upload ────────────────────────────────────────────────
async function handleUpload(fileList: FileList | null) {
  if (!fileList || fileList.length === 0) return

  uploading.value = true
  uploadProgress.value = `Uploading ${fileList.length} file(s)...`

  let successCount = 0
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i]
    uploadProgress.value = `Uploading ${i + 1}/${fileList.length}: ${file.name}`

    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', currentFolder.value)

    try {
      await $fetch('/api/cms/media/upload', { method: 'POST', body: formData })
      successCount++
    } catch (err: any) {
      console.error(`Failed to upload ${file.name}:`, err)
    }
  }

  uploadProgress.value = `Uploaded ${successCount}/${fileList.length} files`
  uploading.value = false

  // Refresh list
  await fetchFiles()

  setTimeout(() => { uploadProgress.value = '' }, 3000)
}

function handleFileInput(e: Event) {
  const input = e.target as HTMLInputElement
  handleUpload(input.files)
  input.value = '' // reset
}

function handleDrop(e: DragEvent) {
  isDragOver.value = false
  handleUpload(e.dataTransfer?.files || null)
}

// ─── Delete ────────────────────────────────────────────────
async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await $fetch('/api/cms/media/delete', {
      method: 'POST',
      body: { path: deleteTarget.value.path },
    })
    deleteTarget.value = null
    await fetchFiles()
  } catch (err: any) {
    error.value = err.data?.message || 'Failed to delete file'
  } finally {
    deleting.value = false
  }
}

// ─── Clipboard ─────────────────────────────────────────────
async function copyPath(file: MediaFile) {
  try {
    await navigator.clipboard.writeText(file.path)
    copiedPath.value = file.path
    setTimeout(() => { copiedPath.value = '' }, 2000)
  } catch {
    // Fallback
    copiedPath.value = ''
  }
}

// ─── Helpers ───────────────────────────────────────────────
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function getFileIcon(type: string) {
  switch (type) {
    case 'image': return ImageIcon
    case 'document': return FileText
    case '3d': return Box
    case 'video': return Film
    case 'audio': return Music
    default: return File
  }
}

function handleFileClick(file: MediaFile) {
  if (props.selectMode) {
    emit('select', file)
  }
}

function navigateToFolder(folder: string) {
  currentFolder.value = `uploads/${folder}`
  fetchFiles()
}

function navigateUp() {
  const parts = currentFolder.value.split('/')
  if (parts.length > 1) {
    parts.pop()
    currentFolder.value = parts.join('/')
    fetchFiles()
  }
}
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-2 border-b p-3">
      <!-- Search -->
      <div class="relative flex-1 min-w-48">
        <Search class="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search files..."
          class="w-full rounded-md border bg-transparent py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <!-- Type filter -->
      <select
        v-model="typeFilter"
        class="rounded-md border bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>

      <!-- View toggles -->
      <div class="flex items-center gap-0.5 rounded-md bg-muted p-0.5">
        <button
          type="button"
          @click="viewMode = 'grid'"
          :class="['rounded p-1.5', viewMode === 'grid' ? 'bg-background shadow-sm' : 'text-muted-foreground']"
          title="Grid view"
        >
          <Grid3x3 class="h-4 w-4" />
        </button>
        <button
          type="button"
          @click="viewMode = 'list'"
          :class="['rounded p-1.5', viewMode === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground']"
          title="List view"
        >
          <List class="h-4 w-4" />
        </button>
      </div>

      <!-- Upload button -->
      <label class="cursor-pointer rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        <Upload class="mr-1 inline h-4 w-4" />
        Upload
        <input type="file" multiple class="hidden" @change="handleFileInput" />
      </label>

      <!-- Refresh -->
      <button
        type="button"
        @click="fetchFiles"
        class="rounded-md border p-1.5 text-muted-foreground hover:bg-accent"
        title="Refresh"
      >
        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
      </button>
    </div>

    <!-- Upload progress -->
    <div v-if="uploadProgress" class="border-b bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
      {{ uploadProgress }}
    </div>

    <!-- Error -->
    <div v-if="error" class="border-b bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
      {{ error }}
      <button @click="error = ''" class="ml-2 underline">Dismiss</button>
    </div>

    <!-- Drag-and-drop zone + file listing -->
    <div
      class="flex-1 overflow-auto p-3"
      @dragover.prevent="isDragOver = true"
      @dragleave="isDragOver = false"
      @drop.prevent="handleDrop"
      :class="{ 'ring-2 ring-inset ring-primary/50 bg-primary/5': isDragOver }"
    >
      <!-- Breadcrumb -->
      <div v-if="currentFolder !== 'uploads'" class="mb-3 flex items-center gap-1 text-sm text-muted-foreground">
        <button @click="currentFolder = 'uploads'; fetchFiles()" class="hover:text-foreground">uploads</button>
        <template v-for="(part, i) in currentFolder.split('/').slice(1)" :key="i">
          <span>/</span>
          <button
            @click="currentFolder = currentFolder.split('/').slice(0, i + 2).join('/'); fetchFiles()"
            class="hover:text-foreground"
          >{{ part }}</button>
        </template>
      </div>

      <!-- Loading -->
      <div v-if="loading && files.length === 0" class="flex items-center justify-center py-12 text-muted-foreground">
        <RefreshCw class="mr-2 h-5 w-5 animate-spin" /> Loading media...
      </div>

      <!-- Empty state -->
      <div v-else-if="!loading && filteredFiles.length === 0 && folders.length === 0" class="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <FolderOpen class="mb-3 h-12 w-12 opacity-40" />
        <p class="text-sm font-medium">No files found</p>
        <p class="mt-1 text-xs">
          {{ searchQuery ? 'Try a different search term' : 'Drop files here or click Upload to add media' }}
        </p>
      </div>

      <!-- Folders -->
      <div v-if="folders.length > 0" class="mb-4">
        <h4 class="mb-2 text-xs font-medium uppercase text-muted-foreground">Folders</h4>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="folder in folders"
            :key="folder"
            @click="navigateToFolder(folder)"
            class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
          >
            <FolderOpen class="h-4 w-4 text-amber-500" />
            {{ folder }}
          </button>
        </div>
      </div>

      <!-- Grid view -->
      <div v-if="viewMode === 'grid' && filteredFiles.length > 0" class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <div
          v-for="file in filteredFiles"
          :key="file.path"
          @click="handleFileClick(file)"
          :class="[
            'group relative overflow-hidden rounded-lg border transition-all hover:border-primary/50 hover:shadow-md',
            selectMode ? 'cursor-pointer' : '',
          ]"
        >
          <!-- Thumbnail / Icon -->
          <div class="flex aspect-square items-center justify-center bg-muted/30">
            <img
              v-if="file.type === 'image'"
              :src="file.path"
              :alt="file.name"
              class="h-full w-full object-cover"
              loading="lazy"
            />
            <component
              v-else
              :is="getFileIcon(file.type)"
              class="h-12 w-12 text-muted-foreground/30"
            />
          </div>

          <!-- Info -->
          <div class="p-2">
            <p class="truncate text-xs font-medium" :title="file.name">{{ file.name }}</p>
            <p class="text-xs text-muted-foreground">{{ formatSize(file.size) }}</p>
          </div>

          <!-- Hover actions -->
          <div class="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              @click.stop="copyPath(file)"
              class="rounded bg-background/90 p-1 text-muted-foreground shadow hover:text-foreground"
              title="Copy path"
            >
              <Check v-if="copiedPath === file.path" class="h-3.5 w-3.5 text-green-500" />
              <Copy v-else class="h-3.5 w-3.5" />
            </button>
            <button
              v-if="!selectMode"
              type="button"
              @click.stop="deleteTarget = file"
              class="rounded bg-background/90 p-1 text-muted-foreground shadow hover:text-red-500"
              title="Delete"
            >
              <Trash2 class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <!-- List view -->
      <div v-if="viewMode === 'list' && filteredFiles.length > 0" class="divide-y rounded-md border">
        <div
          v-for="file in filteredFiles"
          :key="file.path"
          @click="handleFileClick(file)"
          :class="[
            'group flex items-center gap-3 px-3 py-2 transition-colors hover:bg-accent/50',
            selectMode ? 'cursor-pointer' : '',
          ]"
        >
          <!-- Icon/thumbnail -->
          <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-muted/50">
            <img
              v-if="file.type === 'image'"
              :src="file.path"
              :alt="file.name"
              class="h-full w-full object-cover"
              loading="lazy"
            />
            <component v-else :is="getFileIcon(file.type)" class="h-5 w-5 text-muted-foreground/50" />
          </div>

          <!-- Info -->
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">{{ file.name }}</p>
            <p class="text-xs text-muted-foreground">
              {{ formatSize(file.size) }} · {{ formatDate(file.modified) }} · {{ file.ext }}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100">
            <button
              type="button"
              @click.stop="copyPath(file)"
              class="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Copy path"
            >
              <Check v-if="copiedPath === file.path" class="h-4 w-4 text-green-500" />
              <Copy v-else class="h-4 w-4" />
            </button>
            <button
              v-if="!selectMode"
              type="button"
              @click.stop="deleteTarget = file"
              class="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-red-500"
              title="Delete"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- File count -->
    <div class="border-t px-3 py-2 text-xs text-muted-foreground">
      {{ filteredFiles.length }} file{{ filteredFiles.length !== 1 ? 's' : '' }}
      <template v-if="searchQuery"> matching "{{ searchQuery }}"</template>
    </div>

    <!-- Delete confirmation modal -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="deleteTarget = null" />
        <div class="relative z-10 mx-4 w-full max-w-sm rounded-lg border bg-background p-6 shadow-xl">
          <h3 class="mb-2 text-lg font-semibold">Delete File</h3>
          <p class="mb-1 text-sm text-muted-foreground">
            Are you sure you want to delete this file?
          </p>
          <p class="mb-4 truncate rounded bg-muted px-2 py-1 font-mono text-xs">
            {{ deleteTarget.name }}
          </p>
          <div class="flex justify-end gap-2">
            <button
              type="button"
              @click="deleteTarget = null"
              class="rounded-md border px-4 py-2 text-sm hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="confirmDelete"
              :disabled="deleting"
              class="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
            >
              {{ deleting ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
