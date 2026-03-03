<script setup lang="ts">
/**
 * MediaPickerModal — Modal wrapper around MediaBrowser in select mode.
 *
 * Opens a full-screen modal with the media browser, allowing the user
 * to pick a file (image, 3D model, etc.). Emits the selected file's path.
 *
 * Usage:
 *   <CmsMediaMediaPickerModal
 *     :open="showPicker"
 *     :allowed-types="['image']"
 *     @select="onFileSelected"
 *     @close="showPicker = false"
 *   />
 */
import { X } from 'lucide-vue-next'

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
  /** Controls modal visibility */
  open: boolean
  /** Optional: filter to only these file types (e.g. ['image'], ['3d']) */
  allowedTypes?: string[]
  /** Modal title */
  title?: string
}>(), {
  allowedTypes: () => [],
  title: 'Select a file',
})

const emit = defineEmits<{
  select: [path: string, file: MediaFile]
  close: []
}>()

function handleSelect(file: MediaFile) {
  emit('select', file.path, file)
  emit('close')
}

function handleClose() {
  emit('close')
}

// Close on Escape
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') handleClose()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center">
      <!-- Overlay -->
      <div class="absolute inset-0 bg-black/50" @click="handleClose" />

      <!-- Modal -->
      <div class="relative z-10 mx-4 flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl">
        <!-- Header -->
        <div class="flex items-center justify-between border-b px-5 py-3">
          <h2 class="text-lg font-semibold">{{ title }}</h2>
          <button
            type="button"
            @click="handleClose"
            class="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Media browser (select mode) -->
        <div class="flex-1 overflow-hidden">
          <CmsMediaBrowser
            :select-mode="true"
            :allowed-types="allowedTypes"
            @select="handleSelect"
          />
        </div>

        <!-- Footer hint -->
        <div class="border-t px-5 py-2 text-xs text-muted-foreground">
          Click a file to select it, or upload a new file. Press <kbd class="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">Esc</kbd> to cancel.
        </div>
      </div>
    </div>
  </Teleport>
</template>
