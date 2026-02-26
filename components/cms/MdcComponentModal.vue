<script setup lang="ts">
/**
 * MdcComponentModal — Dynamic form modal for configuring an MDC component's
 * properties before insertion into the Markdown editor.
 *
 * Receives a component definition (label, fields[]) via props.
 * Auto-generates form fields, then emits the values object on confirm.
 */
import { X } from 'lucide-vue-next'

interface MdcFieldDef {
  name: string
  label: string
  widget: 'string' | 'select' | 'boolean' | 'file'
  default?: any
  required?: boolean
  hint?: string
  options?: string[]
}

interface MdcComponentDef {
  id: string
  label: string
  icon: any
  color: string
  fields: MdcFieldDef[]
  toBlock: (values: Record<string, any>) => string
}

const props = defineProps<{
  component: MdcComponentDef
}>()

const emit = defineEmits<{
  insert: [values: Record<string, any>]
  cancel: []
}>()

// Build initial values from the component definition defaults
const values = reactive<Record<string, any>>({})
for (const field of props.component.fields) {
  values[field.name] = field.default ?? (field.widget === 'boolean' ? false : '')
}

const hasRequiredEmpty = computed(() => {
  return props.component.fields.some((f) => {
    const isRequired = f.required !== false // required by default
    return isRequired && !values[f.name]
  })
})

function handleSubmit() {
  emit('insert', { ...values })
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('cancel')
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <!-- Overlay -->
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/50" @click="emit('cancel')" />

      <!-- Modal -->
      <div class="relative z-10 mx-4 w-full max-w-md rounded-lg border bg-background p-6 shadow-xl">
        <!-- Header -->
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-semibold">
            Insert {{ component.label }}
          </h3>
          <button
            type="button"
            @click="emit('cancel')"
            class="rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- Dynamic form fields -->
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div v-for="field in component.fields" :key="field.name">
            <label class="mb-1 block text-sm font-medium">
              {{ field.label }}
              <span v-if="field.required !== false" class="text-red-500">*</span>
            </label>

            <!-- String input -->
            <input
              v-if="field.widget === 'string'"
              v-model="values[field.name]"
              type="text"
              class="w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              :placeholder="field.hint"
            />

            <!-- Select -->
            <select
              v-else-if="field.widget === 'select'"
              v-model="values[field.name]"
              class="w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="" disabled>Select…</option>
              <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
            </select>

            <!-- Boolean -->
            <label
              v-else-if="field.widget === 'boolean'"
              class="inline-flex items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                v-model="values[field.name]"
                class="rounded border"
              />
              Enable
            </label>

            <!-- File path (simple string for now) -->
            <input
              v-else-if="field.widget === 'file'"
              v-model="values[field.name]"
              type="text"
              class="w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              :placeholder="field.hint || 'File path…'"
            />

            <p v-if="field.hint && field.widget !== 'string' && field.widget !== 'file'" class="mt-1 text-xs text-muted-foreground">
              {{ field.hint }}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              @click="emit('cancel')"
              class="rounded-md border px-4 py-2 text-sm hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="hasRequiredEmpty"
              class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Insert
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
