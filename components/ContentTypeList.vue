<template>
  <div class="content-type-list">
    <div v-if="!items || items.length === 0" class="empty-state">
      <p>No {{ contentType }} available</p>
    </div>

    <div v-else class="items-container">
      <div class="section-header">
        <h3 class="section-title">
          <span class="type-icon">{{ getTypeIcon() }}</span>
          {{ getTypeLabel() }}
        </h3>
        <span v-if="items.length > 0" class="item-count">{{ items.length }}</span>
      </div>

      <div class="items-grid">
        <NuxtLink
          v-for="item in items"
          :key="item.slug"
          :to="getItemPath(item)"
          class="item-card"
        >
          <div class="item-header">
            <h4 class="item-title">{{ item.title }}</h4>
            <span v-if="item.difficulty" class="difficulty-badge">{{ item.difficulty }}</span>
          </div>

          <p v-if="item.description" class="item-description">
            {{ truncateText(item.description, 80) }}
          </p>

          <div class="item-meta">
            <span v-if="item.duration" class="meta-item">
              <span class="meta-icon">⏱️</span>
              <span>{{ item.duration }}</span>
            </span>
            <span v-if="item.estimatedDuration" class="meta-item">
              <span class="meta-icon">⏱️</span>
              <span>{{ item.estimatedDuration }}</span>
            </span>
          </div>

          <div v-if="showArrow" class="item-arrow">→</div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ContentItem {
  slug: string
  title: string
  description?: string
  difficulty?: string
  duration?: string
  estimatedDuration?: string
}

interface Props {
  items: ContentItem[]
  contentType: 'lectures' | 'exercises' | 'projects' | 'topics' | 'quizzes'
  showArrow?: boolean
}

withDefaults(defineProps<Props>(), {
  showArrow: true
})

const getTypeIcon = () => {
  const icons: Record<string, string> = {
    lectures: '📚',
    exercises: '💪',
    projects: '🎯',
    topics: '📖',
    quizzes: '📝'
  }
  return icons[props.contentType] || '📄'
}

const getTypeLabel = () => {
  const labels: Record<string, string> = {
    lectures: 'Lectures',
    exercises: 'Exercises',
    projects: 'Projects',
    topics: 'Topics',
    quizzes: 'Quizzes'
  }
  return labels[props.contentType] || 'Content'
}

const getItemPath = (item: ContentItem) => {
  const paths: Record<string, string> = {
    lectures: '/lectures/',
    exercises: '/exercises/',
    projects: '/projects/',
    topics: '/topics/',
    quizzes: '/quizzes/'
  }
  return (paths[props.contentType] || '/content/') + item.slug
}

const truncateText = (text: string, length: number) => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

const props = defineProps<Props>()
</script>

<style scoped>
.content-type-list {
  margin-bottom: 2rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #9ca3af;
  background: #f9fafb;
  border-radius: 0.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #f3f4f6;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.type-icon {
  font-size: 1.5rem;
}

.item-count {
  background: #dbeafe;
  color: #0369a1;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 600;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.item-card {
  position: relative;
  padding: 1rem;
  border-radius: 0.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  transition: all 0.3s ease;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
}

.item-card:hover {
  border-color: #0369a1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.item-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.item-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  line-height: 1.3;
  flex: 1;
}

.difficulty-badge {
  display: inline-block;
  background: #fed7aa;
  color: #92400e;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.7rem;
  font-weight: 600;
  flex-shrink: 0;
  white-space: nowrap;
}

.item-description {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0 0 0.75rem 0;
  line-height: 1.4;
  flex: 1;
}

.item-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: auto;
  padding-top: 0.75rem;
  border-top: 1px solid #f3f4f6;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.meta-icon {
  font-size: 0.875rem;
}

.item-arrow {
  position: absolute;
  top: 50%;
  right: 1rem;
  transform: translateY(-50%);
  color: #d1d5db;
  font-size: 1.5rem;
  transition: all 0.3s ease;
  opacity: 0;
}

.item-card:hover .item-arrow {
  opacity: 1;
  color: #0369a1;
  right: 0.75rem;
}

@media (max-width: 768px) {
  .items-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  }
}

@media (max-width: 640px) {
  .items-grid {
    grid-template-columns: 1fr;
  }

  .section-title {
    font-size: 1.125rem;
  }
}
</style>
