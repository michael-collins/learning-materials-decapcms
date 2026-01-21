<script setup>
definePageMeta({
  layout: 'docs'
})
</script>

<template>
  <div class="container max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
    <div class="hero mb-16 rounded-xl bg-gradient-to-br from-primary via-primary to-purple-600 dark:from-primary/80 dark:via-primary/70 dark:to-purple-600/80 p-16 text-center text-primary-foreground shadow-xl">
      <h1 class="mb-6 text-5xl font-bold tracking-tight">Open Educational Resources Platform</h1>
      <p class="text-xl opacity-90 max-w-2xl mx-auto leading-relaxed">A comprehensive system for creating, managing, and sharing educational content with proper metadata, licensing, and LMS integration</p>
    </div>

    <!-- Purpose -->
    <div class="prose prose-slate dark:prose-invert max-w-none mb-16">
      <h2 class="text-3xl font-bold mb-6">Why This Platform?</h2>
      <p class="text-lg text-muted-foreground leading-relaxed mb-4">
        This platform addresses the critical challenge of maintaining and distributing educational materials in a way that is both technically robust and pedagogically sound. By combining modern web technologies with established educational standards, it provides a complete solution for creating, organizing, and sharing Open Educational Resources (OER).
      </p>
      <p class="text-lg text-muted-foreground leading-relaxed">
        The system is designed specifically for academic environments where content needs to be reusable, properly licensed, discoverable through metadata standards, and seamlessly integrated with Learning Management Systems (LMS).
      </p>
    </div>

    <!-- Key Features -->
    <div class="mb-16">
      <h2 class="text-3xl font-bold mb-8">Key Features</h2>
      <div class="grid gap-6 md:grid-cols-2">
        <div class="rounded-xl border bg-card p-8 shadow-sm">
          <div class="flex items-start gap-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="2"/>
                <path d="M9 3v18M15 3v18M3 9h18M3 15h18" stroke-width="2"/>
              </svg>
            </div>
            <div>
              <h3 class="text-xl font-semibold mb-3">Embeddable Content with LTI Support</h3>
              <p class="text-muted-foreground leading-relaxed">
                All content can be embedded in external platforms with a dedicated embed layout. The system includes automatic iframe resize messaging compatible with LTI standards, ensuring seamless integration with Canvas, Moodle, and other LMS platforms.
              </p>
            </div>
          </div>
        </div>

        <div class="rounded-xl border bg-card p-8 shadow-sm">
          <div class="flex items-start gap-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div>
              <h3 class="text-xl font-semibold mb-3">AIUL License Management</h3>
              <p class="text-muted-foreground leading-relaxed">
                Built-in support for the AI Usage License Project (AIUL), providing clear, granular licensing options specifically designed for educational materials. Instructors can specify exactly generative AI systems should or should not be used in a given context.
              </p>
            </div>
          </div>
        </div>

        <div class="rounded-xl border bg-card p-8 shadow-sm">
          <div class="flex items-start gap-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M13 3v6h6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div>
              <h3 class="text-xl font-semibold mb-3">Git-Based Content Workflow</h3>
              <p class="text-muted-foreground leading-relaxed">
                Content is stored as Markdown files in Git, providing version control, collaboration through pull requests, and the ability to work offline. DecapCMS provides a user-friendly interface while maintaining the benefits of Git-based workflows.
              </p>
            </div>
          </div>
        </div>

        <div class="rounded-xl border bg-card p-8 shadow-sm">
          <div class="flex items-start gap-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div>
              <h3 class="text-xl font-semibold mb-3">Rich Educational Metadata</h3>
              <p class="text-muted-foreground leading-relaxed">
                Every resource includes comprehensive metadata including learning objectives, difficulty levels, time estimates, and course associations. Content is organized into exercises, projects, lectures, pathways, and specializations for clear curriculum structure.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Related Projects -->
    <div class="mb-16">
      <h2 class="text-3xl font-bold mb-8">Related Projects</h2>
      <div class="space-y-6">
        <div class="rounded-xl border bg-card p-8 shadow-sm">
          <h3 class="text-2xl font-semibold mb-3">OER Schema</h3>
          <p class="text-muted-foreground leading-relaxed mb-4">
            This platform implements the OER Schema specification, which extends Schema.org with educational metadata specifically designed for Open Educational Resources. Each page includes structured JSON-LD markup that makes content discoverable by search engines and educational resource repositories.
          </p>
          <a href="https://github.com/michael-collins/oerschema" target="_blank" class="inline-flex items-center gap-2 text-primary hover:underline">
            Learn more about OER Schema
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        <div class="rounded-xl border bg-card p-8 shadow-sm">
          <h3 class="text-2xl font-semibold mb-3">AIUL (AI Usage License Project)</h3>
          <p class="text-muted-foreground leading-relaxed mb-4">
            AIUL provides a flexible licensing framework specifically designed for educational materials and AI usage transparency. It allows content creators to specify granular permissions for different types of academic use and AI training, including teaching, research, and institutional contexts.
          </p>
          <a href="https://github.com/michael-collins/aiul" target="_blank" class="inline-flex items-center gap-2 text-primary hover:underline">
            Learn more about AIUL
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </div>

    <!-- Technology Stack -->
    <div class="rounded-xl border bg-card p-10 shadow-sm mb-16">
      <h2 class="mb-8 text-3xl font-semibold">Technology Stack</h2>
      <div class="grid gap-6 sm:grid-cols-2">
        <div class="flex items-start gap-4">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <div>
            <strong class="block text-foreground text-lg mb-2">Nuxt 4</strong>
            <span class="text-sm text-muted-foreground leading-relaxed">The Intuitive Vue Framework providing SSR, static generation, and a powerful plugin ecosystem</span>
          </div>
        </div>
        <div class="flex items-start gap-4">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"/></svg>
          </div>
          <div>
            <strong class="block text-foreground text-lg mb-2">Nuxt Content</strong>
            <span class="text-sm text-muted-foreground leading-relaxed">File-based CMS with Markdown support, syntax highlighting, and powerful querying capabilities</span>
          </div>
        </div>
        <div class="flex items-start gap-4">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
          </div>
          <div>
            <strong class="block text-foreground text-lg mb-2">DecapCMS</strong>
            <span class="text-sm text-muted-foreground leading-relaxed">Open-source content management with Git-based workflow and customizable content modeling</span>
          </div>
        </div>
        <div class="flex items-start gap-4">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
          </div>
          <div>
            <strong class="block text-foreground text-lg mb-2">shadcn-vue & Tailwind CSS</strong>
            <span class="text-sm text-muted-foreground leading-relaxed">Beautiful, accessible UI components with utility-first styling for rapid development</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Get Started -->
    <div class="rounded-xl bg-gradient-to-br from-primary/10 to-purple-600/10 p-10 text-center">
      <h2 class="text-3xl font-bold mb-4">Ready to Explore?</h2>
      <p class="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
        Browse our collection of educational materials or visit the admin panel to start creating your own content.
      </p>
      <div class="flex flex-wrap gap-4 justify-center">
        <NuxtLink to="/exercises" class="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
          Browse Exercises
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </NuxtLink>
        <NuxtLink to="/projects" class="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
          View Projects
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </NuxtLink>
        <a href="/admin" target="_blank" class="inline-flex items-center gap-2 rounded-lg border border-primary bg-background px-6 py-3 text-sm font-medium text-primary shadow-sm transition-colors hover:bg-primary/10">
          Open CMS Admin
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  </div>
</template>
