<script setup lang="ts">
/**
 * ImageGallery — Responsive image grid with lightbox.
 *
 * Usage in MDC:
 *   ::image-gallery{columns="3" gap="md" caption="Project photos" images='[{"src":"/uploads/a.jpg","alt":"Photo A","caption":"Caption A"}]'}
 *   ::
 *
 * Props:
 *   images    — JSON-encoded array of { src, alt, caption? }
 *   columns   — '2' | '3' | '4' | 'auto'  (default: 'auto')
 *   gap       — 'sm' | 'md' | 'lg'         (default: 'md')
 *   caption   — Optional gallery-level caption
 */

interface GalleryItem {
  src: string
  alt: string
  caption?: string
}

interface Props {
  images: string
  columns?: '2' | '3' | '4' | 'auto'
  gap?: 'sm' | 'md' | 'lg'
  caption?: string
}

const props = withDefaults(defineProps<Props>(), {
  columns: 'auto',
  gap: 'md',
})

// ─── Parse images JSON ────────────────────────────────────────
const parsedImages = computed<GalleryItem[]>(() => {
  if (!props.images) return []
  try {
    const parsed = JSON.parse(props.images)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
})

// ─── Lightbox ─────────────────────────────────────────────────
const lightboxIndex = ref<number | null>(null)
const lightboxItem = computed(() =>
  lightboxIndex.value !== null ? parsedImages.value[lightboxIndex.value] : null
)

function openLightbox(i: number) {
  lightboxIndex.value = i
}

function closeLightbox() {
  lightboxIndex.value = null
}

function prevImage() {
  if (lightboxIndex.value === null) return
  lightboxIndex.value =
    (lightboxIndex.value - 1 + parsedImages.value.length) % parsedImages.value.length
}

function nextImage() {
  if (lightboxIndex.value === null) return
  lightboxIndex.value = (lightboxIndex.value + 1) % parsedImages.value.length
}

function onKeydown(e: KeyboardEvent) {
  if (lightboxIndex.value === null) return
  if (e.key === 'Escape') closeLightbox()
  else if (e.key === 'ArrowLeft') prevImage()
  else if (e.key === 'ArrowRight') nextImage()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

// ─── Grid classes ──────────────────────────────────────────────
const gridClass = computed(() =>
  props.columns === 'auto' ? 'ig-grid-auto' : `ig-grid-${props.columns}`
)
const gapClass = computed(() => `ig-gap-${props.gap}`)
</script>

<template>
  <figure class="image-gallery my-8">
    <!-- Grid -->
    <div :class="['ig-grid', gridClass, gapClass]">
      <button
        v-for="(item, i) in parsedImages"
        :key="i"
        type="button"
        class="ig-item group relative overflow-hidden rounded-lg bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        :aria-label="`View ${item.alt || 'image'} (${i + 1} of ${parsedImages.length})`"
        @click="openLightbox(i)"
      >
        <img
          :src="item.src"
          :alt="item.alt"
          class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />
        <!-- Caption overlay on hover -->
        <div
          v-if="item.caption"
          class="absolute inset-x-0 bottom-0 translate-y-full rounded-b-lg bg-black/65 px-2 py-1.5 transition-transform duration-300 group-hover:translate-y-0"
        >
          <p class="line-clamp-2 text-xs text-white">{{ item.caption }}</p>
        </div>
      </button>
    </div>

    <!-- Gallery caption -->
    <figcaption
      v-if="caption"
      class="mt-3 text-center text-sm text-muted-foreground"
    >
      {{ caption }}
    </figcaption>

    <!-- Empty / parse error state -->
    <div
      v-if="!parsedImages.length"
      class="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive"
    >
      Image gallery: no images to display.
    </div>
  </figure>

  <!-- ── Lightbox ─────────────────────────────────────────────── -->
  <Teleport to="body">
    <Transition name="lb">
      <div
        v-if="lightboxItem"
        class="fixed inset-0 z-60 flex items-center justify-center bg-black/90"
        role="dialog"
        aria-modal="true"
        :aria-label="lightboxItem.alt"
        @click.self="closeLightbox"
      >
        <!-- Close -->
        <button
          type="button"
          class="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Close"
          @click="closeLightbox"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <!-- Prev -->
        <button
          v-if="parsedImages.length > 1"
          type="button"
          class="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Previous image"
          @click="prevImage"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <!-- Next -->
        <button
          v-if="parsedImages.length > 1"
          type="button"
          class="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Next image"
          @click="nextImage"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <!-- Image -->
        <div class="flex max-h-[90vh] max-w-[90vw] flex-col items-center gap-3 px-14">
          <img
            :src="lightboxItem.src"
            :alt="lightboxItem.alt"
            class="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
          />
          <p v-if="lightboxItem.caption" class="text-center text-sm text-white/80">
            {{ lightboxItem.caption }}
          </p>
          <p v-if="parsedImages.length > 1" class="text-xs text-white/40">
            {{ (lightboxIndex ?? 0) + 1 }} / {{ parsedImages.length }}
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Grid layouts ─────────────────────────────────────────── */
.ig-grid {
  display: grid;
}

.ig-grid-auto {
  grid-template-columns: repeat(auto-fill, minmax(min(180px, 100%), 1fr));
}

.ig-grid-2 { grid-template-columns: repeat(2, 1fr); }
.ig-grid-3 { grid-template-columns: repeat(3, 1fr); }
.ig-grid-4 { grid-template-columns: repeat(4, 1fr); }

/* Responsive collapse */
@media (max-width: 640px) {
  .ig-grid-3,
  .ig-grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }
  .ig-grid-auto {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* ── Gaps ───────────────────────────────────────────────────── */
.ig-gap-sm { gap: 0.375rem; }
.ig-gap-md { gap: 0.75rem; }
.ig-gap-lg { gap: 1.25rem; }

/* ── Items ──────────────────────────────────────────────────── */
.ig-item {
  aspect-ratio: 4 / 3;
  cursor: zoom-in;
}

/* ── Lightbox transition ─────────────────────────────────────── */
.lb-enter-active,
.lb-leave-active {
  transition: opacity 0.2s ease;
}
.lb-enter-from,
.lb-leave-to {
  opacity: 0;
}
</style>
