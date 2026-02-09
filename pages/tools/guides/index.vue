<script setup lang="ts">
definePageMeta({
  layout: 'docs'
})

useHead({
  title: 'Interactive Guides - Learning Materials'
})

const guides = [
  {
    title: 'Concept Development Guide',
    description: 'Build a deep understanding of key concepts through structured exploration.',
    icon: 'lucide:lightbulb',
    path: '/tools/guides/concept-development',
    status: 'planned'
  },
  {
    title: 'Writing Guide',
    description: 'Improve your technical and creative writing skills with targeted exercises.',
    icon: 'lucide:pen-tool',
    path: '/tools/guides/writing',
    status: 'planned'
  },
  {
    title: 'Career Guide',
    description: 'Navigate your career path with resources for professional development.',
    icon: 'lucide:briefcase',
    path: '/tools/guides/career',
    status: 'planned'
  },
  {
    title: 'Theory & Philosophy Guide',
    description: 'Explore theoretical frameworks and philosophical foundations.',
    icon: 'lucide:book-open',
    path: '/tools/guides/theory-philosophy',
    status: 'planned'
  }
]
</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-6xl">
    <div class="mb-8">
      <h1 class="text-4xl font-bold mb-4">Interactive Guides</h1>
      <p class="text-lg text-muted-foreground">
        Structured pathways to help you engage with learning materials in meaningful ways.
      </p>
    </div>

    <div class="grid gap-6 md:grid-cols-2">
      <div 
        v-for="guide in guides" 
        :key="guide.path"
        class="border border-border rounded-lg p-6 bg-card hover:border-primary/50 transition-colors"
      >
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon :name="guide.icon" class="w-6 h-6 text-primary" />
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <h2 class="text-xl font-semibold">{{ guide.title }}</h2>
              <span class="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {{ guide.status }}
              </span>
            </div>
            <p class="text-muted-foreground text-sm">
              {{ guide.description }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-12 border border-border rounded-lg p-8 bg-muted/50">
      <div class="text-center space-y-4">
        <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Icon name="lucide:compass" class="w-8 h-8 text-primary" />
        </div>
        <div class="space-y-2">
          <h3 class="text-2xl font-semibold">More Guides Coming Soon</h3>
          <p class="text-muted-foreground max-w-2xl mx-auto">
            We're developing interactive guides to help students engage with learning materials 
            in structured and meaningful ways. Each guide will provide step-by-step pathways 
            tailored to specific learning goals.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
