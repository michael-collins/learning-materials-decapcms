<script setup lang="ts">
import { Primitive, type PrimitiveProps } from 'radix-vue'
import { type HTMLAttributes, computed } from 'vue'
import { cn } from '~/lib/utils'

interface SidebarGroupLabelProps extends PrimitiveProps {
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<SidebarGroupLabelProps>(), {
  as: 'div',
})

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props
  return delegated
})
</script>

<template>
  <Primitive
    v-bind="delegatedProps"
    :class="cn('px-2 py-1.5 text-xs font-semibold text-muted-foreground', props.class)"
  >
    <slot />
  </Primitive>
</template>
