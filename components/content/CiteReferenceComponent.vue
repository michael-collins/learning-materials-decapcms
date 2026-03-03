<script setup lang="ts">
/**
 * CiteReferenceComponent — Inline citation marker rendered by Nuxt Content MDC.
 *
 * Usage in markdown:
 *   ::cite-reference{label="Smith 2024" text="Smith, J. (2024). Title. Publisher." url="https://..."}::
 *
 * Renders as a superscript clickable reference number [N] that links to the
 * references footer. The footer link jumps back to this citation.
 */
interface Props {
  label: string
  text?: string
  url?: string
}

const props = withDefaults(defineProps<Props>(), {
  text: '',
  url: '',
})

// Use the page-level references store (provided by the parent page)
const references = inject<{
  addReference: (opts: { label: string; text?: string; url?: string; source?: string }) => { num: number; refId: string; citeId: string }
}>('contentReferences')

const ref_ = computed(() => {
  if (!references) return { num: 0, refId: 'ref-0', citeId: 'cite-0' }
  return references.addReference({
    label: props.label,
    text: props.text || props.label,
    url: props.url || undefined,
    source: 'cite-reference',
  })
})
</script>

<template>
  <sup :id="ref_.citeId" class="cite-ref">
    <a
      :href="`#${ref_.refId}`"
      class="inline-flex items-center justify-center rounded bg-primary/10 px-1 py-0.5 text-[0.65rem] font-semibold leading-none text-primary no-underline transition-colors hover:bg-primary/20"
      :title="props.text || props.label"
      role="doc-noteref"
    >[{{ ref_.num }}]</a>
  </sup>
</template>
