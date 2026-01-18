<template>
  <div>
    <header class="header">
      <nav class="nav">
        <NuxtLink to="/" class="logo">Learning Materials</NuxtLink>
        <div class="nav-links">
          <NuxtLink to="/">Home</NuxtLink>
          <NuxtLink to="/articles">Articles</NuxtLink>
          <NuxtLink to="/tutorials">Tutorials</NuxtLink>
          <a href="/admin" target="_blank">CMS Admin</a>
        </div>
      </nav>
    </header>
    <main class="main">
      <slot />
    </main>
    <footer class="footer">
      <p>&copy; 2024 Learning Materials. Powered by Nuxt 4 and DecapCMS.</p>
    </footer>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  line-height: 1.6;
  color: #333;
}

.header {
  background: #2c3e50;
  color: white;
  padding: 1rem 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}

.logo {
  font-size: 1.5rem;
  font-weight: bold;
  color: white;
  text-decoration: none;
}

.nav-links {
  display: flex;
  gap: 2rem;
}

.nav-links a {
  color: white;
  text-decoration: none;
  transition: opacity 0.2s;
}

.nav-links a:hover {
  opacity: 0.8;
}

.main {
  min-height: calc(100vh - 180px);
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.footer {
  background: #f8f9fa;
  text-align: center;
  padding: 2rem;
  margin-top: 4rem;
  border-top: 1px solid #e9ecef;
}
</style>
