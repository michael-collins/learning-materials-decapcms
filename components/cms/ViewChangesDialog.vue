<script setup lang="ts">
/**
 * ViewChangesDialog — shows a side-by-side diff of current edits vs saved content.
 *
 * Compares frontmatter fields and markdown body, highlighting additions,
 * removals, and modifications.
 */
import { X, FileText, FileDiff, Minus, Plus, Equal } from 'lucide-vue-next'
import { useBodyOverflow } from '~/composables/useBodyOverflow'

const props = defineProps<{
  open: boolean
  /** Field definitions for labeling */
  fields: { name: string; label: string; widget?: string }[]
  /** The original saved data (frontmatter + body key) */
  originalData: Record<string, any>
  /** The current form data (frontmatter fields) */
  currentData: Record<string, any>
  /** The original saved body content */
  originalBody: string
  /** The current body content */
  currentBody: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { lock, unlock } = useBodyOverflow()

watch(() => props.open, (isOpen) => {
  if (isOpen) lock()
  else unlock()
})

function close() {
  emit('update:open', false)
}

// ─── Diff computation ───────────────────────────────────

interface FieldChange {
  name: string
  label: string
  type: 'added' | 'removed' | 'modified' | 'unchanged'
  oldValue: string
  newValue: string
}

const fieldChanges = computed<FieldChange[]>(() => {
  const changes: FieldChange[] = []

  for (const field of props.fields) {
    if (field.name === 'body') continue
    if (field.widget === 'hidden') continue

    const oldVal = props.originalData?.[field.name]
    const newVal = props.currentData?.[field.name]
    const oldStr = formatValue(oldVal)
    const newStr = formatValue(newVal)

    if (oldStr === newStr) continue

    let type: FieldChange['type'] = 'modified'
    if (!oldStr || oldStr === '—') type = 'added'
    else if (!newStr || newStr === '—') type = 'removed'

    changes.push({
      name: field.name,
      label: field.label || field.name,
      type,
      oldValue: oldStr,
      newValue: newStr,
    })
  }

  return changes
})

const bodyChanged = computed(() => {
  return (props.originalBody ?? '') !== (props.currentBody ?? '')
})

/** Simple line-by-line diff for body content */
interface LineDiff {
  type: 'same' | 'added' | 'removed'
  text: string
  lineNum?: number
}

const bodyDiff = computed<LineDiff[]>(() => {
  if (!bodyChanged.value) return []

  const oldLines = (props.originalBody ?? '').split('\n')
  const newLines = (props.currentBody ?? '').split('\n')

  // Simple LCS-based line diff
  return computeLineDiff(oldLines, newLines)
})

function computeLineDiff(oldLines: string[], newLines: string[]): LineDiff[] {
  // Build LCS table
  const m = oldLines.length
  const n = newLines.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0) as number[])

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!)
      }
    }
  }

  // Backtrack to produce diff
  const result: LineDiff[] = []
  let i = m
  let j = n

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({ type: 'same', text: oldLines[i - 1] ?? '' })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i]![j - 1]! >= dp[i - 1]![j]!)) {
      result.unshift({ type: 'added', text: newLines[j - 1] ?? '' })
      j--
    } else {
      result.unshift({ type: 'removed', text: oldLines[i - 1] ?? '' })
      i--
    }
  }

  return result
}

const totalChanges = computed(() => {
  return fieldChanges.value.length + (bodyChanged.value ? 1 : 0)
})

function formatValue(val: any): string {
  if (val === null || val === undefined || val === '') return '—'
  if (typeof val === 'boolean') return val ? 'true' : 'false'
  if (Array.isArray(val)) {
    if (val.length === 0) return '(empty)'
    return val.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(', ')
  }
  if (typeof val === 'object') return JSON.stringify(val, null, 2)
  return String(val)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[5vh]"
        @click.self="close"
      >
        <div
          class="w-full max-w-2xl rounded-lg border bg-background shadow-lg"
          @click.stop
        >
          <!-- Header -->
          <div class="flex items-center justify-between border-b px-5 py-4">
            <div class="flex items-center gap-2">
              <FileDiff class="h-5 w-5 text-muted-foreground" />
              <h2 class="text-lg font-semibold">View Changes</h2>
              <span
                v-if="totalChanges > 0"
                class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
              >
                {{ totalChanges }} {{ totalChanges === 1 ? 'change' : 'changes' }}
              </span>
            </div>
            <button
              type="button"
              @click="close"
              class="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <!-- Content -->
          <div class="max-h-[70vh] overflow-y-auto">
            <!-- No changes -->
            <div
              v-if="totalChanges === 0"
              class="flex flex-col items-center justify-center py-12 text-center"
            >
              <Equal class="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p class="text-sm text-muted-foreground">No changes detected</p>
            </div>

            <template v-else>
              <!-- Frontmatter field changes -->
              <div v-if="fieldChanges.length > 0" class="border-b">
                <div class="bg-muted/30 px-5 py-2">
                  <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Field Changes
                  </h3>
                </div>
                <div class="divide-y">
                  <div
                    v-for="change in fieldChanges"
                    :key="change.name"
                    class="px-5 py-3"
                  >
                    <div class="mb-1.5 flex items-center gap-2">
                      <span class="text-sm font-medium">{{ change.label }}</span>
                      <span
                        :class="[
                          'rounded px-1.5 py-0.5 text-[10px] font-medium',
                          change.type === 'added' && 'bg-green-500/10 text-green-600 dark:text-green-400',
                          change.type === 'removed' && 'bg-red-500/10 text-red-600 dark:text-red-400',
                          change.type === 'modified' && 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
                        ]"
                      >
                        {{ change.type }}
                      </span>
                    </div>

                    <!-- Old → New for modified/removed/added -->
                    <div class="flex flex-col gap-1 text-sm">
                      <div
                        v-if="change.type !== 'added'"
                        class="flex items-start gap-2 rounded bg-red-500/5 px-2.5 py-1.5"
                      >
                        <Minus class="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                        <span class="min-w-0 wrap-break-word text-red-700 dark:text-red-300">{{ change.oldValue }}</span>
                      </div>
                      <div
                        v-if="change.type !== 'removed'"
                        class="flex items-start gap-2 rounded bg-green-500/5 px-2.5 py-1.5"
                      >
                        <Plus class="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
                        <span class="min-w-0 wrap-break-word text-green-700 dark:text-green-300">{{ change.newValue }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Body diff -->
              <div v-if="bodyChanged">
                <div class="bg-muted/30 px-5 py-2">
                  <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Body Changes
                  </h3>
                </div>
                <div class="overflow-x-auto px-5 py-3">
                  <div class="rounded border bg-muted/20 font-mono text-xs leading-relaxed">
                    <div
                      v-for="(line, idx) in bodyDiff"
                      :key="idx"
                      :class="[
                        'flex px-3 py-0.5',
                        line.type === 'added' && 'bg-green-500/10',
                        line.type === 'removed' && 'bg-red-500/10',
                      ]"
                    >
                      <span
                        :class="[
                          'mr-3 inline-block w-4 shrink-0 select-none text-right',
                          line.type === 'added' && 'text-green-600 dark:text-green-400',
                          line.type === 'removed' && 'text-red-600 dark:text-red-400',
                          line.type === 'same' && 'text-muted-foreground/50',
                        ]"
                      >
                        {{ line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ' }}
                      </span>
                      <span
                        :class="[
                          'min-w-0 whitespace-pre-wrap break-all',
                          line.type === 'added' && 'text-green-700 dark:text-green-300',
                          line.type === 'removed' && 'text-red-700 dark:text-red-300',
                        ]"
                      >{{ line.text || '\u00A0' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- Footer -->
          <div class="flex justify-end border-t px-5 py-3">
            <button
              type="button"
              @click="close"
              class="rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
