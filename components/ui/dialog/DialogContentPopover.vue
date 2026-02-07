<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue'
import {
  DialogClose,
  DialogContent,
  type DialogContentEmits,
  type DialogContentProps,
  DialogPortal,
  useForwardPropsEmits,
} from 'radix-vue'
import { X } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

interface DialogContentPopoverProps extends DialogContentProps {
  class?: HTMLAttributes['class']
}

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<DialogContentPopoverProps>()

const emits = defineEmits<DialogContentEmits>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DialogPortal :style="{ pointerEvents: 'none' }">
    <DialogContent
      v-bind="{ ...forwarded, ...$attrs }"
      @interact-outside="(event) => event.preventDefault()"
      @pointer-down-outside="(event) => event.preventDefault()"
      :trap-focus="false"
      :class="cn(
        'fixed z-50 bg-background border shadow-lg rounded-lg overflow-hidden duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom-2 data-[state=open]:slide-in-from-bottom-2 pointer-events-auto',
        // Mobile: Full screen with safe areas
        'max-sm:inset-0 max-sm:rounded-none max-sm:border-0 max-sm:w-full max-sm:h-[100dvh]',
        // Tablet and up: Popover style
        'sm:bottom-20 sm:right-4 sm:w-[400px] sm:h-[600px] sm:max-h-[calc(100vh-7rem)]',
        // Medium screens: Slightly larger
        'md:w-[450px] md:h-[650px]',
        props.class,
      )"
    >
      <slot />
    </DialogContent>
  </DialogPortal>
</template>
<style scoped>
:global([data-radix-dialog-portal]) {
  pointer-events: none !important;
}

:global([data-radix-dialog-content]) {
  pointer-events: auto !important;
}
</style>