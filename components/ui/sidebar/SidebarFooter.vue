<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Primitive, type PrimitiveProps } from 'radix-vue'
import { cn } from '~/lib/utils'

interface SidebarFooterProps extends PrimitiveProps {
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<SidebarFooterProps>(), {
  as: 'div',
})
</script>

<template>
  <Primitive
    :as="props.as"
    :as-child="props.asChild"
    :class="cn('flex flex-col gap-2 p-2', props.class)"
  >
    <slot />
  </Primitive>
</template>
