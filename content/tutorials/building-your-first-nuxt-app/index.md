---
title: Building Your First Nuxt App
description: A step-by-step tutorial on creating a complete Nuxt application from scratch.
author: Learning Materials Team
date: 2024-01-16
difficulty: Beginner
version: '1.0.0'
versionStatus: latest
publishEmbed: true
---

# Building Your First Nuxt App

This tutorial will walk you through creating a complete Nuxt application from scratch. By the end, you'll have a working app with routing, components, and content.

## Prerequisites

Before starting, make sure you have:

- Node.js 18 or newer installed
- A code editor (VS Code recommended)
- Basic knowledge of Vue.js

## Step 1: Create a New Project

First, create a new Nuxt project:

```bash
npx nuxi@latest init my-first-app
```

Navigate to your project:

```bash
cd my-first-app
```

## Step 2: Install Dependencies

Install the required packages:

```bash
npm install
```

## Step 3: Start Development Server

Run the development server:

```bash
npm run dev
```

Your app will be available at `http://localhost:3000`

## Step 4: Create Your First Page

Create a new file at `pages/about.vue`:

```vue
<template>
  <div>
    <h1>About Us</h1>
    <p>Welcome to our Nuxt application!</p>
  </div>
</template>
```

Visit `http://localhost:3000/about` to see your new page.

## Step 5: Add a Component

Create a component at `components/HelloWorld.vue`:

```vue
<template>
  <div class="hello">
    <h2>{{ message }}</h2>
  </div>
</template>

<script setup>
const props = defineProps({
  message: {
    type: String,
    default: 'Hello World!'
  }
})
</script>

<style scoped>
.hello {
  padding: 1rem;
  background: #f0f0f0;
  border-radius: 8px;
}
</style>
```

## Step 6: Use Your Component

In your `pages/index.vue`, use the component:

```vue
<template>
  <div>
    <HelloWorld message="Welcome to Nuxt!" />
  </div>
</template>
```

## Step 7: Add Styling

Create a global CSS file at `assets/css/main.css`:

```css
body {
  font-family: sans-serif;
  margin: 0;
  padding: 2rem;
}
```

Import it in your `nuxt.config.ts`:

```javascript
export default defineNuxtConfig({
  css: ['~/assets/css/main.css']
})
```

## Conclusion

Congratulations! You've built your first Nuxt app with:

- Multiple pages with automatic routing
- Reusable components
- Custom styling

## Next Steps

- Add more pages and components
- Explore Nuxt Content for content management
- Learn about server-side rendering
- Deploy your app to production

Keep building and experimenting with Nuxt!
