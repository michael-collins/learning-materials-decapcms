# Implementation Plan: Pathways & Specializations Hierarchy

## Current State Assessment

- ✅ Basic pathway and specialization content files exist
- ✅ Basic routing structure in place (`[...slug].vue` and `index.vue`)
- ✅ OER Schema builder infrastructure exists
- ✅ Decap CMS configured for other content types
- ⚠️ Missing: CMS configurations for pathways/specializations
- ⚠️ Missing: Lesson structure and content
- ⚠️ Missing: Relationship management between hierarchy levels
- ⚠️ Missing: OER Schema builders for pathways/specializations/lessons

## Hierarchy Structure

```
Pathways 
  └─> Specializations (oer:InstructionalPattern)
        └─> Lessons (oer:LearningComponent)
              ├─> Lectures (oer:SupportingMaterial)
              ├─> Topics (oer:ReferencedMaterial) [future implementation]
              ├─> Exercises (oer:Practice + oer:Assessment)
              ├─> Quizzes (oer:Assessment) [future implementation]
              └─> Projects (oer:Assessment)
```

---

## Phase 1: Data Structure & Schema Design *(Priority: High)*

### 1.1 Content Type Definitions

#### Pathway Schema (`content/pathways/*.md`)

```yaml
---
title: string
slug: string
type: 'oer:Course'
description: text
difficulty: select (Beginner/Intermediate/Advanced)
estimatedDuration: string (e.g., "12 weeks")
specializations: list (relation to specializations)
learningObjectives: list
prerequisites: list (optional)
tags: list
author: string
published: boolean
allowEmbed: boolean
image: image (optional)
license: select
aiLicense: select (multiple)
---
```

#### Specialization Schema (`content/specializations/*.md`)

```yaml
---
title: string
slug: string
type: 'oer:InstructionalPattern'
pathway: string (relation to parent pathway)
description: text
difficulty: select
estimatedDuration: string (e.g., "8 weeks")
targetRole: string (e.g., "3D Modeler", "Animator")
whoItsFor: text
lessons: list (ordered lesson slugs/IDs)
learningObjectives: list
skills: list
tools: list (software/hardware)
prerequisites: list (optional)
tags: list
author: string
published: boolean
image: image (optional)
license: select
aiLicense: select (multiple)
---
```

#### Lesson Schema (`content/lessons/*.md`) - *New Collection*

```yaml
---
title: string
slug: string
type: 'oer:LearningComponent'
specialization: string (relation to parent specialization)
order: number (sequence in specialization)
description: text
estimatedDuration: string (e.g., "3 hours")
learningObjectives: list
lectures: list (relations)
exercises: list (relations)
projects: list (relations)
topics: list (relations) # future
quizzes: list (relations) # future
prerequisites: list (optional)
tags: list
author: string
published: boolean
license: select
aiLicense: select (multiple)
---
```

### 1.2 OER Schema Type Mappings

| Content Type | OER Schema Type | Purpose |
|--------------|----------------|---------|
| Pathway | `oer:Course` | Top-level learning pathway |
| Specialization | `oer:InstructionalPattern` | Structured learning track |
| Lesson | `oer:LearningComponent` | Individual learning unit |
| Lecture | `oer:SupportingMaterial` | Instructional content |
| Exercise | `oer:Practice` + `oer:Assessment` | Practice activities |
| Project | `oer:Assessment` | Comprehensive assessments |
| Topic | `oer:ReferencedMaterial` | Reference materials (future) |
| Quiz | `oer:Assessment` | Quick assessments (future) |

---

## Phase 2: Decap CMS Configuration *(Priority: High)*

### 2.1 Add Pathway Collection

Add to `public/admin/config.yml`:

```yaml
- name: "pathways"
  label: "Pathways"
  folder: "content/pathways"
  create: true
  slug: "{{slug}}"
  view_filters:
    - label: "Published"
      field: published
      pattern: true
    - label: "Unpublished"
      field: published
      pattern: false
  fields:
    - {label: "Title", name: "title", widget: "string"}
    - {label: "Slug", name: "slug", widget: "string"}
    - {label: "Type", name: "type", widget: "hidden", default: "oer:Course"}
    - {label: "Description", name: "description", widget: "text"}
    - {label: "Difficulty", name: "difficulty", widget: "select", options: ["Beginner", "Intermediate", "Advanced"]}
    - {label: "Estimated Duration", name: "estimatedDuration", widget: "string", hint: "e.g., '12 weeks', '6 months'"}
    - label: "Specializations"
      name: "specializations"
      widget: "list"
      required: false
      hint: "Select specializations in order"
      fields:
        - {label: "Specialization", name: "slug", widget: "relation", collection: "specializations", value_field: "slug", search_fields: ["title"], display_fields: ["title"]}
        - {label: "Order", name: "order", widget: "number", default: 1}
    - label: "Learning Objectives"
      name: "learningObjectives"
      widget: "list"
      required: false
      field: {label: "Objective", name: "objective", widget: "text"}
    - {label: "Prerequisites", name: "prerequisites", widget: "list", required: false}
    - {label: "Tags", name: "tags", widget: "list", required: false}
    - {label: "Featured Image", name: "image", widget: "image", required: false}
    - {label: "Author", name: "author", widget: "string"}
    - {label: "Published", name: "published", widget: "boolean", default: true}
    - {label: "Allow Embedding", name: "allowEmbed", widget: "boolean", default: true}
    - {label: "License", name: "license", widget: "select", required: false, options: ["CC BY 4.0", "CC BY-SA 4.0", "CC BY-NC 4.0", "CC BY-NC-SA 4.0", "CC BY-ND 4.0", "CC BY-NC-ND 4.0", "CC0 1.0", "All Rights Reserved"]}
    - {label: "AI Usage Licenses", name: "aiLicense", widget: "select", required: false, multiple: true, options: [AIUL options...]}
    - {label: "Body", name: "body", widget: "markdown"}
```

### 2.2 Add/Update Specialization Collection

Update existing specialization CMS config to include:
- `pathway` relation field
- `lessons` ordered list
- `targetRole` field
- `skills` and `tools` lists

### 2.3 Add Lesson Collection (New)

Complete CMS configuration for the new lessons collection with all fields defined in 1.1.

---

## Phase 3: OER Schema Builders *(Priority: High)*

### 3.1 Add Functions to `lib/oer-schema-builder.ts`

**Functions to create:**

#### `buildPathwaySchema(doc, baseUrl)`
Returns Course schema with:
- `@type`: "Course"
- `hasPart`: Array of specialization URIs
- `teaches`: Learning objectives
- `timeRequired`: Estimated duration
- Full schema.org Course properties

#### `buildSpecializationSchema(doc, baseUrl)`
Returns InstructionalPattern schema with:
- `@type`: "oer:InstructionalPattern"
- `isPartOf`: Parent pathway URI
- `hasPart`: Array of lesson URIs
- `educationalRole`: Target role
- `teaches`: Learning objectives
- Skills and tools metadata

#### `buildLessonSchema(doc, baseUrl)`
Returns LearningComponent schema with:
- `@type`: "oer:LearningComponent"
- `componentType`: "Unit" or "Lesson"
- `isPartOf`: Parent specialization URI
- `hasPart`: Array of content item URIs (lectures, exercises, projects)
- `position`: Order in specialization

#### Update existing functions
- `buildPracticeSchema()` - Add `isPartOf` to link back to parent lesson
- `buildAssessmentSchema()` - Add `isPartOf` to link back to parent lesson
- `buildSupportingMaterialSchema()` - Create for lectures, add `isPartOf`

**Schema relationships to implement:**
```
Pathway (Course)
  └─ hasPart → Specializations
       └─ hasPart → Lessons
            └─ hasPart → [Lectures, Exercises, Projects]
                  └─ isPartOf → Lesson
```

---

## Phase 4: Component Development *(Priority: Medium)*

### 4.1 Create New Components

#### `components/PathwayCard.vue`
**Props:** pathway object
**Features:**
- Display pathway title, description, difficulty
- Show specializations count
- Show estimated duration
- Progress bar (if tracking enabled)
- Featured image
- Link to pathway detail page
- Tags display

#### `components/SpecializationCard.vue`
**Props:** specialization object
**Features:**
- Display specialization title, description
- Show target role badge
- Show lessons count
- Show difficulty level
- Featured image
- Link to specialization detail page
- Parent pathway breadcrumb

#### `components/LessonCard.vue`
**Props:** lesson object
**Features:**
- Display lesson title, description
- Show content counts (lectures, exercises, projects)
- Show estimated duration
- Progress indicator (completed/in-progress/locked)
- Order number badge
- Link to lesson detail page

#### `components/LearningHierarchyBreadcrumb.vue`
**Props:** pathway, specialization, lesson, content (all optional)
**Features:**
- Dynamic breadcrumb based on provided props
- Clickable navigation to each level
- Current page highlighted
- Format: Home > Pathways > [Pathway] > [Specialization] > [Lesson] > [Content]

#### `components/ContentTypeList.vue`
**Props:** content items array, type
**Features:**
- Group content by type (lectures, exercises, projects)
- Collapsible sections
- Filter by difficulty, tags
- Sort by title, date, order
- Status indicators (if tracking)
- Grid or list view toggle

### 4.2 Update Existing Components

#### `components/CollectionListing.vue`
Add support for:
- Hierarchical display mode
- Nested content filtering
- Parent pathway/specialization context display
- Breadcrumb integration

---

## Phase 5: Page & Routing Structure *(Priority: High)*

### 5.1 Pathway Pages

#### `pages/pathways/index.vue`
**Purpose:** Browse all pathways
**Features:**
- Grid/list of PathwayCard components
- Filter by difficulty, tags, duration
- Search functionality
- Sort by name, difficulty, date
- Hero section with description
- Stats: total pathways, specializations, lessons

#### `pages/pathways/[slug].vue`
**Purpose:** Pathway detail page
**Features:**
- Full pathway description
- Learning objectives list
- Prerequisites (if any)
- Specializations grid (ordered)
- Estimated total duration
- Tags and metadata
- Related pathways
- OER Schema JSON-LD
- Embed support
- Breadcrumb: Home > Pathways > [Pathway Name]

### 5.2 Specialization Pages

#### `pages/specializations/index.vue`
**Purpose:** Browse all specializations
**Features:**
- Grid of SpecializationCard components
- Filter by pathway, role, difficulty
- Search functionality
- Group by pathway (toggle)
- Stats display

#### `pages/specializations/[slug].vue`
**Purpose:** Specialization detail page
**Features:**
- Full specialization description
- "Who it's for" section
- Target role badge
- Learning objectives
- Skills and tools lists
- Lessons list (ordered with LessonCard)
- Link to parent pathway
- Prerequisites
- Related specializations
- OER Schema JSON-LD
- Breadcrumb: Home > Pathways > [Pathway] > [Specialization]

### 5.3 Lesson Pages (New)

#### `pages/lessons/index.vue`
**Purpose:** Browse all lessons (optional - may be less useful)
**Features:**
- List of all lessons
- Filter by specialization, difficulty
- Search functionality

#### `pages/lessons/[slug].vue`
**Purpose:** Lesson detail page
**Features:**
- Lesson overview and objectives
- Estimated duration
- Prerequisites
- **Grouped content sections:**
  - 📚 **Lectures** (SupportingMaterial) - Instructional videos/text
  - 💪 **Exercises** (Practice) - Hands-on activities
  - 🎯 **Projects** (Assessment) - Comprehensive assessments
  - 📖 **Topics** (future) - Reference materials
  - 📝 **Quizzes** (future) - Quick assessments
- Each section collapsible with content cards
- Progress tracking (if enabled)
- Next/previous lesson navigation
- Parent specialization info
- OER Schema JSON-LD
- Breadcrumb: Home > Pathways > [Pathway] > [Specialization] > [Lesson]

### 5.4 Content Item Updates

Update existing pages to show parent lesson context:

#### `pages/exercises/[slug].vue`
- Add "Part of lesson" section with link
- Add lesson breadcrumb
- Show related exercises from same lesson
- Navigation: Previous/Next in lesson

#### `pages/projects/[slug].vue`
- Add "Part of lesson" section with link
- Add lesson breadcrumb
- Show related projects from same lesson

#### `pages/lectures/[slug].vue`
- Add "Part of lesson" section with link
- Add lesson breadcrumb
- Show related lectures from same lesson

**Breadcrumb format:** Home > Pathways > [Pathway] > [Specialization] > [Lesson] > [Content Item]

---

## Phase 6: Data Queries & Relationships *(Priority: High)*

### 6.1 Query Composables

#### Create `composables/usePathways.ts`

```typescript
export function usePathways() {
  const getPathway = async (slug: string) => {
    const pathway = await queryContent('pathways')
      .where({ slug })
      .findOne()
    
    // Fetch related specializations
    if (pathway.specializations) {
      const specSlugs = pathway.specializations.map(s => s.slug)
      pathway.specializationsData = await queryContent('specializations')
        .where({ slug: { $in: specSlugs } })
        .find()
    }
    
    return pathway
  }
  
  const getPathwayWithProgress = async (slug: string, userId?: string) => {
    const pathway = await getPathway(slug)
    
    // If user tracking enabled, calculate completion
    if (userId) {
      // Calculate progress across all specializations/lessons
      pathway.progress = await calculatePathwayProgress(pathway, userId)
    }
    
    return pathway
  }
  
  const listPathways = async (filters?: {
    difficulty?: string
    tags?: string[]
    search?: string
    published?: boolean
  }) => {
    let query = queryContent('pathways')
    
    if (filters?.published !== undefined) {
      query = query.where({ published: filters.published })
    }
    
    if (filters?.difficulty) {
      query = query.where({ difficulty: filters.difficulty })
    }
    
    if (filters?.tags) {
      query = query.where({ tags: { $contains: filters.tags } })
    }
    
    if (filters?.search) {
      query = query.where({
        $or: [
          { title: { $contains: filters.search } },
          { description: { $contains: filters.search } }
        ]
      })
    }
    
    return await query.find()
  }
  
  return {
    getPathway,
    getPathwayWithProgress,
    listPathways
  }
}
```

#### Create `composables/useSpecializations.ts`

```typescript
export function useSpecializations() {
  const getSpecialization = async (slug: string) => {
    const spec = await queryContent('specializations')
      .where({ slug })
      .findOne()
    
    // Fetch related lessons
    if (spec.lessons) {
      const lessonSlugs = spec.lessons.map(l => l.slug || l)
      spec.lessonsData = await queryContent('lessons')
        .where({ slug: { $in: lessonSlugs } })
        .sort({ order: 1 })
        .find()
    }
    
    // Fetch parent pathway
    if (spec.pathway) {
      spec.pathwayData = await queryContent('pathways')
        .where({ slug: spec.pathway })
        .findOne()
    }
    
    return spec
  }
  
  const listSpecializations = async (filters?: {
    pathway?: string
    difficulty?: string
    targetRole?: string
    published?: boolean
  }) => {
    let query = queryContent('specializations')
    
    if (filters?.pathway) {
      query = query.where({ pathway: filters.pathway })
    }
    
    if (filters?.difficulty) {
      query = query.where({ difficulty: filters.difficulty })
    }
    
    if (filters?.published !== undefined) {
      query = query.where({ published: filters.published })
    }
    
    return await query.find()
  }
  
  return {
    getSpecialization,
    listSpecializations
  }
}
```

#### Create `composables/useLessons.ts`

```typescript
export function useLessons() {
  const getLesson = async (slug: string) => {
    const lesson = await queryContent('lessons')
      .where({ slug })
      .findOne()
    
    // Fetch related content
    const contentPromises = []
    
    if (lesson.lectures) {
      contentPromises.push(
        queryContent('lectures')
          .where({ slug: { $in: lesson.lectures } })
          .find()
          .then(items => ({ type: 'lectures', items }))
      )
    }
    
    if (lesson.exercises) {
      contentPromises.push(
        queryContent('exercises')
          .where({ slug: { $in: lesson.exercises } })
          .find()
          .then(items => ({ type: 'exercises', items }))
      )
    }
    
    if (lesson.projects) {
      contentPromises.push(
        queryContent('projects')
          .where({ slug: { $in: lesson.projects } })
          .find()
          .then(items => ({ type: 'projects', items }))
      )
    }
    
    const contentResults = await Promise.all(contentPromises)
    
    lesson.content = {
      lectures: contentResults.find(r => r.type === 'lectures')?.items || [],
      exercises: contentResults.find(r => r.type === 'exercises')?.items || [],
      projects: contentResults.find(r => r.type === 'projects')?.items || []
    }
    
    // Fetch parent specialization
    if (lesson.specialization) {
      lesson.specializationData = await queryContent('specializations')
        .where({ slug: lesson.specialization })
        .findOne()
      
      // Fetch grandparent pathway
      if (lesson.specializationData?.pathway) {
        lesson.pathwayData = await queryContent('pathways')
          .where({ slug: lesson.specializationData.pathway })
          .findOne()
      }
    }
    
    return lesson
  }
  
  const listLessons = async (filters?: {
    specialization?: string
    published?: boolean
  }) => {
    let query = queryContent('lessons')
    
    if (filters?.specialization) {
      query = query.where({ specialization: filters.specialization })
    }
    
    if (filters?.published !== undefined) {
      query = query.where({ published: filters.published })
    }
    
    return await query.sort({ order: 1 }).find()
  }
  
  return {
    getLesson,
    listLessons
  }
}
```

### 6.2 Content Query Patterns

#### Fetch pathway with all nested data

```typescript
const route = useRoute()
const { getPathway } = usePathways()
const { listSpecializations } = useSpecializations()

const pathway = await getPathway(route.params.slug)

// Fetch all specializations for this pathway
const specializations = await listSpecializations({ 
  pathway: pathway.slug,
  published: true 
})

// For each specialization, fetch lessons
for (const spec of specializations) {
  spec.lessons = await queryContent('lessons')
    .where({ specialization: spec.slug, published: true })
    .sort({ order: 1 })
    .find()
  
  // Calculate content counts
  spec.lessonCount = spec.lessons.length
  spec.totalExercises = spec.lessons.reduce((sum, l) => 
    sum + (l.exercises?.length || 0), 0
  )
}
```

#### Get content with parent context

```typescript
const { getLesson } = useLessons()

const exercise = await queryContent('exercises')
  .where({ slug: route.params.slug })
  .findOne()

// Get parent lesson context
if (exercise.lesson) {
  const lesson = await getLesson(exercise.lesson)
  
  // Now have full hierarchy: pathway > specialization > lesson > exercise
  const breadcrumbs = [
    { label: 'Home', path: '/' },
    { label: 'Pathways', path: '/pathways' },
    { label: lesson.pathwayData.title, path: `/pathways/${lesson.pathwayData.slug}` },
    { label: lesson.specializationData.title, path: `/specializations/${lesson.specializationData.slug}` },
    { label: lesson.title, path: `/lessons/${lesson.slug}` },
    { label: exercise.title, path: `/exercises/${exercise.slug}` }
  ]
}
```

---

## Phase 7: Navigation & User Flow *(Priority: Medium)*

### 7.1 Update Main Navigation

Add to `components/Footer.vue` or create main navigation component:

```vue
<nav>
  <ul>
    <li><NuxtLink to="/">Home</NuxtLink></li>
    <li><NuxtLink to="/pathways">Learning Pathways</NuxtLink></li>
    <li>
      <details>
        <summary>Browse Content</summary>
        <ul>
          <li><NuxtLink to="/specializations">Specializations</NuxtLink></li>
          <li><NuxtLink to="/exercises">Exercises</NuxtLink></li>
          <li><NuxtLink to="/projects">Projects</NuxtLink></li>
          <li><NuxtLink to="/tutorials">Tutorials</NuxtLink></li>
          <li><NuxtLink to="/articles">Articles</NuxtLink></li>
        </ul>
      </details>
    </li>
  </ul>
</nav>
```

### 7.2 Implement "Next/Previous" Navigation

Within lesson detail pages, provide:

```vue
<template>
  <div class="lesson-navigation">
    <button @click="navigateToPrevious" :disabled="!previousLesson">
      ← Previous Lesson
    </button>
    
    <NuxtLink :to="`/specializations/${specialization.slug}`">
      ↑ Back to Specialization
    </NuxtLink>
    
    <button @click="navigateToNext" :disabled="!nextLesson">
      Next Lesson →
    </button>
  </div>
</template>
```

Within content pages (exercises, etc.), provide:

```vue
<div class="content-navigation">
  <NuxtLink :to="`/lessons/${lesson.slug}`">
    ↑ Back to Lesson
  </NuxtLink>
  
  <div class="horizontal-nav">
    <NuxtLink v-if="previousContent" :to="previousContent.path">
      ← Previous: {{ previousContent.title }}
    </NuxtLink>
    
    <NuxtLink v-if="nextContent" :to="nextContent.path">
      Next: {{ nextContent.title }} →
    </NuxtLink>
  </div>
</div>
```

### 7.3 Related Content Suggestions

At bottom of content pages:

```vue
<section class="related-content">
  <h2>Continue Learning</h2>
  
  <div v-if="lesson?.content">
    <h3>Other exercises in this lesson</h3>
    <div class="content-grid">
      <ContentCard 
        v-for="exercise in lesson.content.exercises.filter(e => e.slug !== currentSlug)"
        :key="exercise.slug"
        :item="exercise"
      />
    </div>
  </div>
  
  <div v-if="relatedSpecializations">
    <h3>Related Specializations</h3>
    <div class="content-grid">
      <SpecializationCard
        v-for="spec in relatedSpecializations"
        :key="spec.slug"
        :specialization="spec"
      />
    </div>
  </div>
</section>
```

---

## Phase 8: Content Migration & Seeding *(Priority: Medium)*

### 8.1 Update Existing Content

#### Update pathway files

Script: `scripts/update-pathways.js`

```javascript
// For each pathway:
// 1. Add specializations array with slugs and order
// 2. Format learning objectives
// 3. Add metadata (difficulty, duration, etc.)
```

**Example updated pathway:**

```yaml
---
title: Motion Graphics
slug: motion-graphics
type: 'oer:Course'
description: Create engaging motion graphics and animations
difficulty: Intermediate
estimatedDuration: 16 weeks
specializations:
  - slug: motion-graphics
    order: 1
  - slug: vj-loops
    order: 2
learningObjectives:
  - Master keyframe animation principles
  - Create professional motion graphics
  - Understand timing and easing
tags:
  - Animation
  - After Effects
  - Motion Graphics
author: Michael Collins
published: true
allowEmbed: true
license: CC BY-SA 4.0
aiLicense:
  - AIUL-WA
  - AIUL-NA-3D
---
```

#### Update specialization files

Script: `scripts/update-specializations.js`

```javascript
// For each specialization:
// 1. Add pathway reference
// 2. Create lessons array (initially empty)
// 3. Add targetRole, skills, tools
// 4. Format existing content
```

#### Create lesson files

Script: `scripts/create-lessons-from-content.js`

Strategy:
1. Analyze existing exercises/lectures/projects by tags, themes
2. Group related content into logical learning units
3. Create lesson files with appropriate metadata
4. Link content items to lessons

```javascript
// Pseudo-code:
const exercises = await loadAllExercises()
const lectures = await loadAllLectures()
const projects = await loadAllProjects()

// Group by topic/theme
const lessonGroups = groupContentByTheme([exercises, lectures, projects])

// Create lesson files
for (const group of lessonGroups) {
  const lesson = {
    title: group.title,
    slug: slugify(group.title),
    type: 'oer:LearningComponent',
    specialization: inferSpecialization(group.content),
    order: group.order,
    description: generateDescription(group.content),
    learningObjectives: extractObjectives(group.content),
    lectures: group.content.filter(c => c.type === 'lecture').map(c => c.slug),
    exercises: group.content.filter(c => c.type === 'exercise').map(c => c.slug),
    projects: group.content.filter(c => c.type === 'project').map(c => c.slug)
  }
  
  await createLessonFile(lesson)
}
```

### 8.2 Link Existing Content to Lessons

Script: `scripts/link-content-to-lessons.js`

```javascript
const lessons = await loadAllLessons()

// Update exercises
for (const lesson of lessons) {
  if (lesson.exercises) {
    for (const exerciseSlug of lesson.exercises) {
      await updateExercise(exerciseSlug, {
        lesson: lesson.slug,
        specialization: lesson.specialization
      })
    }
  }
  
  // Same for lectures and projects
  if (lesson.lectures) {
    for (const lectureSlug of lesson.lectures) {
      await updateLecture(lectureSlug, {
        lesson: lesson.slug,
        specialization: lesson.specialization
      })
    }
  }
  
  if (lesson.projects) {
    for (const projectSlug of lesson.projects) {
      await updateProject(projectSlug, {
        lesson: lesson.slug,
        specialization: lesson.specialization
      })
    }
  }
}
```

**Update exercise frontmatter:**

```yaml
# Add to existing exercises:
lesson: string (lesson slug)
specialization: string (specialization slug)
lessonOrder: number (optional, for ordering within lesson)
```

---

## Phase 9: Testing & Validation *(Priority: Medium)*

### 9.1 Schema Validation

**Tools:**
- https://validator.schema.org/
- https://search.google.com/test/rich-results
- Google Search Console

**Test cases:**
1. Validate pathway Course schema
2. Validate specialization InstructionalPattern schema
3. Validate lesson LearningComponent schema
4. Validate exercise Practice schema with lesson relationship
5. Validate project Assessment schema with lesson relationship
6. Verify `hasPart` and `isPartOf` relationships
7. Check all required schema.org properties

**Script:** `scripts/validate-oer-schemas.js`

```javascript
import { validateSchema } from 'schema-validator'

const pathways = await loadAllPathways()

for (const pathway of pathways) {
  const schema = buildPathwaySchema(pathway)
  const validation = await validateSchema(schema, 'Course')
  
  if (!validation.valid) {
    console.error(`Invalid schema for ${pathway.slug}:`, validation.errors)
  }
}
```

### 9.2 Navigation Testing

**Test scenarios:**

1. **Top-down navigation:**
   - Pathways index → Pathway detail → Specialization detail → Lesson detail → Content item
   
2. **Bottom-up navigation:**
   - Content item → Lesson → Specialization → Pathway
   
3. **Breadcrumb navigation:**
   - Click each breadcrumb level
   - Verify correct landing pages
   
4. **Next/Previous navigation:**
   - Navigate through all lessons in order
   - Navigate through all content in a lesson
   - Verify first/last items disable appropriate buttons
   
5. **Filtering and search:**
   - Filter pathways by difficulty
   - Search for specific content
   - Filter specializations by pathway
   
6. **Embed mode:**
   - Test content items in embed mode
   - Verify breadcrumbs work in embed context

### 9.3 CMS Testing

**Test in Decap CMS:**

1. **Create test pathway:**
   - Fill all fields
   - Add specializations with ordering
   - Save and publish
   - Verify appears on pathways index
   
2. **Create test specialization:**
   - Link to test pathway
   - Add lessons
   - Fill target role, skills, tools
   - Verify relation widget works
   
3. **Create test lesson:**
   - Link to test specialization
   - Add lectures, exercises, projects using relation widget
   - Set order number
   - Verify appears in specialization
   
4. **Link existing content:**
   - Edit existing exercise
   - Set lesson field
   - Verify appears in lesson detail page
   
5. **Test editorial workflow:**
   - Create draft pathway
   - Move to "In Review"
   - Approve and publish
   - Verify Git commits and branch management

---

## Phase 10: Future Enhancements *(Priority: Low)*

### 10.1 User Progress Tracking

**Requirements:**
- User authentication (Netlify Identity, Auth0, etc.)
- Database for progress storage (Supabase, Firebase, etc.)
- Client-side progress state management

**Features:**
- Mark content as completed
- Track time spent on each item
- Calculate pathway/specialization completion percentage
- Display progress bars and badges
- Resume from last position
- Certificate generation upon completion

**Implementation:**

```typescript
// composables/useProgress.ts
export function useProgress() {
  const user = useUser() // Auth composable
  
  const markComplete = async (contentType: string, slug: string) => {
    await $fetch('/api/progress', {
      method: 'POST',
      body: { userId: user.value.id, contentType, slug, completed: true }
    })
  }
  
  const getProgress = async (type: 'pathway' | 'specialization' | 'lesson', slug: string) => {
    const progress = await $fetch(`/api/progress/${type}/${slug}`, {
      params: { userId: user.value.id }
    })
    
    return {
      completed: progress.completedItems,
      total: progress.totalItems,
      percentage: (progress.completedItems / progress.totalItems) * 100
    }
  }
  
  return { markComplete, getProgress }
}
```

### 10.2 Topics Collection (Reference Materials)

**Purpose:** Standalone reference materials that can be linked to multiple lessons

**Schema:**

```yaml
---
title: string
slug: string
type: 'oer:ReferencedMaterial'
description: text
category: select (Theory, Glossary, Tutorial, Tool Guide)
tags: list
relatedLessons: list (relations)
author: string
published: boolean
license: select
---
```

**OER Schema:**

```typescript
export function buildTopicSchema(doc: ParsedContent, baseUrl: string) {
  return {
    '@context': 'https://oerschema.org/',
    '@type': 'oer:ReferencedMaterial',
    '@id': `${baseUrl}/topics/${doc.slug}`,
    'name': doc.title,
    'description': doc.description,
    'materialType': doc.category,
    'isPartOf': doc.relatedLessons?.map(lesson => 
      `${baseUrl}/lessons/${lesson}`
    ),
    // ... additional properties
  }
}
```

### 10.3 Quizzes Collection

**Purpose:** Quick knowledge checks within lessons

**Schema:**

```yaml
---
title: string
slug: string
type: 'oer:Assessment'
lesson: string (relation)
timeLimit: number (minutes, optional)
passingScore: number (percentage)
questions: list
  - question: text
    type: select (multiple-choice, true-false, short-answer)
    options: list (for multiple-choice)
    correctAnswer: string
    explanation: text (shown after answer)
    points: number
author: string
published: boolean
---
```

**Components:**

```vue
<!-- components/QuizComponent.vue -->
<template>
  <div class="quiz">
    <h2>{{ quiz.title }}</h2>
    <div v-for="(q, idx) in quiz.questions" :key="idx" class="question">
      <p>{{ q.question }}</p>
      
      <!-- Multiple choice -->
      <div v-if="q.type === 'multiple-choice'">
        <label v-for="option in q.options" :key="option">
          <input 
            type="radio" 
            :name="`q${idx}`" 
            :value="option"
            v-model="answers[idx]"
          />
          {{ option }}
        </label>
      </div>
      
      <!-- True/False -->
      <div v-if="q.type === 'true-false'">
        <label><input type="radio" :name="`q${idx}`" value="true" v-model="answers[idx]" /> True</label>
        <label><input type="radio" :name="`q${idx}`" value="false" v-model="answers[idx]" /> False</label>
      </div>
      
      <!-- Short answer -->
      <textarea v-if="q.type === 'short-answer'" v-model="answers[idx]"></textarea>
      
      <!-- Show explanation after answer -->
      <div v-if="submitted && q.explanation" class="explanation">
        {{ q.explanation }}
      </div>
    </div>
    
    <button @click="submitQuiz">Submit Quiz</button>
    
    <div v-if="submitted" class="results">
      <h3>Results: {{ score }}%</h3>
      <p v-if="score >= quiz.passingScore">Passed! ✓</p>
      <p v-else>Not passed. Try again!</p>
    </div>
  </div>
</template>
```

### 10.4 Dynamic Pathways

**Purpose:** Allow users to create custom learning paths based on their goals

**Features:**
- Goal selection wizard (e.g., "I want to become a 3D modeler")
- Skill assessment quiz to determine starting point
- Automatic pathway generation based on prerequisites
- Lock content until prerequisites completed
- Adaptive difficulty adjustment
- Personalized recommendations

**Implementation:**

```typescript
// composables/useDynamicPathway.ts
export function useDynamicPathway() {
  const generatePathway = async (goal: string, currentSkills: string[]) => {
    // Analyze goal and skills
    const targetRole = await inferTargetRole(goal)
    const specialization = await findSpecialization(targetRole)
    const lessons = await getLessonsForSpecialization(specialization.slug)
    
    // Filter lessons based on current skills
    const recommendedLessons = lessons.filter(lesson => {
      const prereqs = lesson.prerequisites || []
      return prereqs.every(p => currentSkills.includes(p))
    })
    
    // Sort by optimal learning path
    const orderedLessons = await optimizeLearningPath(recommendedLessons, currentSkills)
    
    return {
      title: `Custom Pathway: ${goal}`,
      specialization,
      lessons: orderedLessons,
      estimatedDuration: calculateTotalDuration(orderedLessons)
    }
  }
  
  const checkPrerequisites = (lesson: any, completedContent: string[]) => {
    if (!lesson.prerequisites) return true
    return lesson.prerequisites.every(p => completedContent.includes(p))
  }
  
  return { generatePathway, checkPrerequisites }
}
```

### 10.5 Analytics & Insights

**Purpose:** Understand usage patterns and improve content

**Metrics to track:**
- Popular pathways and specializations
- Completion rates by content type
- Average time spent per lesson
- Drop-off points
- Search queries
- User feedback ratings

**Dashboard features:**
- Real-time analytics
- Content performance reports
- User engagement metrics
- Completion funnels
- Heatmaps of user navigation

**Implementation:**

```typescript
// Server API: server/api/analytics/[...path].ts
export default defineEventHandler(async (event) => {
  const { path } = event.context.params
  
  switch (path) {
    case 'popular':
      return await getPopularContent()
    case 'completion':
      return await getCompletionRates()
    case 'time-spent':
      return await getTimeSpentMetrics()
  }
})

// Client tracking
export function useAnalytics() {
  const trackView = (type: string, slug: string) => {
    $fetch('/api/analytics/track', {
      method: 'POST',
      body: { event: 'view', type, slug, timestamp: Date.now() }
    })
  }
  
  const trackCompletion = (type: string, slug: string, duration: number) => {
    $fetch('/api/analytics/track', {
      method: 'POST',
      body: { event: 'completion', type, slug, duration, timestamp: Date.now() }
    })
  }
  
  return { trackView, trackCompletion }
}
```

---

## Implementation Timeline

### Week 1-2: Foundation
- ✅ Phase 1: Data structure design
- ✅ Phase 2: CMS configuration (pathways, specializations, lessons)
- 🔨 Phase 3: OER Schema builders

### Week 3-4: Core Features
- 🔨 Phase 4: Component development (cards, breadcrumbs, lists)
- 🔨 Phase 5: Page & routing structure (all detail and index pages)
- 🔨 Phase 6: Data queries (composables and query patterns)

### Week 5-6: Integration
- 🔨 Phase 7: Navigation & user flow (breadcrumbs, next/prev, related)
- 🔨 Phase 8: Content migration (update existing, create lessons, link content)
- 🔨 Phase 9: Testing & validation (schema, navigation, CMS)

### Week 7+: Enhancement
- ⏳ Phase 10: Future features (as needed, by priority)

**Legend:**
- ✅ Completed
- 🔨 In Progress
- ⏳ Planned

---

## Key Technical Decisions

1. **Relationship Storage**: Use slug-based references (not IDs) for simplicity and portability
2. **Ordering**: Store explicit `order` field in relationships for proper sequencing
3. **Bidirectional Links**: Content items reference parents, parents reference children (improves querying)
4. **Flat vs Nested**: Use flat file structure (`content/lessons/*.md`) rather than nested folders (easier CMS management)
5. **Schema Generation**: Build schemas dynamically from content queries rather than storing in frontmatter (single source of truth)
6. **Nullable Relations**: All parent references are optional to allow standalone content
7. **Published Flag**: Respect published status at all hierarchy levels
8. **Embed Support**: Enable embedding at pathway level, propagate to children

---

## Quick Start Checklist

### Phase 2: CMS Configuration
- [ ] Update `public/admin/config.yml` with pathway collection
- [ ] Update `public/admin/config.yml` with enhanced specialization collection
- [ ] Add `public/admin/config.yml` lesson collection (new)
- [ ] Test relation widgets in Decap CMS

### Phase 3: OER Schema Builders
- [ ] Create `buildPathwaySchema()` in `lib/oer-schema-builder.ts`
- [ ] Create `buildSpecializationSchema()` in `lib/oer-schema-builder.ts`
- [ ] Create `buildLessonSchema()` in `lib/oer-schema-builder.ts`
- [ ] Update `buildPracticeSchema()` to add `isPartOf` relationship
- [ ] Create `buildSupportingMaterialSchema()` for lectures
- [ ] Validate all schemas at validator.schema.org

### Phase 4: Components
- [ ] Create `components/PathwayCard.vue`
- [ ] Create `components/SpecializationCard.vue`
- [ ] Create `components/LessonCard.vue`
- [ ] Create `components/LearningHierarchyBreadcrumb.vue`
- [ ] Create `components/ContentTypeList.vue`
- [ ] Update `components/CollectionListing.vue` for hierarchy

### Phase 5: Pages & Routing
- [ ] Update `pages/pathways/index.vue`
- [ ] Update `pages/pathways/[slug].vue` to fetch specializations
- [ ] Update `pages/specializations/index.vue`
- [ ] Update `pages/specializations/[slug].vue` to fetch lessons
- [ ] Create `pages/lessons/index.vue`
- [ ] Create `pages/lessons/[slug].vue` with grouped content
- [ ] Update `pages/exercises/[slug].vue` with parent context
- [ ] Update `pages/projects/[slug].vue` with parent context
- [ ] Update `pages/lectures/[slug].vue` with parent context (if exists)

### Phase 6: Data Queries
- [ ] Create `composables/usePathways.ts`
- [ ] Create `composables/useSpecializations.ts`
- [ ] Create `composables/useLessons.ts`
- [ ] Test all query patterns

### Phase 7: Navigation
- [ ] Update main navigation with pathways link
- [ ] Implement breadcrumb component throughout
- [ ] Add next/previous navigation in lessons
- [ ] Add related content sections

### Phase 8: Content Migration
- [ ] Create `content/lessons/` directory
- [ ] Run `scripts/create-lessons-from-content.js`
- [ ] Run `scripts/update-pathways.js`
- [ ] Run `scripts/update-specializations.js`
- [ ] Run `scripts/link-content-to-lessons.js`
- [ ] Manually review and adjust lesson groupings

### Phase 9: Testing
- [ ] Validate all OER schemas
- [ ] Test full hierarchy navigation
- [ ] Test breadcrumb navigation
- [ ] Test CMS workflows (create, edit, publish)
- [ ] Test embed mode
- [ ] Cross-browser testing

---

## Notes

- **OER Schema Documentation**: https://oerschema.org/
- **Schema.org Validator**: https://validator.schema.org/
- **Nuxt Content Queries**: https://content.nuxt.com/usage/querying
- **Decap CMS Relations**: https://decapcms.org/docs/widgets/#relation

## Related Documentation

- [OER_SCHEMA_IMPLEMENTATION.md](./OER_SCHEMA_IMPLEMENTATION.md) - Existing OER schema patterns
- [NAVIGATION_AND_COMPONENTS.md](./NAVIGATION_AND_COMPONENTS.md) - Navigation structure
- [AIUL_IMPLEMENTATION.md](./AIUL_IMPLEMENTATION.md) - AI usage licensing

---

**Last Updated**: January 23, 2026
**Status**: Planning Phase
**Next Actions**: Begin Phase 2 (CMS Configuration)
