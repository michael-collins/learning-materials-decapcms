<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import { cn } from '~/lib/utils'

interface SidebarMenuProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<SidebarMenuProps>()
</script>

<template>
  <ul :class="cn('flex flex-col gap-1', props.class)">
    <slot />
  </ul>
</template>
