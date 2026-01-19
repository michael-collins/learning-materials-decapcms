<script setup lang="ts">
import { Primitive, type PrimitiveProps } from 'radix-vue'
import { type HTMLAttributes, computed } from 'vue'
import { cn } from '~/lib/utils'

interface SidebarProps extends PrimitiveProps {
  class?: HTMLAttributes['class']
  collapsible?: 'offcanvas' | 'icon' | 'none'
}

const props = withDefaults(defineProps<SidebarProps>(), {
  as: 'div',
  collapsible: 'offcanvas',
})

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props
  return delegated
})
</script>

<template>
  <Primitive
    v-bind="delegatedProps"
    :class="cn('group flex h-full w-64 flex-col border-r bg-background', props.class)"
  >
    <slot />
  </Primitive>
</template>
