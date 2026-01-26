<template>
  <NuxtLink :to="`/pathways/${pathway.slug}`" class="pathway-card">
    <div class="card-image" v-if="pathway.image">
      <img :src="pathway.image" :alt="pathway.imageAlt || pathway.title" />
      <span v-if="pathway.difficulty" class="difficulty-badge">{{ pathway.difficulty }}</span>
    </div>
    <div class="card-content">
      <h3 class="card-title">{{ pathway.title }}</h3>
      <p class="card-description">{{ truncateText(pathway.description, 150) }}</p>
      
      <div class="card-meta">
        <div v-if="pathway.estimatedDuration" class="meta-item">
          <span class="meta-icon">⏱️</span>
          <span>{{ pathway.estimatedDuration }}</span>
        </div>
        <div v-if="specializationCount > 0" class="meta-item">
          <span class="meta-icon">📚</span>
          <span>{{ specializationCount }} specialization<span v-if="specializationCount !== 1">s</span></span>
        </div>
      </div>
      
      <div v-if="pathway.tags && pathway.tags.length > 0" class="card-tags">
        <span v-for="tag in pathway.tags.slice(0, 3)" :key="tag" class="tag">{{ tag }}</span>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
interface Pathway {
  slug: string
  title: string
  description: string
  difficulty?: string
  estimatedDuration?: string
  specializations?: Array<{ slug: string }>
  image?: string
  imageAlt?: string
  tags?: string[]
}

defineProps<{
  pathway: Pathway
}>()

const specializationCount = (pathway: Pathway) => {
  return pathway.specializations?.length || 0
}

const truncateText = (text: string, length: number) => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}
</script>

<style scoped>
.pathway-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: 0.5rem;
  overflow: hidden;
  background: white;
  border: 1px solid #e5e7eb;
  transition: all 0.3s ease;
  text-decoration: none;
  color: inherit;
}

.pathway-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.card-image {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
  background: #f3f4f6;
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.difficulty-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

.card-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
}

.card-description {
  flex: 1;
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0 0 1rem 0;
  line-height: 1.5;
}

.card-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.meta-icon {
  font-size: 1rem;
}

.card-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  background: #f0f9ff;
  color: #0369a1;
  padding: 0.25rem 0.75rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

@media (max-width: 640px) {
  .card-image {
    height: 150px;
  }

  .card-title {
    font-size: 1rem;
  }

  .card-description {
    font-size: 0.8125rem;
  }
}
</style>
