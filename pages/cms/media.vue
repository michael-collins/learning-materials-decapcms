<script setup lang="ts">
/**
 * Media Manager page — Full media browser at /cms/media.
 *
 * Lists all files in public/uploads with grid/list views,
 * search, filtering, upload, and delete functionality.
 */
definePageMeta({
  layout: 'cms',
  middleware: ['cms-auth'],
})

useHead({ title: 'Media Manager – CMS' })
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="border-b px-6 py-4">
      <h1 class="text-2xl font-bold">Media Manager</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Browse, upload, and manage media files in your project.
      </p>
    </div>

    <div class="flex-1 overflow-hidden">
      <CmsMediaMediaBrowser />
    </div>
  </div>
</template>
