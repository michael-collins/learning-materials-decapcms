<template>
  <NuxtLink :to="`/lessons/${lesson.slug}`" class="lesson-card">
    <div class="card-header">
      <span v-if="lesson.order" class="order-badge">{{ lesson.order }}</span>
      <h3 class="card-title">{{ lesson.title }}</h3>
    </div>
    
    <p v-if="lesson.description" class="card-description">
      {{ truncateText(lesson.description, 100) }}
    </p>
    
    <div class="content-counts">
      <div v-if="lectureCount > 0" class="count-item">
        <span class="count-icon">📚</span>
        <span>{{ lectureCount }} lecture<span v-if="lectureCount !== 1">s</span></span>
      </div>
      <div v-if="exerciseCount > 0" class="count-item">
        <span class="count-icon">💪</span>
        <span>{{ exerciseCount }} exercise<span v-if="exerciseCount !== 1">s</span></span>
      </div>
      <div v-if="projectCount > 0" class="count-item">
        <span class="count-icon">🎯</span>
        <span>{{ projectCount }} project<span v-if="projectCount !== 1">s</span></span>
      </div>
    </div>
    
    <div v-if="lesson.estimatedDuration" class="duration">
      <span class="duration-icon">⏱️</span>
      <span>{{ lesson.estimatedDuration }}</span>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
interface Lesson {
  slug: string
  title: string
  description?: string
  estimatedDuration?: string
  order?: number
  lectures?: string[]
  exercises?: string[]
  projects?: string[]
}

const props = defineProps<{
  lesson: Lesson
}>()

const lectureCount = () => props.lesson.lectures?.length || 0
const exerciseCount = () => props.lesson.exercises?.length || 0
const projectCount = () => props.lesson.projects?.length || 0

const truncateText = (text: string, length: number) => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}
</script>

<style scoped>
.lesson-card {
  display: block;
  padding: 1rem;
  border-radius: 0.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  transition: all 0.3s ease;
  text-decoration: none;
  color: inherit;
}

.lesson-card:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.order-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.75rem;
  height: 1.75rem;
  background: #dbeafe;
  color: #0369a1;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  line-height: 1.3;
  flex: 1;
}

.card-description {
  font-size: 0.8125rem;
  color: #6b7280;
  margin: 0 0 0.75rem 0;
  line-height: 1.4;
}

.content-counts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.count-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.count-icon {
  font-size: 0.875rem;
}

.duration {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #059669;
  font-weight: 500;
  padding-top: 0.5rem;
  border-top: 1px solid #f3f4f6;
}

.duration-icon {
  font-size: 0.875rem;
}

@media (max-width: 640px) {
  .lesson-card {
    padding: 0.75rem;
  }

  .card-title {
    font-size: 0.95rem;
  }

  .content-counts {
    grid-template-columns: 1fr;
  }
}
</style>
