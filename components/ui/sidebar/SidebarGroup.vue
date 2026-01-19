<script setup lang="ts">
import { Primitive, type PrimitiveProps } from 'radix-vue'
import { type HTMLAttributes, computed } from 'vue'
import { cn } from '~/lib/utils'

interface SidebarGroupProps extends PrimitiveProps {
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<SidebarGroupProps>(), {
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
    :class="cn('flex flex-col gap-2', props.class)"
  >
    <slot />
  </Primitive>
</template>
