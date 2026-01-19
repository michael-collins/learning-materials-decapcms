<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import { cn } from '~/lib/utils'

interface BreadcrumbProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<BreadcrumbProps>()
</script>

<template>
  <nav :class="cn('flex', props.class)" aria-label="breadcrumb">
    <ol class="flex items-center gap-2 text-sm text-muted-foreground">
      <slot />
    </ol>
  </nav>
</template>
