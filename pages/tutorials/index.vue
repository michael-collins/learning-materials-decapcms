<template>
  <div class="tutorials-page">
    <h1>Tutorials</h1>
    <p class="subtitle">Step-by-step guides to help you learn</p>
    
    <div v-if="tutorials?.length" class="tutorials-grid">
      <article v-for="tutorial in tutorials" :key="tutorial._path" class="tutorial-card">
        <NuxtLink :to="tutorial._path" class="tutorial-link">
          <h2>{{ tutorial.title }}</h2>
          <p class="description">{{ tutorial.description }}</p>
          <div class="meta">
            <span v-if="tutorial.date" class="date">{{ formatDate(tutorial.date) }}</span>
            <span v-if="tutorial.author" class="author">By {{ tutorial.author }}</span>
            <span v-if="tutorial.difficulty" class="difficulty">{{ tutorial.difficulty }}</span>
          </div>
        </NuxtLink>
      </article>
    </div>
    
    <div v-else class="empty-state">
      <p>No tutorials yet. Create your first tutorial in the <a href="/admin" target="_blank">CMS Admin</a>.</p>
    </div>
  </div>
</template>

<script setup>
const { data: tutorials } = await useAsyncData('tutorials', () => 
  queryContent('/tutorials')
    .sort({ date: -1 })
    .find()
)

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<style scoped>
.tutorials-page {
  max-width: 100%;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  color: #2c3e50;
}

.subtitle {
  font-size: 1.125rem;
  color: #666;
  margin-bottom: 2rem;
}

.tutorials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 2rem;
}

.tutorial-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.tutorial-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

.tutorial-link {
  display: block;
  padding: 1.5rem;
  text-decoration: none;
  color: inherit;
}

.tutorial-card h2 {
  color: #2c3e50;
  margin-bottom: 0.75rem;
  font-size: 1.5rem;
}

.description {
  color: #666;
  margin-bottom: 1rem;
  line-height: 1.6;
}

.meta {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: #999;
}

.difficulty {
  background: #667eea;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  text-transform: uppercase;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.empty-state p {
  font-size: 1.125rem;
  color: #666;
}

.empty-state a {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
}

.empty-state a:hover {
  text-decoration: underline;
}
</style>
