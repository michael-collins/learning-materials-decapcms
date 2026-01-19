<script setup>
definePageMeta({
  layout: 'docs'
})
</script>

<template>
  <div class="container max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
    <div class="hero mb-16 rounded-xl bg-gradient-to-br from-primary via-primary to-purple-600 dark:from-primary/80 dark:via-primary/70 dark:to-purple-600/80 p-16 text-center text-primary-foreground shadow-xl">
      <h1 class="mb-6 text-5xl font-bold tracking-tight">Welcome to Learning Materials</h1>
      <p class="text-xl opacity-90 max-w-2xl mx-auto leading-relaxed">A modern content platform powered by Nuxt 4, Nuxt Content, and DecapCMS</p>
    </div>

    <div class="mb-16 grid gap-8 md:grid-cols-3">
      <div class="group rounded-xl border bg-card p-8 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
        <div class="mb-4 text-5xl">📚</div>
        <h2 class="mb-3 text-2xl font-semibold">Articles</h2>
        <p class="mb-6 text-muted-foreground leading-relaxed">Browse our collection of educational articles</p>
        <NuxtLink to="/articles" class="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
          View Articles
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </NuxtLink>
      </div>
      
      <div class="group rounded-xl border bg-card p-8 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
        <div class="mb-4 text-5xl">🎓</div>
        <h2 class="mb-3 text-2xl font-semibold">Tutorials</h2>
        <p class="mb-6 text-muted-foreground leading-relaxed">Step-by-step tutorials to help you learn</p>
        <NuxtLink to="/tutorials" class="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
          View Tutorials
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </NuxtLink>
      </div>
      
      <div class="group rounded-xl border bg-card p-8 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
        <div class="mb-4 text-5xl">⚙️</div>
        <h2 class="mb-3 text-2xl font-semibold">CMS Admin</h2>
        <p class="mb-6 text-muted-foreground leading-relaxed">Manage content with DecapCMS</p>
        <a href="/admin" target="_blank" class="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
          Open CMS
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>

    <div class="rounded-xl border bg-card p-10 shadow-sm">
      <h2 class="mb-6 text-3xl font-semibold">Built With Modern Technologies</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="flex items-start gap-3">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <div>
            <strong class="block text-foreground mb-1">Nuxt 4</strong>
            <span class="text-sm text-muted-foreground">The Intuitive Vue Framework</span>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"/></svg>
          </div>
          <div>
            <strong class="block text-foreground mb-1">Nuxt Content</strong>
            <span class="text-sm text-muted-foreground">File-based CMS for Nuxt</span>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
          </div>
          <div>
            <strong class="block text-foreground mb-1">DecapCMS</strong>
            <span class="text-sm text-muted-foreground">Open-source content management</span>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
          </div>
          <div>
            <strong class="block text-foreground mb-1">shadcn-vue</strong>
            <span class="text-sm text-muted-foreground">Beautiful UI components</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
