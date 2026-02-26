<script setup lang="ts">
/**
 * CmsFile — Generic file upload widget.
 *
 * Supports:
 * - File upload via the media upload API
 * - URL input as fallback
 * - Filename and file type display
 *
 * Stores the public path (e.g., "/uploads/document.pdf").
 */
import type { DecapField } from '~/lib/cms/config-types'
import { FileUp, Upload, X, Loader2, Link, File as FileIcon } from 'lucide-vue-next'

const props = defineProps<{
  field: DecapField
  modelValue: any
}>()

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

const filePath = computed({
  get: () => (typeof props.modelValue === 'string' ? props.modelValue : ''),
  set: (val) => emit('update:modelValue', val),
})

// ─── State ────────────────────────────────────────────────────
const uploading = ref(false)
const uploadError = ref('')
const showUrlInput = ref(false)
const urlInput = ref('')
const fileInput = ref<HTMLInputElement>()

const hasFile = computed(() => !!filePath.value)

/** Extract filename from path */
const fileName = computed(() => {
  if (!filePath.value) return ''
  return filePath.value.split('/').pop() || filePath.value
})

/** Get a file type icon/label from extension */
const fileExtension = computed(() => {
  const name = fileName.value
  const ext = name.split('.').pop()?.toLowerCase()
  return ext || 'file'
})

// ─── File upload ──────────────────────────────────────────────
function triggerFileInput() {
  fileInput.value?.click()
}

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploadError.value = ''
  uploading.value = true

  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', 'uploads')

    const response = await $fetch<{ path: string }>('/api/cms/media/upload', {
      method: 'POST',
      body: formData,
    })

    filePath.value = response.path
  } catch (e: any) {
    uploadError.value = e?.data?.message || e?.message || 'Upload failed'
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

// ─── URL input ────────────────────────────────────────────────
function applyUrl() {
  if (urlInput.value.trim()) {
    filePath.value = urlInput.value.trim()
  }
  showUrlInput.value = false
  urlInput.value = ''
}

function clearFile() {
  filePath.value = ''
  uploadError.value = ''
}

/** Handle drag-and-drop file */
function handleDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0]
  if (file && fileInput.value) {
    const dt = new DataTransfer()
    dt.items.add(file)
    fileInput.value.files = dt.files
    handleFileSelect({ target: fileInput.value } as any)
  }
}
</script>

<template>
  <div>
    <!-- Label -->
    <label class="mb-1.5 block text-sm font-medium">
      {{ field.label }}
      <span v-if="field.required !== false" class="text-destructive">*</span>
    </label>
    <p v-if="field.hint" class="mb-2 text-xs text-muted-foreground">{{ field.hint }}</p>

    <!-- File display (when file is set) -->
    <div v-if="hasFile" class="flex items-center gap-3 rounded-md border bg-card p-3">
      <FileIcon class="h-8 w-8 shrink-0 text-muted-foreground" />
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium truncate">{{ fileName }}</p>
        <p class="text-xs text-muted-foreground truncate">{{ filePath }}</p>
      </div>
      <button
        type="button"
        @click="clearFile"
        class="shrink-0 rounded p-1 text-destructive/60 hover:bg-destructive/10 hover:text-destructive"
        title="Remove file"
      >
        <X class="h-4 w-4" />
      </button>
    </div>

    <!-- Upload area (when no file) -->
    <div v-else>
      <div
        class="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-muted-foreground/25 p-4 transition-colors hover:border-muted-foreground/50 cursor-pointer"
        @click="triggerFileInput"
        @dragover.prevent
        @drop.prevent="handleDrop"
      >
        <div v-if="uploading" class="flex items-center gap-2">
          <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
          <span class="text-sm text-muted-foreground">Uploading...</span>
        </div>
        <template v-else>
          <FileUp class="h-6 w-6 text-muted-foreground/40" />
          <p class="text-sm text-muted-foreground">
            Click or drag to upload a file
          </p>
        </template>
      </div>

      <!-- Alternative: URL input -->
      <div class="mt-2 flex items-center gap-2">
        <button
          type="button"
          @click="showUrlInput = !showUrlInput"
          class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Link class="h-3 w-3" />
          {{ showUrlInput ? 'Cancel' : 'Or enter path/URL' }}
        </button>
      </div>

      <div v-if="showUrlInput" class="mt-2 flex gap-2">
        <input
          v-model="urlInput"
          type="text"
          placeholder="/uploads/document.pdf or https://..."
          class="flex-1 rounded-md border bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          @keydown.enter.prevent="applyUrl"
        />
        <button
          type="button"
          @click="applyUrl"
          class="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
        >
          Set
        </button>
      </div>
    </div>

    <!-- Upload error -->
    <p v-if="uploadError" class="mt-1 text-xs text-destructive">{{ uploadError }}</p>

    <!-- Hidden file input -->
    <input
      ref="fileInput"
      type="file"
      class="hidden"
      @change="handleFileSelect"
    />
  </div>
</template>
