# Learning Materials - Nuxt 3 + DecapCMS

A modern learning materials platform built with **Nuxt 3** (latest stable version), **Nuxt Content**, and **DecapCMS**.

> **Note**: This project uses Nuxt 3.14.159, which represents the latest stable release of Nuxt. Nuxt 4 is currently in development.

## Features

- 🚀 **Nuxt 3** - The latest stable version of the intuitive Vue framework
- 📝 **Nuxt Content** - File-based content management with Markdown support
- ✨ **DecapCMS** - User-friendly CMS interface for content editing
- 🎨 **Modern UI** - Clean, responsive design
- 📚 **Content Collections** - Articles and Tutorials with different fields
- 🔍 **Syntax Highlighting** - Beautiful code blocks in content
- 🎯 **Type-safe** - Built with TypeScript support

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
├── nuxt.config.ts         # Nuxt configuration
├── package.json           # Project dependencies
├── pages/                 # Application pages
│   ├── index.vue         # Home page
│   ├── articles/         # Articles pages
│   │   ├── index.vue    # Articles list
│   │   └── [...slug].vue # Individual article
│   └── tutorials/        # Tutorials pages
│       ├── index.vue    # Tutorials list
│       └── [...slug].vue # Individual tutorial
├── content/              # Content files (Markdown)
│   ├── articles/        # Article content
│   └── tutorials/       # Tutorial content
└── public/              # Static assets
    └── admin/          # DecapCMS admin interface
        ├── index.html  # CMS interface
        └── config.yml  # CMS configuration
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run generate` - Generate static site
- `npm run preview` - Preview production build

## Content Management

### Using Nuxt Content

Create Markdown files in the `content/` directory:

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
2. Log in with your credentials (requires backend setup)
3. Create, edit, and manage content through the visual interface

## Configuration

### Nuxt Content

Configure Nuxt Content in `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ['@nuxt/content'],
  content: {
    highlight: {
      theme: 'github-dark'
    }
  }
})
```

### DecapCMS

Configure collections in `public/admin/config.yml`:

```yaml
collections:
  - name: "articles"
    label: "Articles"
    folder: "content/articles"
    create: true
    fields:
      - {label: "Title", name: "title", widget: "string"}
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

## Backend Setup for DecapCMS

For production use, you need to configure a backend:

1. **Netlify Identity** (Recommended for Netlify deployments)
   - Enable Netlify Identity in your site settings
   - Enable Git Gateway

2. **GitHub Backend**
   ```yaml
   backend:
     name: github
     repo: your-username/your-repo
     branch: main
   ```

3. **Local Development**
   ```yaml
   local_backend: true
   ```
   Then run: `npx decap-server`

## Technologies Used

- [Nuxt 3](https://nuxt.com/) - Vue.js framework (v3.14.159)
- [Nuxt Content](https://content.nuxt.com/) - Content management
- [DecapCMS](https://decapcms.org/) - Content editor
- [Vue 3](https://vuejs.org/) - JavaScript framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for your own learning materials platform.

## Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ using Nuxt 3 and DecapCMS