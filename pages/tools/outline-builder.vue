<script setup lang="ts">
definePageMeta({
  layout: 'docs'
})

useHead({
  title: 'Outline Builder - Learning Materials'
})
</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-4xl">
    <div class="mb-8">
      <h1 class="text-4xl font-bold mb-4">Outline Builder</h1>
      <p class="text-lg text-muted-foreground">
        Organize learning resources using indenting to create hierarchical structures.
      </p>
    </div>

    <div class="border border-border rounded-lg p-8 bg-muted/50">
      <div class="flex flex-col items-center justify-center space-y-4 text-center">
        <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon name="lucide:list-tree" class="w-8 h-8 text-primary" />
        </div>
        <div class="space-y-2">
          <h2 class="text-2xl font-semibold">Coming Soon</h2>
          <p class="text-muted-foreground max-w-md">
            The Outline Builder will allow you to create structured learning paths by organizing 
            resources with drag-and-drop indentation to build custom hierarchies.
          </p>
        </div>
        <div class="pt-4">
          <p class="text-sm text-muted-foreground">
            Features in development:
          </p>
          <ul class="text-sm text-muted-foreground space-y-1 mt-2 text-left">
            <li>• Drag-and-drop interface for organizing content</li>
            <li>• Hierarchical indentation for nested structures</li>
            <li>• Export outlines in multiple formats</li>
            <li>• Share and collaborate on outlines</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
