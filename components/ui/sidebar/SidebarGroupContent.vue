<script setup lang="ts">
import { Primitive, type PrimitiveProps } from 'radix-vue'
import { type HTMLAttributes, computed } from 'vue'
import { cn } from '~/lib/utils'

interface SidebarGroupContentProps extends PrimitiveProps {
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<SidebarGroupContentProps>(), {
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
    :class="cn('flex flex-col gap-1', props.class)"
  >
    <slot />
  </Primitive>
</template>
