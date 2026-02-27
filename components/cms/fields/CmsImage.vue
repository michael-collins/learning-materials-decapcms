<script setup lang="ts">
/**
 * CmsImage — Image upload and preview widget.
 *
 * Supports:
 * - Displaying existing images from the uploads folder
 * - File upload via the media upload API
 * - URL input as fallback
 * - Image thumbnail preview
 *
 * Stores the public path (e.g., "/uploads/photo.jpg").
 */
import type { CmsFieldDef } from '~/lib/cms/config-types'
import { ImagePlus, Upload, X, Loader2, Link } from 'lucide-vue-next'

const props = defineProps<{
  field: CmsFieldDef
  modelValue: any
}>()

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

const imagePath = computed({
  get: () => (typeof props.modelValue === 'string' ? props.modelValue : ''),
  set: (val) => emit('update:modelValue', val),
})

// ─── State ────────────────────────────────────────────────────
const uploading = ref(false)
const uploadError = ref('')
const showUrlInput = ref(false)
const urlInput = ref('')
const fileInput = ref<HTMLInputElement>()

// ─── Image preview URL ────────────────────────────────────────
const previewUrl = computed(() => {
  if (!imagePath.value) return ''
  // Handle both absolute URLs and relative paths
  if (imagePath.value.startsWith('http')) return imagePath.value
  // Relative path from public folder
  return imagePath.value
})

const hasImage = computed(() => !!imagePath.value)

// ─── File upload ──────────────────────────────────────────────
function triggerFileInput() {
  fileInput.value?.click()
}

const { getToken } = useCmsAuth()
const { uploadFile } = useCmsUpload()

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // Validate file type
  if (!file.type.startsWith('image/')) {
    uploadError.value = 'Please select an image file.'
    return
  }

  uploadError.value = ''
  uploading.value = true

  try {
    const response = await uploadFile(file, 'uploads')
    imagePath.value = response.path
  } catch (e: any) {
    uploadError.value = e?.data?.message || e?.message || 'Upload failed'
    console.error('Upload error:', e, 'data:', e?.data, 'status:', e?.statusCode, 'response:', e?.response?._data)
  } finally {
    uploading.value = false
    // Reset file input
    if (fileInput.value) fileInput.value.value = ''
  }
}

// ─── URL input ────────────────────────────────────────────────
function applyUrl() {
  if (urlInput.value.trim()) {
    imagePath.value = urlInput.value.trim()
  }
  showUrlInput.value = false
  urlInput.value = ''
}

function clearImage() {
  imagePath.value = ''
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

    <!-- Image preview -->
    <div v-if="hasImage" class="relative group mb-2">
      <div class="overflow-hidden rounded-md border bg-muted">
        <img
          :src="previewUrl"
          :alt="field.label"
          class="h-48 w-full object-contain"
          @error="($event.target as HTMLImageElement).style.display = 'none'"
        />
      </div>
      <div class="mt-1 flex items-center gap-2">
        <p class="flex-1 truncate text-xs text-muted-foreground">
          {{ imagePath }}
        </p>
        <button
          type="button"
          @click="clearImage"
          class="shrink-0 rounded p-1 text-destructive/60 hover:bg-destructive/10 hover:text-destructive"
          title="Remove image"
        >
          <X class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>

    <!-- Upload area (when no image) -->
    <div v-else>
      <div
        class="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-muted-foreground/25 p-6 transition-colors hover:border-muted-foreground/50 cursor-pointer"
        @click="triggerFileInput"
        @dragover.prevent
        @drop.prevent="handleDrop"
      >
        <div v-if="uploading" class="flex items-center gap-2">
          <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
          <span class="text-sm text-muted-foreground">Uploading...</span>
        </div>
        <template v-else>
          <ImagePlus class="h-8 w-8 text-muted-foreground/40" />
          <p class="text-sm text-muted-foreground">
            Click or drag to upload an image
          </p>
          <p class="text-xs text-muted-foreground/60">
            JPG, PNG, GIF, SVG, WebP
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
          {{ showUrlInput ? 'Cancel' : 'Or enter URL' }}
        </button>
      </div>

      <div v-if="showUrlInput" class="mt-2 flex gap-2">
        <input
          v-model="urlInput"
          type="text"
          placeholder="https://example.com/image.jpg or /uploads/photo.jpg"
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
      accept="image/*"
      class="hidden"
      @change="handleFileSelect"
    />
  </div>
</template>
