<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import { cn } from '~/lib/utils'

interface SidebarMenuButtonProps {
  class?: HTMLAttributes['class']
  isActive?: boolean
  asChild?: boolean
}

const props = withDefaults(defineProps<SidebarMenuButtonProps>(), {
  isActive: false,
  asChild: false,
})
</script>

<template>
  <component
    :is="asChild ? 'div' : 'button'"
    :class="cn(
      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
      'hover:bg-accent hover:text-accent-foreground',
      isActive && 'bg-accent text-accent-foreground',
      props.class
    )"
  >
    <slot />
  </component>
</template>
