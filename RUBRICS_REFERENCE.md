# Rubrics Reference

## Overview

Assessment rubrics are migrated as data files and referenced by content. This document explains how rubrics work in the migrated system.

## Rubrics Data Structure

Location: `/content/data/rubrics.json`

### Available Rubric Types

1. **exercise** - For practice activities (formative assessment)
2. **project** - For larger assignments (summative assessment)
3. **task** - For simple completeness checks
4. **written-statement** - For written work assessment

### Rubric Structure

Each rubric contains:
```json
{
  "id": "recviCCqLwU1SAn2Z",
  "slug": "exercise",
  "name": "Exercise",
  "description": "An exercise assessment type is formative...",
  "criteria": [
    {
      "id": "recDvB7XFqiTA9AX6",
      "name": "Steps completed",
      "description": "This criteria assess whether..."
    },
    // More criteria...
  ]
}
```

## How Content References Rubrics

### In Content Frontmatter

Exercises and projects include a `rubric` field:

```yaml
---
title: Animated Procedural Textures
rubric: exercise  # References the rubric by slug
---
```

### Common Rubric Assignments

- **Exercises**: `rubric: "exercise"`
- **Projects**: `rubric: "project"`
- **Simple Tasks**: `rubric: "task"`
- **Written Work**: `rubric: "written-statement"`

## Using Rubrics in Your Application

### Option 1: Display Rubric Information

Create a component to display rubric criteria on assessment pages:

```vue
<script setup>
const { data: rubrics } = await useAsyncData('rubrics', () => 
  queryContent('/data/rubrics').findOne()
)

const props = defineProps({
  rubricSlug: String
})

const rubric = computed(() => 
  rubrics.value?.find(r => r.slug === props.rubricSlug)
)
</script>

<template>
  <div v-if="rubric" class="rubric">
    <h3>{{ rubric.name }}</h3>
    <p>{{ rubric.description }}</p>
    
    <h4>Grading Criteria:</h4>
    <ul>
      <li v-for="criterion in rubric.criteria" :key="criterion.id">
        <strong>{{ criterion.name }}</strong>
        <p>{{ criterion.description }}</p>
      </li>
    </ul>
  </div>
</template>
```

### Option 2: Query Rubric Data

```javascript
// Load all rubrics
const rubrics = await queryContent('/data/rubrics').findOne()

// Find a specific rubric
const exerciseRubric = rubrics.find(r => r.slug === 'exercise')

// Get rubric for current content
const rubric = rubrics.find(r => r.slug === content.rubric)
```

### Option 3: Create a Rubrics Collection (Future Enhancement)

You could create a DecapCMS collection to manage rubrics:

```yaml
# In config.yml
- name: "rubrics"
  label: "Assessment Rubrics"
  folder: "content/rubrics"
  create: true
  fields:
    - {label: "Name", name: "name", widget: "string"}
    - {label: "Slug", name: "slug", widget: "string"}
    - {label: "Description", name: "description", widget: "text"}
    - label: "Criteria"
      name: "criteria"
      widget: "list"
      fields:
        - {label: "Name", name: "name", widget: "string"}
        - {label: "Description", name: "description", widget: "text"}
```

## Example Rubrics

### Exercise Rubric
- **Steps completed** - Did you complete all parts?
- **Attention to detail** - Proper naming, formats, deadlines?
- **On time** - Submitted by deadline?

### Project Rubric
- **Concept development** - Creative/critical thinking?
- **Technical mastery** - Tool proficiency and technical skills?
- **Steps completed** - All requirements met?

### Task Rubric
- **On time** - Submitted on time?
- **Steps completed** - Task completed?

### Written Statement Rubric
- **Articulation** - Clear communication of ideas?
- (Additional criteria as defined)

## Migration Notes

✅ **What's Included:**
- All 4 rubric definitions from source repository
- Complete criteria descriptions for each rubric
- Original Airtable record IDs preserved

✅ **How It Works:**
- Rubrics stored as JSON data file
- Content references rubrics by slug
- Rubric definitions remain separate from content

⚠️ **Future Considerations:**
- Create UI component to display rubrics on assessment pages
- Consider making rubrics editable via DecapCMS
- Add rubric selection to other content types if needed
- Create student-facing rubric display components

## Accessing Rubrics Data

### In a Nuxt Page/Component

```vue
<script setup lang="ts">
const { data: rubricsData } = await useAsyncData('rubrics', () => 
  queryContent('data/rubrics').findOne()
)

// Access specific rubric
const exerciseRubric = computed(() => 
  rubricsData.value?.find((r: any) => r.slug === 'exercise')
)
</script>
```

### In Server Routes

```typescript
// server/api/rubrics.ts
export default defineEventHandler(async (event) => {
  const rubrics = await $fetch('/content/data/rubrics.json')
  return rubrics
})
```

## Summary

- 📋 Rubrics are reference data, not editable content (currently)
- 🔗 Content links to rubrics via `rubric: "slug"` field
- 💾 All rubric data migrated to `/content/data/rubrics.json`
- 🎨 You'll need to create display components to show rubrics
- 🔮 Future: Consider creating a rubrics collection in DecapCMS

---

**Related Files:**
- Rubrics data: `/content/data/rubrics.json`
- Example content: Any exercise or project markdown file
- DecapCMS config: `/public/admin/config.yml`
