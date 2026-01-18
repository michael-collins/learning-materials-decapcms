<template>
  <div class="content-page">
    <ContentDoc v-slot="{ doc }">
      <article class="article">
        <header class="article-header">
          <h1>{{ doc.title }}</h1>
          <div class="meta">
            <span v-if="doc.date" class="date">{{ formatDate(doc.date) }}</span>
            <span v-if="doc.author" class="author">By {{ doc.author }}</span>
            <span v-if="doc.difficulty" class="difficulty">{{ doc.difficulty }}</span>
          </div>
          <p v-if="doc.description" class="description">{{ doc.description }}</p>
        </header>
        
        <div class="article-content">
          <ContentRenderer :value="doc" />
        </div>
        
        <footer class="article-footer">
          <NuxtLink :to="getBackLink()" class="back-link">← Back to list</NuxtLink>
        </footer>
      </article>
    </ContentDoc>
  </div>
</template>

<script setup>
const route = useRoute()

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const getBackLink = () => {
  const pathParts = route.path.split('/')
  return pathParts[1] ? `/${pathParts[1]}` : '/'
}
</script>

<style scoped>
.content-page {
  max-width: 800px;
  margin: 0 auto;
}

.article {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.article-header {
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 2px solid #e9ecef;
}

.article-header h1 {
  font-size: 2.5rem;
  color: #2c3e50;
  margin-bottom: 1rem;
  line-height: 1.2;
}

.meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: #999;
  flex-wrap: wrap;
}

.difficulty {
  background: #667eea;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  text-transform: uppercase;
  font-weight: 600;
}

.description {
  font-size: 1.25rem;
  color: #666;
  line-height: 1.6;
}

.article-content {
  line-height: 1.8;
  color: #333;
  font-size: 1.0625rem;
}

.article-content :deep(h2) {
  font-size: 2rem;
  color: #2c3e50;
  margin-top: 2rem;
  margin-bottom: 1rem;
}

.article-content :deep(h3) {
  font-size: 1.5rem;
  color: #2c3e50;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

.article-content :deep(p) {
  margin-bottom: 1rem;
}

.article-content :deep(ul),
.article-content :deep(ol) {
  margin-bottom: 1rem;
  padding-left: 2rem;
}

.article-content :deep(li) {
  margin-bottom: 0.5rem;
}

.article-content :deep(code) {
  background: #f8f9fa;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.article-content :deep(pre) {
  background: #2c3e50;
  color: #fff;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  margin-bottom: 1rem;
}

.article-content :deep(pre code) {
  background: none;
  padding: 0;
  color: inherit;
}

.article-content :deep(blockquote) {
  border-left: 4px solid #667eea;
  padding-left: 1rem;
  margin-left: 0;
  margin-bottom: 1rem;
  color: #666;
  font-style: italic;
}

.article-footer {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid #e9ecef;
}

.back-link {
  display: inline-block;
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s;
}

.back-link:hover {
  color: #5568d3;
}
</style>
