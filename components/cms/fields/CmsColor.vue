<script setup lang="ts">
/**
 * CmsColor — Color picker field.
 * Maps to the CMS `color` widget.
 *
 * Combines a native <input type="color"> (for visual picking) with a text
 * input so any valid CSS color value can be stored (hex, oklch, rgb, hsl…).
 *
 * The color swatch always reflects the stored value via CSS background-color,
 * and a canvas trick converts any valid CSS color to hex so the native picker
 * always opens pre-filled to the correct color.
 */
import type { CmsFieldDef } from '~/lib/cms/config-types'
import { Pipette } from 'lucide-vue-next'
import { useTheme } from '~/composables/useTheme'
import { themes } from '~/composables/useBookTheme'
const props = defineProps<{
  field: CmsFieldDef
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const textValue = ref(props.modelValue ?? '')
const pickerRef = ref<HTMLInputElement | null>(null)

// Keep local text in sync when external value changes
watch(() => props.modelValue, (v) => {
  if (v !== textValue.value) textValue.value = v ?? ''
})

function onTextInput(e: Event) {
  textValue.value = (e.target as HTMLInputElement).value
  emit('update:modelValue', textValue.value)
}

/** Convert any valid CSS color string to a hex value the native picker can use.
 *  Uses a 1×1 canvas to let the browser resolve the color. Falls back to #000000. */
function cssColorToHex(color: string): string {
  if (!color || typeof document === 'undefined') return '#000000'
  try {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const ctx = canvas.getContext('2d')
    if (!ctx) return '#000000'
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = '#000000' // reset
    ctx.fillStyle = color     // attempt to set
    // If the browser couldn't parse the color, fillStyle stays as the last valid value
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data as unknown as number[]
    return '#' + [r, g, b].map(n => (n as number).toString(16).padStart(2, '0')).join('')
  } catch {
    return '#000000'
  }
}

function openPicker() {
  if (!pickerRef.value) return
  // Pre-fill picker with override value if set, otherwise the inherited theme color
  // so the user can make small tweaks from the current base color.
  pickerRef.value.value = cssColorToHex(textValue.value || inheritedColor.value)
  pickerRef.value.click()
}

function onPickerChange(e: Event) {
  const hex = (e.target as HTMLInputElement).value
  textValue.value = hex
  emit('update:modelValue', hex)
}

/**
 * Resolve the base color for this field from the currently selected theme
 * definition. Falls back to the live document CSS var.
 *
 * We inject the root form data (provided by CollectionForm) to read `theme`.
 */
const rootFormData = inject<Record<string, any>>('cmsRootFormData', {})
const { isDark } = useTheme()

function resolveInheritedColor(): string {
  const varName = `--color-${props.field.name}`
  const themeName = (rootFormData?.theme || 'default') as keyof typeof themes
  const themeConfig = themes[themeName] ?? themes.default
  const themeVars = isDark.value ? themeConfig.dark : themeConfig.light
  const themeColor = themeVars[varName]
  if (themeColor) return themeColor.trim()
  // Fallback: live document CSS var (for the 'default' theme which has empty maps)
  if (typeof document !== 'undefined') {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  }
  return ''
}

const inheritedColor = ref('')
onMounted(() => { inheritedColor.value = resolveInheritedColor() })

// Re-resolve when the theme selection or dark mode changes
watch([() => rootFormData?.theme, isDark], () => {
  inheritedColor.value = resolveInheritedColor()
})

// Swatch background — show override value if set, otherwise the inherited CSS var
const displayColor = computed(() => textValue.value || inheritedColor.value || 'transparent')

const swatchStyle = computed(() => ({
  backgroundColor: displayColor.value,
}))

// Whether we're showing the inherited (not overridden) color
const isInherited = computed(() => !textValue.value && !!inheritedColor.value)
</script>

<template>
  <div class="space-y-1.5">
    <label :for="`field-${field.name}`" class="text-sm font-medium">
      {{ field.label }}
      <span v-if="field.required !== false" class="text-destructive">*</span>
    </label>

    <div class="flex items-center gap-2">
      <!-- Color swatch / picker trigger -->
      <button
        type="button"
        :class="[
          'relative h-10 w-10 shrink-0 rounded-md border shadow-sm overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          isInherited ? 'border-dashed border-muted-foreground/40' : 'border-input',
        ]"
        :title="isInherited ? `Theme default: ${inheritedColor} — click to override` : `Pick color for ${field.label}`"
        @click="openPicker"
      >
        <!-- Checkerboard background for transparency indication -->
        <span
          class="absolute inset-0"
          style="background-image: linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%); background-size: 8px 8px; background-position: 0 0, 0 4px, 4px -4px, -4px 0px;"
        />
        <!-- Solid color layer on top -->
        <span
          class="absolute inset-0 transition-colors"
          :style="swatchStyle"
        />
        <!-- Pipette icon hint on hover -->
        <span class="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20">
          <Pipette class="h-4 w-4 text-white drop-shadow" />
        </span>
        <!-- Hidden native color input -->
        <input
          ref="pickerRef"
          type="color"
          class="sr-only"
          tabindex="-1"
          @change="onPickerChange"
        />
      </button>

      <!-- Text input for raw CSS value -->
      <div class="relative flex-1 min-w-0">
        <input
          :id="`field-${field.name}`"
          :value="textValue"
          type="text"
          :placeholder="inheritedColor || 'e.g. oklch(0.50 0.28 293) or #3b82f6'"
          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm ring-offset-background placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 pr-16"
          @input="onTextInput"
        />
        <!-- "theme" badge when showing inherited / clear button when overridden -->
        <span
          v-if="isInherited"
          class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
        >theme</span>
        <button
          v-else-if="textValue"
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Clear override and use theme default"
          @click="() => { textValue = ''; emit('update:modelValue', '') }"
        >clear</button>
      </div>
    </div>

    <p v-if="field.hint" class="text-xs text-muted-foreground">
      {{ field.hint }}
    </p>
  </div>
</template>
