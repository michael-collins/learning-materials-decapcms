<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import { cn } from '~/lib/utils'

interface BreadcrumbItemProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<BreadcrumbItemProps>()
</script>

<template>
  <li :class="cn('flex items-center gap-2', props.class)">
    <slot />
  </li>
</template>
