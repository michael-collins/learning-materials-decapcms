# OER Schema Implementation Analysis

## Overview

This document analyzes how to properly implement [OER Schema (oerschema.org)](https://oerschema.org/) markup in the learning materials DecapCMS system, specifically focusing on semantic markup for educational content sections like learning objectives.

## Current State

### What We Already Have

1. **Frontmatter Metadata (JSON-LD)**
   - Specializations, Pathways, and Lectures already include OER Schema JSON-LD in frontmatter
   - Example from specializations:
   ```yaml
   oer:
     {
       "@context": "https://oerschema.org/",
       "@type": "LearningComponent",
       "name": "3D Illustration",
       "componentType": "Unit",
       "teaches": [
         "objective example"
       ],
       "hasPart": [],
       "duration": "PT8W",
       "educationalLevel": "Beginner",
       "inLanguage": "en-US",
       "license": "https://creativecommons.org/licenses/by-nc-sa/4.0/"
     }
   ```

2. **Type Field**
   - Exercises: `type: 'oer:Practice'`
   - Projects: `type: 'oer:Assessment'`
   - Specializations: `type: 'oer:LearningComponent'`
   - Pathways: `type: 'oer:Course'`
   - Lectures: `type: 'oer:SupportingMaterial'`

3. **Markdown Content Sections**
   - Learning Objectives sections in exercises (plain markdown)
   - Instructions sections
   - Tutorial videos embedded with custom components

### What's Missing

Currently, **content sections** (like Learning Objectives) are written in plain markdown without OER Schema markup. The schema data exists only in the frontmatter, not wrapping the actual HTML content.

## OER Schema Structure

### Key Classes

1. **Practice** (Exercises)
   - Properties: `material`, `hasLearningObjective`, `doTask`, `hasComponent`
   - Should contain structured learning objectives

2. **Assessment** (Projects)
   - Similar to Practice but for graded assessments
   - Properties include grading format

3. **LearningObjective**
   - Expected outcomes or skills gained
   - Properties: `forCourse`, `forComponent`, `coursePrerequisites`
   - Should be marked up as structured data

4. **LearningComponent** (Specializations)
   - Properties: `teaches` (array of learning objectives), `hasPart`, `hasLearningObjective`

## Implementation Approaches

### Approach 1: JSON-LD in Page Head (Recommended)

**How it works:**
- Keep existing frontmatter structure
- Add a component that outputs JSON-LD script tag in the page `<head>`
- Provides machine-readable metadata without affecting visual presentation
- Follows schema.org best practices

**Pros:**
- ✅ Non-invasive to current content structure
- ✅ Works with existing markdown content
- ✅ Standard approach used by Google, Schema.org
- ✅ Easy to maintain and migrate
- ✅ Separates semantic markup from presentation

**Cons:**
- ❌ Doesn't wrap actual content sections with semantic HTML

**Implementation:**
```vue
<!-- components/OERSchemaScript.vue -->
<script setup lang="ts">
interface Props {
  schemaData: any
}

const props = defineProps<Props>()

const jsonLd = computed(() => {
  return JSON.stringify(props.schemaData, null, 2)
})
</script>

<template>
  <script type="application/ld+json" v-html="jsonLd"></script>
</template>
```

Usage in exercise page:
```vue
<template>
  <div>
    <OERSchemaScript :schema-data="oerSchema" />
    <!-- rest of content -->
  </div>
</template>

<script setup>
const oerSchema = computed(() => ({
  "@context": "https://oerschema.org/",
  "@type": "oer:Practice",
  "name": doc.value.title,
  "hasLearningObjective": doc.value.learningObjectives?.map(obj => ({
    "@type": "oer:LearningObjective",
    "description": obj
  }))
}))
</script>
```

### Approach 2: Custom Markdown Components with Semantic HTML

**How it works:**
- Create custom markdown components that wrap sections
- Output semantic HTML with `itemscope`, `itemtype`, `itemprop` (Microdata)
- Or use RDFa attributes

**Pros:**
- ✅ Semantic HTML directly in the DOM
- ✅ Visible to crawlers that don't parse JSON-LD
- ✅ Structured content sections

**Cons:**
- ❌ Requires rewriting existing content
- ❌ More complex to author in DecapCMS
- ❌ Harder to maintain
- ❌ Less familiar authoring experience

**Implementation:**
```vue
<!-- components/content/LearningObjectives.vue -->
<template>
  <div itemscope itemtype="https://oerschema.org/LearningObjective">
    <h2>Learning Objectives</h2>
    <slot />
  </div>
</template>
```

Usage in markdown:
```markdown
::learning-objectives
1. Become familiarized with adding nodes
2. Practice rendering image sequences
::
```

### Approach 3: DecapCMS Editor Component (Structured Fields)

**How it works:**
- Move Learning Objectives from markdown body to frontmatter
- Create structured field in DecapCMS config
- Render as both structured data AND formatted HTML

**Pros:**
- ✅ Enforces structure at authoring time
- ✅ Easy to query and extract objectives
- ✅ Can generate both JSON-LD and semantic HTML
- ✅ Better for machine processing

**Cons:**
- ❌ Requires content restructuring
- ❌ Less flexible than freeform markdown
- ❌ Migration work for existing content

**DecapCMS Config:**
```yaml
fields:
  - name: learningObjectives
    label: Learning Objectives
    widget: list
    field:
      name: objective
      label: Objective
      widget: string
```

**Component Rendering:**
```vue
<div class="learning-objectives">
  <h2>Learning Objectives</h2>
  <ol>
    <li v-for="(obj, idx) in learningObjectives" :key="idx" 
        itemprop="hasLearningObjective" 
        itemscope 
        itemtype="https://oerschema.org/LearningObjective">
      <span itemprop="description">{{ obj }}</span>
    </li>
  </ol>
</div>
```

### Approach 4: Hybrid Approach (Best of Both Worlds)

**How it works:**
- Add `learningObjectives` as structured field in frontmatter (optional)
- If provided, use for JSON-LD generation
- Still allow markdown sections for formatting flexibility
- Component generates JSON-LD from either source

**Pros:**
- ✅ Backwards compatible with existing content
- ✅ Enables structured data extraction
- ✅ Flexible authoring
- ✅ Gradual migration path

**Cons:**
- ❌ Two sources of truth (frontmatter vs markdown)
- ❌ Slightly more complex logic

## Recommendation

**Use Approach 1 (JSON-LD in Head) + Approach 4 (Hybrid) combined:**

1. **Short Term (Now)**
   - Create `OERSchemaScript.vue` component
   - Parse existing markdown "Learning Objectives" sections
   - Generate JSON-LD from parsed content
   - Inject into page head

2. **Medium Term (After Migration)**
   - Add optional `learningObjectives` array to DecapCMS config
   - Update component to prefer structured data if available
   - Migrate content gradually

3. **Long Term (Future Enhancement)**
   - Consider semantic HTML with Microdata/RDFa for better HTML5 support
   - Create custom markdown components if needed

## Implementation Plan

### Phase 1: JSON-LD Generation (Minimal Changes)

1. **Create OERSchemaScript Component**
   ```
   components/OERSchemaScript.vue
   ```

2. **Update Collection Pages**
   - Exercises: Extract learning objectives from markdown, generate JSON-LD
   - Projects: Similar to exercises
   - Specializations: Use existing `oer` frontmatter
   - Pathways: Use existing `oer` frontmatter

3. **Extract Learning Objectives from Markdown**
   ```javascript
   function extractLearningObjectives(markdown) {
     const match = markdown.match(/## Learning Objectives\n\n([\s\S]*?)(?=\n##|$)/);
     if (!match) return [];
     
     const listText = match[1];
     const objectives = listText
       .split('\n')
       .filter(line => line.match(/^\d+\./))
       .map(line => line.replace(/^\d+\.\s*/, '').trim());
     
     return objectives;
   }
   ```

4. **Generate Schema Data**
   ```javascript
   const oerSchema = computed(() => {
     const objectives = extractLearningObjectives(doc.value.body);
     
     return {
       "@context": "https://oerschema.org/",
       "@type": doc.value.type || "oer:Practice",
       "name": doc.value.title,
       "description": doc.value.description,
       "author": {
         "@type": "Person",
         "name": doc.value.author,
         "url": doc.value.authorUrl
       },
       "educationalLevel": doc.value.difficulty,
       "license": getLicenseUrl(doc.value.license),
       "inLanguage": "en-US",
       "hasLearningObjective": objectives.map(obj => ({
         "@type": "oer:LearningObjective",
         "description": obj
       })),
       ...(doc.value.rubric && {
         "usesRubric": {
           "@type": "oer:Rubric",
           "identifier": doc.value.rubric
         }
       })
     };
   });
   ```

### Phase 2: Structured Fields (Optional Enhancement)

1. **Update DecapCMS Config** (exercises, projects):
   ```yaml
   - name: learningObjectives
     label: Learning Objectives
     widget: list
     required: false
     field:
       name: objective
       label: Objective
       widget: string
   ```

2. **Update Component Logic**:
   ```javascript
   const objectives = computed(() => {
     // Prefer structured data
     if (doc.value.learningObjectives?.length) {
       return doc.value.learningObjectives;
     }
     // Fallback to markdown parsing
     return extractLearningObjectives(doc.value.body);
   });
   ```

### Phase 3: Enhanced Components (Future)

1. Create custom markdown components:
   - `::learning-objectives` - Semantic wrapper
   - `::instructions` - Task wrapper with `oer:Task`
   - `::rubric-display` - Display rubric with schema markup

2. Add Microdata/RDFa attributes to rendered HTML

## Content Structure Examples

### Current (Exercises)
```markdown
## Learning Objectives

1. Become familiarized with adding nodes to procedurally generate moving textures on 3D geometry.
2. Practice rendering image sequences and producing video files capable to be streamed online.

## Instructions

1. Watch the tutorials.
2. Create and set a project folder called `LASTNAME-animated-procedural-textures`
```

### With JSON-LD (No content changes needed)
```vue
<head>
  <script type="application/ld+json">
  {
    "@context": "https://oerschema.org/",
    "@type": "oer:Practice",
    "name": "Animated procedural textures",
    "hasLearningObjective": [
      {
        "@type": "oer:LearningObjective",
        "description": "Become familiarized with adding nodes..."
      },
      {
        "@type": "oer:LearningObjective",  
        "description": "Practice rendering image sequences..."
      }
    ]
  }
  </script>
</head>
```

### With Structured Fields (Future)
```yaml
---
title: Animated procedural textures
learningObjectives:
  - Become familiarized with adding nodes to procedurally generate moving textures on 3D geometry
  - Practice rendering image sequences and producing video files capable to be streamed online
---
```

## Schema Validation

### Tools
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Schema.org Validator](https://validator.schema.org/)
- [OER Schema Validator](https://oerschema.org/validator) (if available)

### Testing Plan
1. Generate JSON-LD for sample exercise
2. Validate with Google Rich Results Test
3. Check for OER Schema compliance
4. Verify all required properties present

## Benefits of OER Schema Implementation

1. **Discoverability**: Learning resources can be found by OER search engines
2. **Interoperability**: Content can be imported/exported to other OER systems
3. **Metadata Standards**: Follows educational metadata best practices
4. **Machine Readable**: Enables automated processing and analytics
5. **SEO**: Better search engine understanding of educational content
6. **LMS Integration**: Easier integration with learning management systems

## Comprehensive Content Mapping

Based on OER Schema components page and actual content structure, here are all sections that can be semantically marked up:

### Exercises Content Structure

```markdown
# Title (already in frontmatter as Practice type)
Description paragraph
## Tutorial Video → oer:SupportingMaterial (video tutorial)
## Learning Objectives → hasLearningObjective array
## Instructions → doTask with step-by-step instructions
## Grading Rubric → usesRubric reference
```

**Mapped to OER Schema:**
```json
{
  "@context": "https://oerschema.org/",
  "@type": "oer:Practice",
  "name": "Animated procedural textures",
  "description": "...",
  "author": {...},
  "license": "...",
  "educationalLevel": "Intermediate",
  "inLanguage": "en-US",
  
  "hasLearningObjective": [
    {
      "@type": "oer:LearningObjective",
      "description": "Become familiarized with adding nodes..."
    },
    {
      "@type": "oer:LearningObjective",
      "description": "Practice rendering image sequences..."
    }
  ],
  
  "material": {
    "@type": "oer:SupportingMaterial",
    "materialType": "Video Tutorial",
    "encodingFormat": "video/youtube",
    "contentUrl": "https://youtube.com/embed/videoseries?list=..."
  },
  
  "doTask": {
    "@type": "Task",
    "name": "Instructions",
    "actionType": ["Making", "Observing"],
    "steps": [
      "Watch the tutorials",
      "Create and set a project folder...",
      ...
    ]
  },
  
  "usesRubric": {
    "@type": "oer:Rubric",
    "identifier": "exercise"
  }
}
```

### Projects Content Structure

```markdown
# Title (Assessment type)
Description
## Learning Objectives → hasLearningObjective
## Requirements → mainContent
## Project Theme → about/forTopic
## Project Format → deliveryFormat
## Constraints → aiUsageConstraint/requirements
## Instructions
  ### Pre-production → doTask (multi-step)
  ### Production → doTask
  ### Finish Production → doTask
## Grading Rubric → usesRubric
```

**Mapped to OER Schema:**
```json
{
  "@context": "https://oerschema.org/",
  "@type": "oer:Assessment",
  "name": "Ideas In Motion",
  "assessmentType": "Project",
  
  "hasLearningObjective": [...],
  
  "doTask": [
    {
      "@type": "Task",
      "name": "Pre-production",
      "taskType": "Concept Development",
      "actionType": ["Researching", "Making"],
      "steps": [...]
    },
    {
      "@type": "Task",
      "name": "Production",
      "taskType": "3D Scene Layouts",
      "actionType": ["Making", "Observing"],
      "steps": [...]
    },
    {
      "@type": "Task",
      "name": "Finish Production",
      "taskType": "Post-production",
      "actionType": ["Writing", "Presenting"],
      "steps": [...]
    }
  ],
  
  "timeRequired": "PT30S",
  "about": "30 second animation solving for project theme",
  "deliveryFormat": ["Narrative short film", "Motion graphics", ...],
  
  "usesRubric": {
    "@type": "oer:Rubric",
    "identifier": "project"
  }
}
```

### Specializations (Already Has OER Schema)

Already contains complete JSON-LD structure in frontmatter:
- `@type: LearningComponent`
- `componentType: Unit`
- `teaches: [...]` - learning objectives
- `hasPart: []` - component relationships
- All metadata complete

### ActionType Mapping

OER Schema defines ActionType for describing what students do:
- **Making** - Creating/constructing (modeling, rendering, animation)
- **Observing** - Watching tutorials, examining examples
- **Writing** - Statements, reflections, documentation
- **Reading** - Reading instructions, requirements
- **Researching** - Concept development, finding references
- **Listening** - Audio materials
- **Presenting** - Sharing work, critiques
- **Reflecting** - Critical reflection on work
- **Assess** - Self-assessment

## Implementation Strategy

### Phase 1: Core Schema Infrastructure

Create composable utilities and components:

1. **Markdown Parsing Utilities** (`lib/oer-schema-utils.ts`)
   ```typescript
   export function extractLearningObjectives(markdown: string)
   export function extractInstructions(markdown: string)
   export function extractYouTubePlaylist(markdown: string)
   export function parseTaskSteps(instructionsMarkdown: string)
   export function inferActionTypes(taskContent: string)
   ```

2. **Schema Builder** (`lib/oer-schema-builder.ts`)
   ```typescript
   export function buildPracticeSchema(doc, parsedContent)
   export function buildAssessmentSchema(doc, parsedContent)
   export function buildLearningObjectives(objectives)
   export function buildSupportingMaterial(videoData)
   export function buildTaskSchema(taskData)
   ```

3. **Schema Component** (`components/OERSchemaScript.vue`)
   - Accepts schema object
   - Outputs JSON-LD script tag
   - Validates schema structure

### Phase 2: Content-Specific Implementations

1. **Exercises** (`pages/exercises/[...slug].vue`)
   - Parse: Learning Objectives, Tutorial Video, Instructions
   - Build: Practice schema with objectives, material, doTask
   - Output: JSON-LD in head

2. **Projects** (`pages/projects/[...slug].vue`)
   - Parse: Learning Objectives, Requirements, Instructions sections
   - Build: Assessment schema with multiple doTask objects
   - Infer: ActionTypes from instruction content
   - Output: JSON-LD in head

3. **Specializations** (`pages/specializations/[...slug].vue`)
   - Use: Existing `oer` frontmatter object
   - Enhance: Add URL, image metadata
   - Output: JSON-LD in head

4. **Pathways** (`pages/pathways/[...slug].vue`)
   - Use: Existing `oer` frontmatter object
   - Output: Course schema in head

### Phase 3: Advanced Features

1. **ActionType Inference**
   - Scan instruction text for keywords
   - "watch" → Observing
   - "create", "model", "render" → Making
   - "write" → Writing
   - "research", "find" → Researching

2. **Duration Calculation**
   - Parse time requirements from text
   - Convert to ISO 8601 duration format
   - "30 seconds" → "PT30S"
   - "8 weeks" → "PT8W"

3. **Rubric Integration**
   - Query rubric collection by slug
   - Include full rubric schema in assessment
   - Map criteria to RubricCriterion objects

4. **Enhanced Metadata**
   - Tags → keywords
   - Difficulty → educationalLevel
   - Author → Person schema
   - Image → ImageObject schema

## Detailed Implementation Plan

### Step 1: Create OER Schema Utilities

Create `lib/oer-schema-utils.ts`:
```typescript
/**
 * Extract Learning Objectives section from markdown
 */
export function extractLearningObjectives(markdown: string): string[] {
  const match = markdown.match(/## Learning Objectives\n\n([\s\S]*?)(?=\n##|$)/);
  if (!match) return [];
  
  return match[1]
    .split('\n')
    .filter(line => line.match(/^\d+\./))
    .map(line => line.replace(/^\d+\.\s*/, '').trim());
}

/**
 * Extract Instructions section
 */
export function extractInstructions(markdown: string): string[] {
  const match = markdown.match(/## Instructions\n\n([\s\S]*?)(?=\n##|$)/);
  if (!match) return [];
  
  return match[1]
    .split('\n')
    .filter(line => line.match(/^\d+\./))
    .map(line => line.replace(/^\d+\.\s*/, '').trim());
}

/**
 * Extract YouTube playlist ID from iframe component
 */
export function extractYouTubePlaylist(markdown: string): string | null {
  const match = markdown.match(/::iframe-component[\s\S]*?src:\s*https:\/\/youtube\.com\/embed\/videoseries\?list=([\w-]+)/);
  return match ? match[1] : null;
}

/**
 * Parse hierarchical instructions (with sub-steps)
 */
export function parseTaskSteps(markdown: string): any[] {
  const lines = markdown.split('\n');
  const steps: any[] = [];
  let currentStep: any = null;
  
  for (const line of lines) {
    // Main step (1., 2., etc.)
    const mainMatch = line.match(/^(\d+)\.\s+\*\*(.+?)\*\*/);
    if (mainMatch) {
      if (currentStep) steps.push(currentStep);
      currentStep = {
        order: parseInt(mainMatch[1]),
        name: mainMatch[2],
        substeps: []
      };
      continue;
    }
    
    // Sub-step with bullet
    const subMatch = line.match(/^\s+[-*]\s+(.+)/);
    if (subMatch && currentStep) {
      currentStep.substeps.push(subMatch[1]);
    }
  }
  
  if (currentStep) steps.push(currentStep);
  return steps;
}

/**
 * Infer ActionTypes from content
 */
export function inferActionTypes(content: string): string[] {
  const types: Set<string> = new Set();
  const lower = content.toLowerCase();
  
  if (lower.match(/watch|view|observe|examine/)) types.add('Observing');
  if (lower.match(/create|model|render|build|animate|design/)) types.add('Making');
  if (lower.match(/write|document/)) types.add('Writing');
  if (lower.match(/read|review/)) types.add('Reading');
  if (lower.match(/research|investigate|find|explore/)) types.add('Researching');
  if (lower.match(/present|share|upload|submit/)) types.add('Presenting');
  if (lower.match(/reflect|consider|think/)) types.add('Reflecting');
  
  return Array.from(types);
}

/**
 * Get license URL
 */
export function getLicenseUrl(license: string): string {
  const map: Record<string, string> = {
    'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
    'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
    'CC BY-NC 4.0': 'https://creativecommons.org/licenses/by-nc/4.0/',
    'CC BY-NC-SA 4.0': 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  };
  return map[license] || license;
}
```

### Step 2: Create Schema Builders

Create `lib/oer-schema-builder.ts`:
```typescript
import type { ParsedContent } from '@nuxt/content';
import { 
  extractLearningObjectives, 
  extractInstructions,
  extractYouTubePlaylist,
  inferActionTypes,
  getLicenseUrl 
} from './oer-schema-utils';

export interface OERSchema {
  '@context': string;
  '@type': string;
  [key: string]: any;
}

export function buildPracticeSchema(doc: ParsedContent): OERSchema {
  const objectives = extractLearningObjectives(doc.body);
  const instructions = extractInstructions(doc.body);
  const playlistId = extractYouTubePlaylist(doc.body);
  
  const schema: OERSchema = {
    '@context': 'https://oerschema.org/',
    '@type': doc.type || 'oer:Practice',
    'name': doc.title,
    'description': doc.description || '',
    'url': `https://yourdomain.com/exercises/${doc.slug}`,
    'educationalLevel': doc.difficulty,
    'inLanguage': 'en-US',
  };
  
  // Author
  if (doc.author) {
    schema.author = {
      '@type': 'Person',
      'name': doc.author,
      ...(doc.authorUrl && { 'url': doc.authorUrl })
    };
  }
  
  // License
  if (doc.license) {
    schema.license = getLicenseUrl(doc.license);
  }
  
  // Learning Objectives
  if (objectives.length > 0) {
    schema.hasLearningObjective = objectives.map(obj => ({
      '@type': 'oer:LearningObjective',
      'description': obj
    }));
  }
  
  // Tutorial Video as Supporting Material
  if (playlistId) {
    schema.material = {
      '@type': 'oer:SupportingMaterial',
      'materialType': 'Video Tutorial',
      'encodingFormat': 'video/youtube',
      'contentUrl': `https://youtube.com/embed/videoseries?list=${playlistId}`
    };
  }
  
  // Instructions as Task
  if (instructions.length > 0) {
    const actionTypes = inferActionTypes(instructions.join(' '));
    schema.doTask = {
      '@type': 'Task',
      'name': 'Instructions',
      'steps': instructions,
      ...(actionTypes.length > 0 && { 'actionType': actionTypes })
    };
  }
  
  // Rubric
  if (doc.rubric) {
    schema.usesRubric = {
      '@type': 'oer:Rubric',
      'identifier': doc.rubric
    };
  }
  
  // Tags as keywords
  if (doc.tags && doc.tags.length > 0) {
    schema.keywords = doc.tags;
  }
  
  // Featured image
  if (doc.image) {
    schema.image = {
      '@type': 'ImageObject',
      'contentUrl': doc.image,
      ...(doc.imageAlt && { 'description': doc.imageAlt })
    };
  }
  
  return schema;
}

export function buildAssessmentSchema(doc: ParsedContent): OERSchema {
  // Similar to buildPracticeSchema but with Assessment type
  // Extract multiple instruction sections (pre-production, production, etc.)
  const schema = buildPracticeSchema(doc);
  schema['@type'] = 'oer:Assessment';
  schema.assessmentType = 'Project';
  
  return schema;
}

export function buildLearningComponentSchema(doc: ParsedContent): OERSchema {
  // Use existing oer object from frontmatter
  if (doc.oer) {
    return {
      ...doc.oer,
      // Add any missing fields
      'url': `https://yourdomain.com/specializations/${doc.slug}`,
      ...(doc.image && {
        'image': {
          '@type': 'ImageObject',
          'contentUrl': doc.image
        }
      })
    };
  }
  
  return {
    '@context': 'https://oerschema.org/',
    '@type': 'oer:LearningComponent',
    'name': doc.title
  };
}
```

### Step 3: Create OERSchemaScript Component

Create `components/OERSchemaScript.vue`:
```vue
<script setup lang="ts">
import type { OERSchema } from '~/lib/oer-schema-builder';

interface Props {
  schema: OERSchema
}

const props = defineProps<Props>();

const jsonLd = computed(() => {
  return JSON.stringify(props.schema, null, 2);
});
</script>

<template>
  <Head>
    <script type="application/ld+json">
      {{ jsonLd }}
    </script>
  </Head>
</template>
```

### Step 4: Update Exercise Page

Update `pages/exercises/[...slug].vue`:
```vue
<script setup lang="ts">
import { buildPracticeSchema } from '~/lib/oer-schema-builder';

// ... existing code ...

const oerSchema = computed(() => {
  if (!doc.value) return null;
  return buildPracticeSchema(doc.value);
});
</script>

<template>
  <NuxtLayout :name="isEmbed ? 'embed' : 'docs'">
    <OERSchemaScript v-if="oerSchema" :schema="oerSchema" />
    
    <!-- ... rest of template ... -->
  </NuxtLayout>
</template>
```

## Next Steps

1. ✅ Create utility functions for parsing markdown sections
2. ✅ Create schema builder functions for each content type
3. ✅ Create OERSchemaScript component
4. ✅ Update exercise page to include JSON-LD
5. ✅ Update project page to include JSON-LD with multi-step tasks
6. ✅ Enhance specializations/pathways pages with complete schema
7. ✅ Test with Google Rich Results Test
8. ✅ Validate with Schema.org validator
9. 🔲 Document for content authors
10. 🔲 Consider custom markdown components for visual semantic markup
