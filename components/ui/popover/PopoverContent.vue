<script setup lang="ts">
import { PopoverContent, type PopoverContentEmits, type PopoverContentProps } from 'radix-vue'
import { computed, type HTMLAttributes } from 'vue'
import { cn } from '~/lib/utils'

const props = withDefaults(
  defineProps<PopoverContentProps & { class?: HTMLAttributes['class'] }>(),
  {
    align: 'center',
    sideOffset: 4,
  },
)

const emits = defineEmits<PopoverContentEmits>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})
</script>

<template>
  <PopoverContent
    v-bind="{ ...delegatedProps, ...emits }"
    :class="cn(
      'z-50 rounded-md border border-border bg-popover text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
      'w-[calc(100vw-2rem)] max-w-xs p-3 sm:w-72 sm:p-4',
      props.class,
    )"
  >
    <slot />
  </PopoverContent>
</template>
