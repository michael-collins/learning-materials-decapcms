<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import { cn } from '~/lib/utils'

interface BreadcrumbLinkProps {
  class?: HTMLAttributes['class']
  asChild?: boolean
}

const props = withDefaults(defineProps<BreadcrumbLinkProps>(), {
  asChild: false,
})
</script>

<template>
  <component
    :is="asChild ? 'div' : 'a'"
    :class="cn('transition-colors hover:text-foreground', props.class)"
  >
    <slot />
  </component>
</template>
