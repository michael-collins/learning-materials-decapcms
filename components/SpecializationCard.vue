<template>
  <NuxtLink :to="`/specializations/${spec.slug}`" class="specialization-card">
    <div class="card-image">
      <img 
        :src="spec.image || placeholderImage" 
        :alt="spec.imageAlt || spec.title"
        @error="handleImageError"
      />
      <span v-if="spec.difficulty" class="difficulty-badge">{{ spec.difficulty }}</span>
    </div>
    <div class="card-content">
      <div class="card-header">
        <h3 class="card-title">{{ spec.title }}</h3>
        <div v-if="spec.targetRole" class="role-badge">
          {{ spec.targetRole }}
        </div>
      </div>
      
      <p class="card-description">{{ truncateText(spec.description, 120) }}</p>
      
      <div class="card-meta">
        <div v-if="spec.estimatedDuration" class="meta-item">
          <span class="meta-icon">⏱️</span>
          <span>{{ spec.estimatedDuration }}</span>
        </div>
      </div>
      
      <div class="card-footer">
        <div v-if="spec.skills && spec.skills.length > 0" class="skills-preview">
          <span class="skills-label">Skills:</span>
          <span v-for="skill in spec.skills.slice(0, 2)" :key="skill" class="skill-tag">{{ skill }}</span>
          <span v-if="spec.skills.length > 2" class="more-skills">+{{ spec.skills.length - 2 }}</span>
        </div>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
interface Specialization {
  slug: string
  title: string
  description: string
  difficulty?: string
  estimatedDuration?: string
  targetRole?: string
  image?: string
  imageAlt?: string
  skills?: string[]
}

const props = defineProps<{
  specialization?: Specialization
  title?: string
  slug?: string
  description?: string
  difficulty?: string
  duration?: string
  image?: string
  imageAlt?: string
  targetRole?: string
  skills?: string[]
}>()

const placeholderImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"%3E%3Crect fill="%23e5e7eb" width="400" height="200"/%3E%3Ctext x="50%25" y="50%25" font-size="16" fill="%236b7280" text-anchor="middle" dominant-baseline="middle"%3ENo image%3C/text%3E%3C/svg%3E'

// Handle both prop styles - single object or individual props
const spec = computed(() => {
  if (props.specialization) {
    return props.specialization
  }
  return {
    slug: props.slug || '',
    title: props.title || '',
    description: props.description || '',
    difficulty: props.difficulty,
    estimatedDuration: props.duration,
    targetRole: props.targetRole,
    image: props.image,
    imageAlt: props.imageAlt,
    skills: props.skills
  }
})

const truncateText = (text: string, length: number) => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.src = placeholderImage
}
</script>

<style scoped>
.specialization-card {
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

.specialization-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.card-image {
  position: relative;
  width: 100%;
  height: 180px;
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

.card-header {
  margin-bottom: 0.5rem;
}

.card-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 0.25rem 0;
  line-height: 1.3;
}

.role-badge {
  display: inline-block;
  background: #fef3c7;
  color: #b45309;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.card-description {
  flex: 1;
  font-size: 0.8125rem;
  color: #6b7280;
  margin: 0 0 0.75rem 0;
  line-height: 1.5;
}

.card-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
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

.card-footer {
  border-top: 1px solid #f0f0f0;
  padding-top: 0.75rem;
}

.skills-preview {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.75rem;
  flex-wrap: wrap;
}

.skills-label {
  font-weight: 600;
  color: #6b7280;
}

.skill-tag {
  background: #ede9fe;
  color: #6d28d9;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.7rem;
}

.more-skills {
  color: #9ca3af;
  font-weight: 500;
}
</style>
