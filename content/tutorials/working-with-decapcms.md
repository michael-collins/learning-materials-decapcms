---
title: "Working with DecapCMS"
description: "Learn how to integrate and use DecapCMS for content management in your Nuxt application."
author: "Learning Materials Team"
date: 2024-01-17
difficulty: "Intermediate"
---

# Working with DecapCMS

DecapCMS (formerly Netlify CMS) is an open-source content management system that works with Git-based workflows. This tutorial shows you how to integrate it with Nuxt.

## What is DecapCMS?

DecapCMS is a Git-based CMS that:

- Stores content in your Git repository
- Provides a user-friendly admin interface
- Works with any static site generator
- Supports real-time previews

## Installation

### Step 1: Install DecapCMS

Add DecapCMS to your project:

```bash
npm install decap-cms-app
```

### Step 2: Create Admin Interface

Create the admin interface files in `public/admin/`:

**`public/admin/index.html`:**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Content Manager</title>
</head>
<body>
  <script src="https://unpkg.com/decap-cms@^3.3.3/dist/decap-cms.js"></script>
</body>
</html>
```

### Step 3: Configure Collections

Create `public/admin/config.yml`:

```yaml
backend:
  name: git-gateway
  branch: main

media_folder: "public/images/uploads"
public_folder: "/images/uploads"

collections:
  - name: "blog"
    label: "Blog"
    folder: "content/blog"
    create: true
    fields:
      - {label: "Title", name: "title", widget: "string"}
      - {label: "Date", name: "date", widget: "datetime"}
      - {label: "Body", name: "body", widget: "markdown"}
```

## Configuration Options

### Backend Options

DecapCMS supports multiple backends:

- **git-gateway**: For Netlify Identity
- **github**: Direct GitHub integration
- **gitlab**: GitLab integration
- **bitbucket**: Bitbucket integration

### Widget Types

Available widget types for fields:

- `string`: Single-line text
- `text`: Multi-line text
- `markdown`: Rich text editor
- `datetime`: Date and time picker
- `select`: Dropdown selection
- `image`: Image upload
- `file`: File upload
- `boolean`: Toggle switch

## Using DecapCMS

### Accessing the Admin Panel

Navigate to `/admin` in your application to access the CMS interface.

### Creating Content

1. Log in to the admin panel
2. Select a collection (e.g., "Blog")
3. Click "New Blog"
4. Fill in the fields
5. Save or publish

### Content Workflow

DecapCMS supports editorial workflows:

- **Draft**: Work in progress
- **In Review**: Ready for review
- **Ready**: Approved for publishing

Enable it in your config:

```yaml
publish_mode: editorial_workflow
```

## Integration with Nuxt Content

Your content created in DecapCMS is automatically available in Nuxt Content!

Query it like any other content:

```vue
<script setup>
const { data: posts } = await useAsyncData('blog', () => 
  queryContent('/blog').sort({ date: -1 }).find()
)
</script>
```

## Best Practices

1. **Version Control**: Commit your config.yml to version control
2. **Media Files**: Use appropriate media folder paths
3. **Field Validation**: Add validation rules to fields
4. **Previews**: Configure preview templates for better editing experience
5. **Backups**: Your content is in Git - always backed up!

## Advanced Features

### Custom Widgets

Create custom field widgets for specialized content types.

### Custom Previews

Build custom preview templates that match your site's design.

### Internationalization

Support multiple languages with DecapCMS i18n features.

## Troubleshooting

Common issues and solutions:

- **Login issues**: Check backend configuration
- **Content not appearing**: Verify folder paths match
- **Upload problems**: Check media folder permissions

## Resources

- [DecapCMS Documentation](https://decapcms.org/docs/)
- [Configuration Reference](https://decapcms.org/docs/configuration-options/)
- [Widget Reference](https://decapcms.org/docs/widgets/)

Happy content managing!
