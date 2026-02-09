<template>
  <div class="flex gap-4 relative">
    <!-- Step indicator -->
    <div class="flex flex-col items-center">
      <div 
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors"
        :class="[
          isComplete ? 'bg-primary text-primary-foreground' : 'border-2 border-muted-foreground/25 bg-background text-muted-foreground'
        ]"
      >
        <svg v-if="isComplete" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span v-else>{{ step }}</span>
      </div>
      <div v-if="!isLast" class="w-0.5 flex-1 bg-border min-h-8"></div>
    </div>
    
    <!-- Step content -->
    <div class="flex-1 pb-8">
      <div class="flex items-center gap-2 mb-2">
        <h3 class="text-base font-semibold">{{ title }}</h3>
        <span v-if="duration" class="text-xs text-muted-foreground">{{ duration }}</span>
      </div>
      <div class="space-y-2">
        <p v-if="description" class="text-sm text-muted-foreground">{{ description }}</p>
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'Step'
})

interface Props {
  step: number
  title: string
  description?: string
  duration?: string
  isComplete?: boolean
  isLast?: boolean
}

withDefaults(defineProps<Props>(), {
  isComplete: false,
  isLast: false
})
</script>
