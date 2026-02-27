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
  align?: 'left' | 'center' | 'right' | 'full'
  size?: 'small' | 'medium' | 'large' | 'full'
  float?: 'left' | 'right' | 'none'
}

const props = withDefaults(defineProps<Props>(), {
  alt: '',
})

const { layoutClasses } = useMdcLayout(props)
</script>

<template>
  <figure class="image-component my-8" :class="layoutClasses">
    <img
      v-if="src"
      :src="src"
      :alt="alt"
      class="rounded-lg w-full"
      loading="lazy"
    />
    <div
      v-else
      class="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive"
    >
      Missing image source
    </div>
    <MediaCaption
      v-if="src"
      :caption="caption"
      :credit="credit"
      :credit-url="creditUrl"
      component-type="image"
    />
  </figure>
</template>
