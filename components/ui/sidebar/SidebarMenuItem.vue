<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import { cn } from '~/lib/utils'

interface SidebarMenuItemProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<SidebarMenuItemProps>()
</script>

<template>
  <li :class="cn('', props.class)">
    <slot />
  </li>
</template>
