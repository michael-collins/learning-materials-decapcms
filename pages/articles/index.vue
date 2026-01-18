<template>
  <div class="articles-page">
    <h1>Articles</h1>
    <p class="subtitle">Browse our collection of educational articles</p>
    
    <div v-if="articles && articles.length" class="articles-grid">
      <article v-for="article in articles" :key="article._path" class="article-card">
        <NuxtLink :to="article._path" class="article-link">
          <h2>{{ article.title }}</h2>
          <p class="description">{{ article.description }}</p>
          <div class="meta">
            <span v-if="article.date" class="date">{{ formatDate(article.date) }}</span>
            <span v-if="article.author" class="author">By {{ article.author }}</span>
          </div>
        </NuxtLink>
      </article>
    </div>
    
    <div v-else class="empty-state">
      <p>No articles yet. Create your first article in the <a href="/admin" target="_blank">CMS Admin</a>.</p>
    </div>
  </div>
</template>

<script setup>
const { data: articles } = await useAsyncData('articles', () => 
  queryContent('/articles')
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
.articles-page {
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

.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 2rem;
}

.article-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.article-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

.article-link {
  display: block;
  padding: 1.5rem;
  text-decoration: none;
  color: inherit;
}

.article-card h2 {
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
