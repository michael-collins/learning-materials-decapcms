<template>
  <div class="home">
    <div class="hero">
      <h1>Welcome to Learning Materials</h1>
      <p>A modern content platform powered by Nuxt 4, Nuxt Content, and DecapCMS</p>
    </div>

    <div class="features">
      <div class="feature-card">
        <h2>📚 Articles</h2>
        <p>Browse our collection of educational articles</p>
        <NuxtLink to="/articles" class="btn">View Articles</NuxtLink>
      </div>
      
      <div class="feature-card">
        <h2>🎓 Tutorials</h2>
        <p>Step-by-step tutorials to help you learn</p>
        <NuxtLink to="/tutorials" class="btn">View Tutorials</NuxtLink>
      </div>
      
      <div class="feature-card">
        <h2>⚙️ CMS Admin</h2>
        <p>Manage content with DecapCMS</p>
        <a href="/admin" class="btn" target="_blank">Open CMS</a>
      </div>
    </div>

    <div class="tech-stack">
      <h2>Built With</h2>
      <ul>
        <li><strong>Nuxt 4</strong> - The Intuitive Vue Framework</li>
        <li><strong>Nuxt Content</strong> - File-based CMS for Nuxt</li>
        <li><strong>DecapCMS</strong> - Open-source content management</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.home {
  max-width: 100%;
}

.hero {
  text-align: center;
  padding: 4rem 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
  margin-bottom: 3rem;
}

.hero h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.hero p {
  font-size: 1.25rem;
  opacity: 0.9;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

.feature-card {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  text-align: center;
  transition: transform 0.2s, box-shadow 0.2s;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

.feature-card h2 {
  margin-bottom: 1rem;
  color: #2c3e50;
}

.feature-card p {
  margin-bottom: 1.5rem;
  color: #666;
}

.btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background: #667eea;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn:hover {
  background: #5568d3;
}

.tech-stack {
  background: #f8f9fa;
  padding: 2rem;
  border-radius: 8px;
}

.tech-stack h2 {
  margin-bottom: 1rem;
  color: #2c3e50;
}

.tech-stack ul {
  list-style: none;
}

.tech-stack li {
  padding: 0.5rem 0;
  color: #666;
}

.tech-stack strong {
  color: #2c3e50;
}
</style>
