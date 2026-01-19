# Learning Materials - Nuxt 4 + Nuxt Content v3 + DecapCMS

A modern learning materials platform built with **Nuxt 4**, **Nuxt Content v3**, and **DecapCMS** with a beautiful, theme-aware UI.

## Features

- 🚀 **Nuxt 4** - The latest version of the intuitive Vue framework
- 📝 **Nuxt Content v3** - File-based content management with SQL-powered collections
- ✨ **DecapCMS** - User-friendly CMS interface for content editing
- 🔐 **GitHub OAuth** - Secure authentication via GitHub
- 🎨 **shadcn-vue Components** - Beautiful, accessible UI components with radix-vue primitives
- 🌓 **Dark Mode** - Seamless light/dark theme switching with Twitter theme from shadcnthemer.com
- 🎯 **Collapsible Sidebar** - Full-width sidebar with smooth collapse animation
- 🧭 **Breadcrumb Navigation** - Automatic breadcrumbs generated from route hierarchy
- 📚 **Type-safe Collections** - Strongly-typed articles and tutorials with Zod validation
- 🔍 **Syntax Highlighting** - Beautiful code blocks in content
- ⚡ **Optimized Performance** - SQL-based storage for fast queries
- 🎨 **Tailwind CSS v4** - Modern styling with OKLCH color space and CSS-based configuration
- 🎯 **Full TypeScript** - Complete type safety across the application

## Quick Start

### Prerequisites

- Node.js 18 or newer
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/michael-collins/learning-materials-decapcms.git
cd learning-materials-decapcms
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
learning-materials-decapcms/
├── app.vue                 # Root application component
├── nuxt.config.ts         # Nuxt 4 configuration
├── content.config.ts      # Nuxt Content collections configuration
├── package.json           # Project dependencies
├── assets/
│   └── css/
│       └── tailwind.css   # Tailwind v4 config with Twitter theme (OKLCH colors)
├── layouts/
│   └── docs.vue          # Main layout with collapsible sidebar and breadcrumbs
├── components/
│   ├── CollectionItem.vue # Content item display with theme-aware prose
│   ├── Footer.vue        # Footer with theme toggle
│   └── ui/               # shadcn-vue components (Button, Breadcrumb, etc.)
├── composables/
│   └── useTheme.ts       # Theme management with @vueuse/core
├── pages/                 # Application pages
│   ├── index.vue         # Home page
│   ├── articles/         # Articles pages
│   │   ├── index.vue    # Articles list (queryCollection)
│   │   └── [...slug].vue # Individual article
│   └── tutorials/        # Tutorials pages
│       ├── index.vue    # Tutorials list (queryCollection)
│       └── [...slug].vue # Individual tutorial
├── content/              # Content files (Markdown)
│   ├── articles/        # Article content
│   └── tutorials/       # Tutorial content
└── public/              # Static assets
    └── admin/          # DecapCMS admin interface
        ├── index.html  # CMS interface
        └── config.yml  # CMS configuration (GitHub backend)
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run generate` - Generate static site
- `npm run preview` - Preview production build

## Content Management

### Using Nuxt Content v3 Collections

Content is managed through type-safe collections defined in `content.config.ts`:

```typescript
export default defineContentConfig({
  collections: {
    articles: defineCollection({
      type: 'page',
      source: 'articles/**/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        author: z.string().optional(),
        date: z.string().optional(),
      })
    })
  }
})
```

Create Markdown files in the `content/` directory with validated frontmatter:

```markdown
---
title: My Article
description: Article description
author: Your Name
date: 2024-01-18
---

# Content goes here

Your markdown content...
```

### Using DecapCMS

1. Navigate to `/admin` in your browser
2. Log in with your GitHub account (OAuth required - see setup below)
3. Create, edit, and manage content through the visual interface

## Configuration

### Nuxt 4

Configure Nuxt 4 compatibility in `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  future: {
    compatibilityVersion: 4
  },
  modules: ['@nuxt/content'],
  content: {
    highlight: {
      theme: 'github-dark'
    }
  },
  nitro: {
    prerender: {
      routes: ['/'],
      ignore: ['/articles', '/tutorials', '/admin']
    }
  }
})
```

### Nuxt Content Collections

Define type-safe collections in `content.config.ts`:

```typescript
import { defineContentConfig, defineCollection, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    articles: defineCollection({
      type: 'page',
      source: 'articles/**/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        author: z.string().optional(),
        date: z.string().optional(),
      })
    })
  }
})
```

### DecapCMS with GitHub OAuth

Configure GitHub backend in `public/admin/config.yml`:

```yaml
backend:
  name: github
  repo: michael-collins/learning-materials-decapcms
  branch: main

collections:
  - name: "articles"
    label: "Articles"
    folder: "content/articles"
    create: true
    fields:
      - {label: "Title", name: "title", widget: "string"}
      - {label: "Description", name: "description", widget: "string"}
      - {label: "Author", name: "author", widget: "string", required: false}
      - {label: "Date", name: "date", widget: "date", required: false}
      - {label: "Body", name: "body", widget: "markdown"}
```

## Deployment

### Static Site Generation

Generate a static site:

```bash
npm run generate
```

Deploy the `.output/public` directory to any static hosting service:
- Netlify
- Vercel
- GitHub Pages
- Cloudflare Pages

### Server-Side Rendering

Build for SSR:

```bash
npm run build
```

Deploy the `.output` directory to a Node.js hosting service.

## GitHub OAuth Setup for DecapCMS

This project uses GitHub OAuth for authentication. Follow these steps:

### 1. Create GitHub OAuth App

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: Learning Materials CMS
   - **Homepage URL**: `https://your-site.netlify.app`
   - **Authorization callback URL**: `https://api.netlify.com/auth/done`
4. Save the Client ID and Client Secret

### 2. Configure Netlify

1. In your Netlify site settings, go to **Access control** → **OAuth**
2. Click **Install provider**
3. Select **GitHub**
4. Enter your Client ID and Client Secret
5. Save the configuration

### 3. Deploy and Test

1. Push 4](https://nuxt.com/) - Vue.js framework (v4.2.2)
- [Nuxt Content v3](https://content.nuxt.com/) - Content management with SQL-powered collections (v3.11.0)
- [DecapCMS](https://decapcms.org/) - Content editor (v3.3.3)
- [Vue 3](https://vuejs.org/) - JavaScript framework (v3.5.13)
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Zod](https://zod.dev/) - Schema validation for collections
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - SQL database for content storage

### Local Development

For local development with DecapCMS:

```bash
# Install Decap server
npm install -g decap-server

# Run the local backend
npx decap-server

# In another terminal, run your dev server
npm run dev
```

Then update `public/admin/config.yml` temporarily:
```yaml
local_backend: true
```

## UI Design

### Theme System

The project uses the **Twitter theme** from [shadcnthemer.com](https://shadcnthemer.com) with OKLCH color space for vibrant, perceptually uniform colors.

**Light Mode:**
- Clean white background with vibrant blue primary (oklch(0.6723 0.1606 244.9955))
- Subtle muted backgrounds for code and secondary content

**Dark Mode:**
- Pure black background (oklch(0 0 0))
- Adjusted primary colors for optimal dark mode contrast
- Theme-aware prose styling with proper text visibility

### Layout Features

- **Collapsible Sidebar**: Full-width sidebar (w-64) that collapses completely (w-0) with smooth transitions
- **External Toggle**: PanelLeft icon button positioned in the header (not inside sidebar)
- **Sticky Header**: Backdrop blur effect with breadcrumb navigation
- **Breadcrumb Navigation**: Automatically generated from route path (e.g., Home > Articles > Article Title)
- **Theme Toggle**: Sun/Moon icons in footer for seamless theme switching

### Component Library

Uses **shadcn-vue** components built on **radix-vue** primitives for accessibility:
- Button with multiple variants (default, ghost, outline, etc.)
- Breadcrumb with separators and semantic HTML
- All components theme-aware with CSS custom properties

## Technologies Used

- [Nuxt 4](https://nuxt.com/) - Vue.js framework (v4.2.2)
- [Nuxt Content v3](https://content.nuxt.com/) - Content management with SQL-powered collections (v3.11.0)
- [DecapCMS](https://decapcms.org/) - Content editor (v3.3.3)
- [Vue 3](https://vuejs.org/) - JavaScript framework (v3.5.13)
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS v4](https://tailwindcss.com/) - Utility-first CSS framework with OKLCH colors
- [shadcn-vue](https://www.shadcn-vue.com/) - Re-usable component library
- [radix-vue](https://www.radix-vue.com/) - Headless UI primitives
- [lucide-vue-next](https://lucide.dev/) - Icon library
- [@vueuse/core](https://vueuse.org/) - Vue composition utilities (theme management)
- [Zod](https://zod.dev/) - Schema validation for collections
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - SQL database for content storage

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for your own learning materials platform.

## Support

## Key Differences from Nuxt 3

This project uses **Nuxt 4** and **Nuxt Content v3**, which introduce several improvements:

### Nuxt Content v3 Changes
- **Collections API**: Content is now organized into type-safe collections with Zod validation
- **SQL Storage**: Content is stored in a SQL database (better-sqlite3) for improved performance
- **New Query API**: Use `queryCollection()` instead of `queryContent()` for defined collections
- **Type Safety**: Full TypeScript support with auto-generated types from collections
- **Better Performance**: Smaller bundle sizes and faster queries

### Migration Notes
- Old: `queryContent('articles').find()` 
- New: `queryCollection('articles').all()`
- Collections must be defined in `content.config.ts`
- `ContentDoc` component replaced with direct collection queries

---

Built with ❤️ using Nuxt 4, Nuxt Content v3, and shadcn-vue