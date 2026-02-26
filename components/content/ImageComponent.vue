<script setup lang="ts">
/**
 * ImageComponent — MDC image block with required alt text, optional caption & attribution.
 *
 * Usage in MDC:
 *   ::image-component{src="/uploads/photo.jpg" alt="A sunset over the ocean" caption="Sunset at Malibu Beach" credit="Jane Doe" creditUrl="https://example.com"}
 *   ::
 */
interface Props {
  src: string
  alt: string
  caption?: string
  credit?: string
  creditUrl?: string
}

const props = withDefaults(defineProps<Props>(), {
  alt: '',
})
</script>

<template>
  <figure class="image-component my-8">
    <img
      v-if="src"
      :src="src"
      :alt="alt"
      class="rounded-lg max-w-full mx-auto"
      loading="lazy"
    />
    <div
      v-else
      class="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive"
    >
      Missing image source
    </div>
    <ContentMediaCaption
      v-if="src"
      :caption="caption"
      :credit="credit"
      :credit-url="creditUrl"
      component-type="image"
    />
  </figure>
</template>
