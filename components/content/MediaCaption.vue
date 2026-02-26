<script setup lang="ts">
/**
 * MediaCaption — Shared caption / attribution line rendered below media embeds.
 *
 * Displays an optional caption, and if `credit` is provided, auto-registers it
 * as a reference and shows a superscript number linking to the references footer.
 */
interface Props {
  /** The component title (fallback label for caption) */
  title?: string
  /** Optional caption text shown below the media */
  caption?: string
  /** Source attribution / credit text */
  credit?: string
  /** URL to original source */
  creditUrl?: string
  /** The MDC component type for reference tracking */
  componentType?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  caption: '',
  credit: '',
  creditUrl: '',
  componentType: '',
})

// Access the page-level references store
const references = inject<{
  addReference: (opts: { label: string; text?: string; url?: string; source?: string }) => { num: number; refId: string; citeId: string }
}>('contentReferences', null as any)

const ref_ = computed(() => {
  if (!props.credit || !references) return null
  return references.addReference({
    label: props.credit,
    text: props.credit,
    url: props.creditUrl || undefined,
    source: props.componentType || 'media',
  })
})

const showCaption = computed(() => !!props.caption || !!props.credit)
</script>

<template>
  <figcaption v-if="showCaption" class="mt-2 text-center text-sm text-muted-foreground">
    <span v-if="caption">{{ caption }}</span>
    <template v-if="credit">
      <span v-if="caption"> &mdash; </span>
      <template v-if="ref_">
        <a
          v-if="creditUrl"
          :href="creditUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="text-primary hover:underline"
        >{{ credit }}</a>
        <span v-else>{{ credit }}</span>
        <sup :id="ref_.citeId" class="cite-ref ml-0.5">
          <a
            :href="`#${ref_.refId}`"
            class="inline-flex items-center justify-center rounded bg-primary/10 px-1 py-0.5 text-[0.65rem] font-semibold leading-none text-primary no-underline transition-colors hover:bg-primary/20"
            :title="credit"
            role="doc-noteref"
          >[{{ ref_.num }}]</a>
        </sup>
      </template>
      <template v-else>
        <a
          v-if="creditUrl"
          :href="creditUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="text-primary hover:underline"
        >{{ credit }}</a>
        <span v-else>{{ credit }}</span>
      </template>
    </template>
  </figcaption>
</template>
