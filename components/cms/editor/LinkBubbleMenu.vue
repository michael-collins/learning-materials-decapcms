<script setup lang="ts">
/**
 * LinkBubbleMenu — Floating popover that appears when a link is selected
 * or the cursor is inside a link. Shows the URL with quick actions (edit,
 * open, copy, unlink). Clicking "Edit" switches to an inline form.
 *
 * Also used when creating a new link from the toolbar — opens directly
 * in edit mode.
 */
import { ref, computed, watch, nextTick } from 'vue'
import { BubbleMenu } from '@tiptap/vue-3/menus'
import {
  ExternalLink, Pencil, Unlink, Copy, Check, X,
  Link as LinkIcon,
} from 'lucide-vue-next'

const props = defineProps<{
  editor: any
}>()

// ─── State ─────────────────────────────────────────────────
const editMode = ref(false)
const urlInput = ref('')
const textInput = ref('')
const copied = ref(false)
const urlInputRef = ref<HTMLInputElement | null>(null)

// ─── Computed ──────────────────────────────────────────────
const currentUrl = computed(() => {
  return props.editor?.getAttributes('link')?.href || ''
})

const currentTarget = computed(() => {
  return props.editor?.getAttributes('link')?.target || ''
})

const isNewLink = computed(() => !currentUrl.value && editMode.value)

// ─── Actions ───────────────────────────────────────────────
function startEdit() {
  urlInput.value = currentUrl.value || 'https://'
  // Get the selected text or underlying link text
  const { from, to } = props.editor.state.selection
  textInput.value = props.editor.state.doc.textBetween(from, to, ' ')
  editMode.value = true
  nextTick(() => urlInputRef.value?.select())
}

function applyLink() {
  const url = urlInput.value.trim()
  if (!url) {
    removeLink()
    return
  }

  const chain = props.editor.chain().focus()

  // If user changed the display text, replace it
  const { from, to } = props.editor.state.selection
  const currentText = props.editor.state.doc.textBetween(from, to, ' ')
  if (textInput.value && textInput.value !== currentText) {
    chain.insertContent(textInput.value)
    // Select the just-inserted text so setLink applies to it
    const newTo = from + textInput.value.length
    chain.setTextSelection({ from, to: newTo })
  }

  chain.setLink({ href: url }).run()
  editMode.value = false
}

function removeLink() {
  props.editor.chain().focus().unsetLink().run()
  editMode.value = false
}

function openLink() {
  if (currentUrl.value) {
    window.open(currentUrl.value, '_blank', 'noopener')
  }
}

function copyLink() {
  if (currentUrl.value) {
    navigator.clipboard.writeText(currentUrl.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    applyLink()
  }
  if (e.key === 'Escape') {
    e.preventDefault()
    editMode.value = false
    props.editor.chain().focus().run()
  }
}

// ─── Expose for parent to trigger new-link mode ────────────
function openForNewLink() {
  urlInput.value = 'https://'
  const { from, to } = props.editor.state.selection
  textInput.value = props.editor.state.doc.textBetween(from, to, ' ')
  editMode.value = true
  nextTick(() => urlInputRef.value?.select())
}

defineExpose({ openForNewLink })

// Reset edit mode when bubble hides (selection changes away from link)
watch(() => props.editor?.isActive('link'), (active) => {
  if (!active) editMode.value = false
})
</script>

<template>
  <BubbleMenu
    v-if="editor"
    :editor="editor"
    :tippy-options="{
      duration: 150,
      placement: 'bottom-start',
      maxWidth: 400,
    }"
    :should-show="({ editor: e }) => {
      // Show when link is active, or when in edit mode for new links
      return e.isActive('link')
    }"
    class="link-bubble-menu"
  >
    <!-- Preview mode — shows URL with action buttons -->
    <div
      v-if="!editMode"
      class="flex items-center gap-1 rounded-lg border bg-popover px-2 py-1.5 shadow-lg"
    >
      <LinkIcon class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <a
        :href="currentUrl"
        target="_blank"
        rel="noopener"
        class="max-w-[220px] truncate text-sm text-primary underline underline-offset-2"
        :title="currentUrl"
      >
        {{ currentUrl }}
      </a>

      <div class="ml-1 flex items-center gap-0.5">
        <button
          type="button"
          @click.stop="startEdit"
          class="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Edit link"
        >
          <Pencil class="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          @click.stop="openLink"
          class="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Open in new tab"
        >
          <ExternalLink class="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          @click.stop="copyLink"
          class="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          :title="copied ? 'Copied!' : 'Copy URL'"
        >
          <Check v-if="copied" class="h-3.5 w-3.5 text-green-500" />
          <Copy v-else class="h-3.5 w-3.5" />
        </button>
        <div class="h-4 w-px bg-border" />
        <button
          type="button"
          @click.stop="removeLink"
          class="rounded p-1 text-muted-foreground hover:bg-red-500/20 hover:text-red-600 transition-colors"
          title="Remove link"
        >
          <Unlink class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>

    <!-- Edit mode — inline form to change URL and text -->
    <div
      v-else
      class="flex flex-col gap-2 rounded-lg border bg-popover p-3 shadow-lg w-[340px]"
    >
      <div>
        <label class="mb-1 block text-xs font-medium text-muted-foreground">URL</label>
        <div class="flex gap-1.5">
          <input
            ref="urlInputRef"
            v-model="urlInput"
            type="url"
            placeholder="https://example.com"
            class="flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            @keydown="handleKeydown"
          />
        </div>
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-muted-foreground">Display Text</label>
        <input
          v-model="textInput"
          type="text"
          placeholder="Link text"
          class="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          @keydown="handleKeydown"
        />
      </div>
      <div class="flex items-center justify-end gap-1.5">
        <button
          type="button"
          @click="editMode = false; editor.chain().focus().run()"
          class="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <X class="h-3 w-3" />
          Cancel
        </button>
        <button
          type="button"
          @click="applyLink"
          class="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Check class="h-3 w-3" />
          Apply
        </button>
      </div>
    </div>
  </BubbleMenu>
</template>

<style>
/* Ensure tippy popup renders above everything */
.link-bubble-menu {
  z-index: 50;
}
</style>
