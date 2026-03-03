/**
 * useContentReferences — Manages content references / citations for a page.
 *
 * Collects references from:
 * - MDC media components with `credit` / `creditUrl` attributes
 * - Inline `::cite-reference{...}` MDC components in the body
 *
 * Provides:
 * - An ordered list of references with auto-numbered IDs
 * - Helper to register a reference and get its number
 * - Bidirectional anchor IDs for jumping between citation ↔ reference
 */

export interface ContentReference {
  /** Auto-assigned 1-based number */
  num: number
  /** Short citation label (e.g. author / title) */
  label: string
  /** Full citation text (author, title, date, etc.) */
  text: string
  /** Optional URL to the source */
  url?: string
  /** Anchor ID for the reference in the footer (ref-N) */
  refId: string
  /** Anchor ID for the inline citation (cite-N) */
  citeId: string
  /** Optional: the MDC component type that generated this (e.g. 'video-component') */
  source?: string
}

/**
 * Create a references store for a single page.
 * Call `addReference()` from MDC component rendering to register each source,
 * then read `references` for the footer list.
 */
export function useContentReferences() {
  const references = ref<ContentReference[]>([])
  const refMap = new Map<string, ContentReference>()

  /**
   * Register a reference and return its number.
   * De-duplicates by a key (typically `label + url`).
   */
  function addReference(opts: {
    label: string
    text?: string
    url?: string
    source?: string
  }): ContentReference {
    const key = `${opts.label}||${opts.url || ''}`
    const existing = refMap.get(key)
    if (existing) return existing

    const num = references.value.length + 1
    const ref_: ContentReference = {
      num,
      label: opts.label,
      text: opts.text || opts.label,
      url: opts.url,
      source: opts.source,
      refId: `ref-${num}`,
      citeId: `cite-${num}`,
    }

    refMap.set(key, ref_)
    references.value.push(ref_)
    return ref_
  }

  /** Clear all references (e.g. when content changes) */
  function clearReferences() {
    references.value = []
    refMap.clear()
  }

  /** Check if any references exist */
  const hasReferences = computed(() => references.value.length > 0)

  return {
    references: readonly(references),
    hasReferences,
    addReference,
    clearReferences,
  }
}
