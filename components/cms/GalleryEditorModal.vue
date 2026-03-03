<script setup lang="ts">
/**
 * GalleryEditorModal — Visual editor for building an image-gallery MDC block.
 *
 * Lets the author:
 *   - Add images from the media library
 *   - Edit per-image alt text and caption
 *   - Reorder images (up / down)
 *   - Remove images
 *   - Set gallery-level columns, gap, and caption
 *
 * Emits:
 *   insert(mdcBlock) – the final ::image-gallery{…}:: MDC string
 *   cancel
 */
import { X, Plus, Trash2, ArrowUp, ArrowDown, Images, FolderOpen } from 'lucide-vue-next'

interface GalleryItem {
  src: string
  alt: string
  caption: string
}

// ─── Props / emits ────────────────────────────────────────────
const emit = defineEmits<{
  insert: [mdcBlock: string]
  cancel: []
}>()

// ─── Gallery state ────────────────────────────────────────────
const items = reactive<GalleryItem[]>([])
const galleryCaption = ref('')
const columns = ref<'auto' | '2' | '3' | '4'>('auto')
const gap = ref<'sm' | 'md' | 'lg'>('md')

// ─── Media picker state ───────────────────────────────────────
const showPicker = ref(false)
/** Index of item whose src we're picking, or -1 for a new item */
const pickingFor = ref(-1)

function openPickerForNew() {
  pickingFor.value = -1
  showPicker.value = true
}

function openPickerForItem(index: number) {
  pickingFor.value = index
  showPicker.value = true
}

function handleMediaSelect(path: string) {
  showPicker.value = false
  if (pickingFor.value === -1) {
    items.push({ src: path, alt: '', caption: '' })
  } else {
    const item = items[pickingFor.value]
    if (item) item.src = path
  }
}

// ─── Reorder ──────────────────────────────────────────────────
function moveUp(i: number) {
  if (i === 0) return
  const a = items[i - 1]!
  const b = items[i]!
  items[i - 1] = b
  items[i] = a
}

function moveDown(i: number) {
  if (i === items.length - 1) return
  const a = items[i]!
  const b = items[i + 1]!
  items[i] = b
  items[i + 1] = a
}

function removeItem(i: number) {
  items.splice(i, 1)
}

// ─── Validation ───────────────────────────────────────────────
const canInsert = computed(() => items.length > 0 && items.every((item) => item.src))

// ─── Generate MDC block ───────────────────────────────────────
function handleInsert() {
  const imagesJson = JSON.stringify(
    items.map((item) => {
      const obj: Record<string, string> = { src: item.src, alt: item.alt }
      if (item.caption) obj.caption = item.caption
      return obj
    })
  )
  const parts: string[] = [`images='${imagesJson}'`]
  if (columns.value !== 'auto') parts.push(`columns="${columns.value}"`)
  if (gap.value !== 'md') parts.push(`gap="${gap.value}"`)
  if (galleryCaption.value) parts.push(`caption="${galleryCaption.value}"`)
  emit('insert', `::image-gallery{${parts.join(' ')}}\n::`)
}

// ─── Keyboard ─────────────────────────────────────────────────
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && !showPicker.value) emit('cancel')
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))

// ─── Image preview src ────────────────────────────────────────
// Use a relative URL for preview; if the file hasn't been deployed yet
// the img tag will simply fail silently.
function previewSrc(src: string) {
  if (!src) return ''
  if (src.startsWith('http')) return src
  return src
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pb-8 pt-16">
      <!-- Panel -->
      <div class="relative w-full max-w-2xl rounded-xl border bg-background shadow-2xl">
        <!-- Header -->
        <div class="flex items-center justify-between border-b px-5 py-4">
          <div class="flex items-center gap-2">
            <Images class="h-5 w-5 text-emerald-500" />
            <h3 class="text-base font-semibold">Image Gallery</h3>
          </div>
          <button
            type="button"
            class="rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Cancel"
            @click="emit('cancel')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- Body -->
        <div class="space-y-5 px-5 py-5">

          <!-- ── Image list ──────────────────────────────────── -->
          <div>
            <div class="mb-2 flex items-center justify-between">
              <p class="text-sm font-medium">Images <span class="text-muted-foreground">({{ items.length }})</span></p>
              <button
                type="button"
                class="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                @click="openPickerForNew"
              >
                <Plus class="h-3.5 w-3.5" />
                Add image
              </button>
            </div>

            <!-- Empty state -->
            <p v-if="items.length === 0" class="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              No images yet — click "Add image" to pick from the media library.
            </p>

            <!-- Image rows -->
            <ul class="space-y-2">
              <li
                v-for="(item, i) in items"
                :key="i"
                class="flex items-start gap-2 rounded-lg border bg-muted/30 p-2"
              >
                <!-- Thumbnail -->
                <div class="relative shrink-0">
                  <div class="h-16 w-16 overflow-hidden rounded-md bg-muted">
                    <img
                      v-if="item.src"
                      :src="previewSrc(item.src)"
                      :alt="item.alt || 'gallery image'"
                      class="h-full w-full object-cover"
                    />
                    <div v-else class="flex h-full w-full items-center justify-center text-muted-foreground">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </div>
                  </div>
                  <!-- Re-pick button -->
                  <button
                    type="button"
                    class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm hover:text-foreground"
                    title="Change image"
                    @click="openPickerForItem(i)"
                  >
                    <FolderOpen class="h-3 w-3" />
                  </button>
                </div>

                <!-- Fields -->
                <div class="min-w-0 flex-1 space-y-1.5">
                  <input
                    v-model="item.alt"
                    type="text"
                    placeholder="Alt text (required for accessibility)"
                    class="w-full rounded-md border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    v-model="item.caption"
                    type="text"
                    placeholder="Caption (optional)"
                    class="w-full rounded-md border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <!-- Reorder & remove -->
                <div class="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    :disabled="i === 0"
                    class="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
                    title="Move up"
                    @click="moveUp(i)"
                  >
                    <ArrowUp class="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    :disabled="i === items.length - 1"
                    class="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
                    title="Move down"
                    @click="moveDown(i)"
                  >
                    <ArrowDown class="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    class="rounded p-1 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                    title="Remove"
                    @click="removeItem(i)"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            </ul>
          </div>

          <!-- ── Gallery settings ────────────────────────────── -->
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <!-- Columns -->
            <div>
              <label class="mb-1 block text-xs font-medium">Columns</label>
              <select
                v-model="columns"
                class="w-full rounded-md border bg-transparent px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="auto">Auto (responsive)</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </div>

            <!-- Gap -->
            <div>
              <label class="mb-1 block text-xs font-medium">Gap</label>
              <select
                v-model="gap"
                class="w-full rounded-md border bg-transparent px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
              </select>
            </div>

            <!-- Caption -->
            <div class="col-span-2 sm:col-span-1">
              <label class="mb-1 block text-xs font-medium">Gallery caption</label>
              <input
                v-model="galleryCaption"
                type="text"
                placeholder="Optional caption…"
                class="w-full rounded-md border bg-transparent px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between border-t px-5 py-3">
          <p v-if="items.length > 0 && !items.every(i => i.alt)" class="text-xs text-amber-600 dark:text-amber-400">
            Tip: add alt text to every image for accessibility.
          </p>
          <p v-else-if="items.length === 0" class="text-xs text-muted-foreground">
            Add at least one image to insert.
          </p>
          <span v-else />
          <div class="flex gap-2">
            <button
              type="button"
              class="rounded-md border px-4 py-2 text-sm hover:bg-accent"
              @click="emit('cancel')"
            >
              Cancel
            </button>
            <button
              type="button"
              :disabled="!canInsert"
              class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              @click="handleInsert"
            >
              Insert Gallery
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Media picker -->
    <CmsMediaPickerModal
      :open="showPicker"
      :allowed-types="['image']"
      title="Select image"
      @select="handleMediaSelect"
      @close="showPicker = false"
    />
  </Teleport>
</template>
