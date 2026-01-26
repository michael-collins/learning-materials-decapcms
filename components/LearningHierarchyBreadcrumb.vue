<template>
  <nav aria-label="Breadcrumb" class="breadcrumb-nav">
    <ol class="breadcrumb-list">
      <li class="breadcrumb-item">
        <NuxtLink to="/" class="breadcrumb-link">Home</NuxtLink>
      </li>
      <li class="breadcrumb-item">
        <NuxtLink to="/pathways" class="breadcrumb-link">Pathways</NuxtLink>
      </li>
      
      <li v-if="pathway" class="breadcrumb-item">
        <NuxtLink :to="`/pathways/${pathway.slug}`" class="breadcrumb-link" :class="{ active: currentLevel === 'pathway' }">
          {{ pathway.title }}
        </NuxtLink>
      </li>
      
      <li v-if="specialization" class="breadcrumb-item">
        <NuxtLink :to="`/specializations/${specialization.slug}`" class="breadcrumb-link" :class="{ active: currentLevel === 'specialization' }">
          {{ specialization.title }}
        </NuxtLink>
      </li>
      
      <li v-if="lesson" class="breadcrumb-item">
        <NuxtLink :to="`/lessons/${lesson.slug}`" class="breadcrumb-link" :class="{ active: currentLevel === 'lesson' }">
          {{ lesson.title }}
        </NuxtLink>
      </li>
      
      <li v-if="content" class="breadcrumb-item">
        <span class="breadcrumb-link active">{{ content.title }}</span>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
interface Item {
  slug?: string
  title: string
}

withDefaults(
  defineProps<{
    pathway?: Item
    specialization?: Item
    lesson?: Item
    content?: Item
    currentLevel?: 'home' | 'pathways' | 'pathway' | 'specialization' | 'lesson' | 'content'
  }>(),
  {
    currentLevel: 'content'
  }
)
</script>

<style scoped>
.breadcrumb-nav {
  margin-bottom: 1.5rem;
}

.breadcrumb-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 0.875rem;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
}

.breadcrumb-item:not(:last-child)::after {
  content: '›';
  display: inline-block;
  margin: 0 0.5rem;
  color: #9ca3af;
  font-weight: 300;
}

.breadcrumb-link {
  color: #0369a1;
  text-decoration: none;
  transition: color 0.2s ease;
}

.breadcrumb-link:hover:not(.active) {
  color: #0284c7;
  text-decoration: underline;
}

.breadcrumb-link.active {
  color: #6b7280;
  cursor: default;
  text-decoration: none;
  font-weight: 500;
}

@media (max-width: 640px) {
  .breadcrumb-list {
    font-size: 0.8125rem;
    gap: 0.25rem;
  }

  .breadcrumb-item:not(:last-child)::after {
    margin: 0 0.25rem;
  }
}
</style>
