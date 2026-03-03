<script setup lang="ts">
/**
 * ContentReferencesFooter — Renders the auto-collected references list at the
 * bottom of a content page. Shows numbered references with bidirectional links
 * between the inline citation [N] and the reference entry.
 *
 * Usage: Place at the bottom of the page layout, after <ContentRenderer>.
 *   <ContentReferencesFooter />
 *
 * Reads from the `contentReferences` injection provided by the parent page.
 */
import { ExternalLink, ArrowUp } from 'lucide-vue-next'

interface ContentReference {
  num: number
  label: string
  text: string
  url?: string
  refId: string
  citeId: string
  source?: string
}

const references = inject<{
  references: Readonly<Ref<ContentReference[]>>
  hasReferences: ComputedRef<boolean>
}>('contentReferences')

const refs = computed(() => references?.references.value ?? [])
const hasRefs = computed(() => references?.hasReferences.value ?? false)
</script>

<template>
  <section v-if="hasRefs" class="content-references-footer mt-12 border-t pt-8" role="doc-endnotes" aria-label="References">
    <h2 class="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tight">
      <span>References</span>
      <span class="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">{{ refs.length }}</span>
    </h2>
    <ol class="list-none space-y-3 pl-0">
      <li
        v-for="ref_ in refs"
        :key="ref_.num"
        :id="ref_.refId"
        class="group flex gap-3 rounded-md p-2 text-sm transition-colors target:bg-primary/5"
      >
        <!-- Reference number -->
        <span class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {{ ref_.num }}
        </span>

        <!-- Reference body -->
        <div class="min-w-0 flex-1">
          <p class="text-foreground/90">
            {{ ref_.text }}
          </p>
          <div class="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <!-- Source link -->
            <a
              v-if="ref_.url"
              :href="ref_.url"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink class="h-3 w-3" />
              Source
            </a>
            <!-- Jump back to citation -->
            <a
              :href="`#${ref_.citeId}`"
              class="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              title="Jump to citation in text"
            >
              <ArrowUp class="h-3 w-3" />
              Back to text
            </a>
          </div>
        </div>
      </li>
    </ol>
  </section>
</template>
