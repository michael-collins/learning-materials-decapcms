---
title: "Understanding Nuxt Content"
description: "Discover how to use Nuxt Content to manage your Markdown-based content in a Nuxt application."
author: "Learning Materials Team"
date: 2024-01-18
---

# Understanding Nuxt Content

Nuxt Content is a file-based CMS that reads the `content/` directory in your project and parses `.md`, `.yml`, `.csv` and `.json` files to create a powerful data layer for your application.

## Why Use Nuxt Content?

- **Write in Markdown**: Focus on your content with Markdown syntax
- **Query API**: Use a MongoDB-like API to fetch your content
- **Syntax highlighting**: Built-in code syntax highlighting
- **Hot reload**: See changes instantly in development

## Basic Usage

### Creating Content

Simply create a Markdown file in the `content/` directory:

```markdown
---
title: My Article
description: A great article
---

# My Article

This is my article content.
```

### Querying Content

In your Vue components, use the `queryContent` composable:

```vue
<script setup>
const { data: articles } = await useAsyncData('articles', () => 
  queryContent('/articles').find()
)
</script>
```

## Content Features

### Front Matter

Define metadata for your content:

```yaml
---
title: Article Title
date: 2024-01-18
author: John Doe
tags: [nuxt, content]
---
```

### Code Blocks

Nuxt Content supports syntax highlighting for many languages:

```javascript
export default {
  name: 'MyComponent',
  data() {
    return {
      message: 'Hello World'
    }
  }
}
```

### Components in Markdown

You can use Vue components directly in your Markdown files!

## Learn More

Check out the [Nuxt Content documentation](https://content.nuxt.com) for advanced features and configuration options.
