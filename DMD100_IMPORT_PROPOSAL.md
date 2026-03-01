# DMD 100 VitePress → OER Platform Import Proposal

## 1. Source Analysis

### Repository
- **Source:** [dmd-program/dmd-100-book](https://github.com/dmd-program/dmd-100-book)
- **Live site:** https://dmd-program.github.io/dmd-100-book/
- **Framework:** VitePress (Markdown + `.vitepress/config.mjs` sidebar)
- **License:** CC-BY-4.0
- **Author:** Michael Collins
- **Total pages:** 108 markdown files
- **Assets:** Images in `docs/assets/` (referenced via `/assets/filename.jpg`)

### Source Content Characteristics
- **No YAML frontmatter** — pages use `# Title` as first heading, no `---` blocks
- **Footnotes** — uses `markdown-it-footnote` syntax (`[^1]`, `[^1]: ...`)
- **Images** — relative paths like `/assets/image@2x.jpg` and `/assets/image.jpg`
- **Embeds** — YouTube/TED links as inline Markdown links (not iframes), some external resource links
- **Internal links** — VitePress-style relative paths (e.g., `/lessons/lesson-1/topics/what_is_design`)
- **Sidebar** — full ToC defined in `config.mjs` as a nested JS object

### Source Directory Structure
```
docs/
├── index.md                          (home page)
├── LICENSE.md                        (license info)
├── oer-schema-test.md                (test page, skip)
├── introduction/                     (11 files — course info pages)
│   ├── about-this-course.md
│   ├── digital_multimedia_design.md
│   ├── feedback-and-critique.md
│   ├── instructor.md
│   ├── learning-objectives.md
│   ├── license-examples.md
│   ├── measuring_success.md
│   ├── projects.md
│   ├── requirements.md
│   ├── technology.md
│   └── writing_guidelines.md
├── toolkit/                          (1 file — reference material)
│   └── feedback-and-critique.md
├── topics/                           (1 file — standalone topic)
│   └── character.md
├── lessons/
│   ├── introduction-what-is-design.md       (lesson intro pages × 5)
│   ├── introduction-visual-and-interaction-design.md
│   ├── introduction-storytelling.md
│   ├── introduction-open-design.md
│   ├── introduction-self-design.md
│   ├── what-is-design/                      (1 discussion page)
│   ├── lesson-1/
│   │   ├── topics/      (5 files)    — educational content
│   │   ├── readings/    (1 file)     — book response prompts
│   │   ├── listening/   (2 files)    — podcast assignments
│   │   └── practice/    (2 files)    — hands-on activities
│   ├── lesson-2/
│   │   ├── topics/      (6 files)
│   │   ├── readings/    (5 files)
│   │   ├── listening/   (2 files)
│   │   ├── watching/    (1 file)
│   │   └── projects/ritual/  (12 files) — multi-step project
│   ├── lesson-3/
│   │   ├── topics/      (6 files)
│   │   ├── readings/    (3 files)
│   │   ├── listening/   (1 file)
│   │   ├── watching/    (2 files)
│   │   └── projects/narrative/  (10 files) — multi-step project
│   ├── lesson-4/
│   │   ├── topics/      (8 files)
│   │   ├── readings/    (4 files)
│   │   ├── watching/    (1 file)
│   │   └── projects/open_design/  (11 files) — multi-step project
│   └── lesson-5/
│       ├── readings/    (1 file)
│       ├── listening/   (2 files)
│       └── practice/    (1 file)
```

---

## 2. OER Platform Target Collections

| OER Collection | Source Pattern | Schema Key Fields |
|---|---|---|
| `books` | Top-level container | `title`, `description`, `author`, `license`, `outline[]`, `theme` |
| `articles` | Topics, readings, intro pages, listening, watching | `title`, `description`, `author`, `license`, `date`, `tags` |
| `exercises` | Practice/activity pages | `title`, `difficulty`, `tags`, `author`, `license` |
| `projects` | Multi-step project pages | `title`, `difficulty`, `tags`, `author`, `license` |
| `lessons` | Lesson containers (lesson-1 through lesson-5) | `title`, `description`, `articles[]`, `exercises[]`, `projects[]`, `order` |

### Collections NOT used for this import
- `tutorials` — no VitePress pages map cleanly to step-by-step tutorials
- `lectures` — could be used for topics, but `articles` is a better fit (no slides/video content)
- `specializations` / `pathways` — not applicable to a single-course book
- `rubrics` — DMD 100 has no grading rubric data in the repository

---

## 3. Content Type Mapping

### 3.1 VitePress → OER Collection Type Decisions

| Source Category | Files | → OER Type | Rationale |
|---|---|---|---|
| `introduction/*` | 11 | **articles** | Informational pages about the course |
| `toolkit/*` | 1 | **articles** | Reference material |
| `topics/*` (root) | 1 | **articles** | Standalone educational content |
| `lesson-N/topics/*` | 30 | **articles** | Core educational reading content |
| `lesson-N/readings/*` | 14 | **articles** | Writing prompts tied to book chapters |
| `lesson-N/listening/*` | 7 | **articles** | Podcast assignment pages (short, link-based) |
| `lesson-N/watching/*` | 4 | **articles** | Video assignment pages (short, link-based) |
| Lesson intro pages | 5 | **articles** | Lesson overview/introduction text |
| Discussion pages | 1 | **articles** | End-of-lesson discussion prompt |
| `lesson-N/practice/*` | 3 | **exercises** | Hands-on activities with instructions |
| `lesson-2/projects/ritual/*` | 12 | **projects** | Multi-step ritual design project |
| `lesson-3/projects/narrative/*` | 10 | **projects** | Multi-step narrative project |
| `lesson-4/projects/open_design/*` | 11 | **projects** | Multi-step open design project |
| `lesson-5/practice/pathway` | 1 | **exercises** | Self-design pathway activity |
| `index.md` | 1 | Book body content | Becomes the book's `index.md` body |
| `LICENSE.md` | 1 | Skip (metadata) | License captured in book frontmatter |
| `oer-schema-test.md` | 1 | Skip | Test page |

**Totals:** ~73 articles, ~4 exercises, ~33 projects, 5 lessons, 1 book

### 3.2 Tagging Strategy

To preserve the VitePress sub-categories (topics, readings, listening, watching) as queryable metadata, each imported article gets a `tags` array:

| Source Sub-folder | Tags Applied |
|---|---|
| `introduction/*` | `["dmd-100", "introduction"]` |
| `lesson-N/topics/*` | `["dmd-100", "lesson-N", "topic"]` |
| `lesson-N/readings/*` | `["dmd-100", "lesson-N", "reading"]` |
| `lesson-N/listening/*` | `["dmd-100", "lesson-N", "listening"]` |
| `lesson-N/watching/*` | `["dmd-100", "lesson-N", "watching"]` |
| Lesson intro pages | `["dmd-100", "lesson-N", "introduction"]` |

---

## 4. File Path Mapping

### 4.1 Article Path Convention

VitePress path → OER `content/articles/` path:

```
docs/introduction/about-this-course.md
  → content/articles/dmd100-introduction-about-this-course.md

docs/lessons/lesson-1/topics/what_is_design.md
  → content/articles/dmd100-lesson-1-topics-what-is-design.md

docs/lessons/lesson-1/readings/chapter_1_sen_rikyu_and_the_paradox_of_innovation.md
  → content/articles/dmd100-lesson-1-readings-chapter-1-sen-rikyu.md

docs/lessons/lesson-1/listening/creative_mornings_design_is_magical.md
  → content/articles/dmd100-lesson-1-listening-creative-mornings-design-is-magical.md
```

**Naming rules:**
- Prefix all with `dmd100-` to namespace and avoid collisions
- Flatten path hierarchy using hyphens
- Normalize underscores to hyphens
- Truncate extremely long filenames

### 4.2 Exercise Path Convention

```
docs/lessons/lesson-1/practice/daily_design_journal.md
  → content/exercises/dmd100-daily-design-journal.md
```

### 4.3 Project Path Convention

```
docs/lessons/lesson-2/projects/ritual/ritual_project.md
  → content/projects/dmd100-ritual-project.md

docs/lessons/lesson-2/projects/ritual/ritual_interview.md
  → content/projects/dmd100-ritual-interview.md
```

### 4.4 Lesson Containers

```
(generated from sidebar config)
  → content/lessons/dmd100-lesson-1-what-is-design/index.md
  → content/lessons/dmd100-lesson-2-visual-and-interaction-design/index.md
  → content/lessons/dmd100-lesson-3-storytelling/index.md
  → content/lessons/dmd100-lesson-4-open-design/index.md
  → content/lessons/dmd100-lesson-5-self-design/index.md
```

### 4.5 Image/Asset Migration

```
docs/assets/what-is-design@2x.jpg
  → public/uploads/dmd100_what-is-design@2x.jpg
```

**Rules:**
- Prefix all images with `dmd100_` to avoid collisions with existing uploads
- Copy from `docs/assets/` to `public/uploads/`
- Rewrite all Markdown image references: `/assets/X` → `/uploads/dmd100_X`

---

## 5. Book Outline Generation

The VitePress `sidebar` config maps directly to the OER book `outline` array. The sidebar has a 3-level hierarchy that maps to our 4-level outline schema.

### Mapping

```
VitePress Sidebar                    → OER Book Outline
─────────────────                      ────────────────
{ text: 'Introduction',     }       → { title: 'Introduction', path: 'introduction', items: [...] }
  { text: 'About', link }            → { title: 'About this course', path: 'about',
                                            content: 'articles/dmd100-introduction-about-this-course' }

{ text: 'Lesson 1: What is design?'} → { title: 'Lesson 1: What is design?', path: 'lesson-1', items: [...] }
  { text: 'Topics', items }            → { title: 'Topics', path: 'topics', items: [...] }
    { text: 'What is design?', link }     → { title: 'What is design?', path: 'what-is-design',
                                                content: 'articles/dmd100-lesson-1-topics-what-is-design' }
```

### Generated Outline (abbreviated)

```yaml
outline:
  - title: Introduction
    path: introduction
    items:
      - title: Home
        path: home
        content: articles/dmd100-index
      - title: About this course
        path: about-this-course
        content: articles/dmd100-introduction-about-this-course
      - title: Digital Multimedia Design
        path: digital-multimedia-design
        content: articles/dmd100-introduction-digital-multimedia-design
      # ... (11 items total)

  - title: "Lesson 1: What is design?"
    path: lesson-1
    items:
      - title: Introduction
        path: introduction
        content: articles/dmd100-lesson-1-introduction-what-is-design
      - title: Topics
        path: topics
        items:
          - title: What is design?
            path: what-is-design
            content: articles/dmd100-lesson-1-topics-what-is-design
          - title: Design thinking
            path: design-thinking
            content: articles/dmd100-lesson-1-topics-design-thinking
          # ... (5 topic items)
      - title: Readings
        path: readings
        items:
          - title: "Chapter 1&2. Sen Rikyu..."
            path: chapter-1-2
            content: articles/dmd100-lesson-1-readings-chapter-1-sen-rikyu
      - title: Activities
        path: activities
        items:
          - title: Daily design journal
            path: daily-design-journal
            content: exercises/dmd100-daily-design-journal
      - title: Listen
        path: listen
        items:
          - title: "Creative Mornings: Design Is Magical"
            path: creative-mornings
            content: articles/dmd100-lesson-1-listening-creative-mornings
          # ...
      - title: Discussions
        path: discussions
        items:
          - title: End of lesson discussion
            path: end-of-lesson
            content: articles/dmd100-lesson-1-end-of-lesson-discussion

  - title: "Lesson 2: Visual and interaction design"
    path: lesson-2
    items:
      - title: Introduction
        path: introduction
        content: articles/dmd100-lesson-2-introduction
      - title: Topics
        path: topics
        items: [...]     # 6 items → articles
      - title: Readings
        path: readings
        items: [...]     # 5 items → articles
      - title: Watch
        path: watch
        items: [...]     # 1 item → articles
      - title: Listen
        path: listen
        items: [...]     # 2 items → articles
      - title: Project
        path: project
        items: [...]     # 12 items → projects

  # Lesson 3, 4, 5 follow same pattern...

  - title: License
    path: license
    content: articles/dmd100-license
```

**Outline depth usage:**
- **L1:** Top sections (Introduction, Lesson 1–5, License)
- **L2:** Sub-categories (Topics, Readings, Listen, Watch, Project, Activities)
- **L3:** Individual pages → `content` reference to an article/exercise/project
- **L4:** One case — Lesson 3 Tutorials nested under Project → Tutorials → Twine tutorial

This fits within our 4-level outline schema.

---

## 6. Frontmatter Generation

Since VitePress source files have **no YAML frontmatter**, the import script must generate it.

### Article frontmatter template

```yaml
---
title: "What is design?"                    # Extracted from first # heading
description: ""                              # Can be auto-generated from first paragraph
author: "Michael Collins"                    # Default from config.mjs
authorUrl: ""
date: "2026-02-28"                           # Import date
license: "CC BY 4.0"                         # From LICENSE.md / config
tags:
  - dmd-100
  - lesson-1
  - topic
published: true
---
```

### Exercise frontmatter template

```yaml
---
title: "Daily Design Journal"
author: "Michael Collins"
license: "CC BY 4.0"
tags:
  - dmd-100
  - lesson-1
  - activity
difficulty: "beginner"
published: true
---
```

### Project frontmatter template

```yaml
---
title: "Ritual Project"
author: "Michael Collins"
license: "CC BY 4.0"
tags:
  - dmd-100
  - lesson-2
  - ritual-project
difficulty: "intermediate"
published: true
---
```

---

## 7. Content Transformations

### 7.1 Image Path Rewriting
```
Before: ![alt](/assets/what-is-design@2x.jpg)
After:  ![alt](/uploads/dmd100_what-is-design@2x.jpg)
```

### 7.2 Internal Link Rewriting

VitePress internal links must be rewritten to either:
- **Option A (Book-relative):** Remove the links entirely or convert to plain text (since in-book navigation is handled by the outline, not inline links)
- **Option B (Cross-references):** Identify the target content path and keep as a relative Markdown link. Since all content lives in the same Nuxt Content space, links can point to the article/exercise/project slug.

**Recommended: Option B** — rewrite links to OER content paths:
```
Before: [What is design?](/lessons/lesson-1/topics/what_is_design)
After:  [What is design?](/articles/dmd100-lesson-1-topics-what-is-design)
```

### 7.3 Footnotes
Nuxt Content / MDC supports footnotes natively. No transformation needed — the `[^1]` / `[^1]:` syntax should work as-is.

### 7.4 First Heading Removal
Since the OER schema uses frontmatter `title` for the page title, the first `# Title` heading in each file should be **removed** from the body to avoid duplication.

### 7.5 Embed Conversion (Optional Enhancement)
Some pages contain YouTube/TED links as plain Markdown links. These could optionally be converted to MDC embed components:
```
Before: [Video title](https://www.youtube.com/watch?v=ID)
After:  ::youtube-embed{videoId="ID"}
```
This is a nice-to-have and can be done in a second pass.

---

## 8. Import Script Design

### Approach: Node.js CLI Script

```
scripts/import-vitepress-book.mjs
```

### Inputs
1. Path to cloned `dmd-100-book` repo (or fetched via GitHub API)
2. Target book slug: `dmd-100-digital-multimedia-design`

### Steps

```
1. Parse VitePress sidebar config (config.mjs)
   → Extract full hierarchy as JSON tree

2. Walk the sidebar tree and classify each leaf node:
   → Determine OER collection type (article / exercise / project)
   → Generate target file path with dmd100- prefix
   → Build mapping table: { vitepressPath → oerPath, type, tags }

3. For each source markdown file:
   a. Read file content
   b. Extract title from first # heading
   c. Auto-generate description from first paragraph (optional)
   d. Remove first # heading from body
   e. Rewrite image paths: /assets/X → /uploads/dmd100_X
   f. Rewrite internal links using mapping table
   g. Generate frontmatter YAML
   h. Write to content/{type}/{slug}.md

4. Copy all assets from docs/assets/ → public/uploads/
   → Rename with dmd100_ prefix

5. Generate lesson index files (optional — for lesson containers)

6. Generate book index.md with:
   → Book frontmatter (title, description, author, license, theme)
   → Full outline generated from sidebar tree
   → Write to content/books/dmd-100-digital-multimedia-design/index.md

7. Output import report:
   → Files created, images copied, links rewritten, warnings
```

### Estimated Output
| Type | Count | Location |
|---|---|---|
| Articles | ~73 | `content/articles/dmd100-*.md` |
| Exercises | ~4 | `content/exercises/dmd100-*.md` |
| Projects | ~33 | `content/projects/dmd100-*.md` |
| Book | 1 | `content/books/dmd-100-digital-multimedia-design/index.md` |
| Images | ~20-30 | `public/uploads/dmd100_*` |
| **Total files** | **~131** | |

---

## 9. Challenges & Considerations

### 9.1 No Semantic Separation of Content Types in Source
The VitePress book doesn't distinguish between "topics" (long educational articles) and "readings" (short writing prompts) at a file level — they're all plain `.md` files. The sub-folder they live in (`topics/`, `readings/`, `listening/`) is the only signal. The proposed tagging strategy preserves this distinction.

### 9.2 Short Pages
Many pages are very short — listening/watching pages are often just 2-3 lines with a link. These are still valid articles in the OER system but may feel lightweight. An alternative is to inline them into a parent lesson container, but this loses the per-page granularity that the book outline needs for 1:1 sidebar mapping.

### 9.3 Outline Depth
The VitePress sidebar uses up to 4 nesting levels (e.g., Lesson 3 > Project > Tutorials > Twine tutorial). Our outline schema supports exactly 4 levels, so this fits.

### 9.4 Duplicate Content
`docs/topics/character.md` and `docs/lessons/lesson-3/topics/character.md` may have overlapping content. The import should check for duplicates and either merge or keep both with disambiguated paths.

### 9.5 Image References from GitHub
Some images in the source use GitHub raw URLs or external links (not `/assets/`). These should be left as-is (external URLs) or downloaded and localized.

### 9.6 Internal Links Across Lessons
Some pages link to pages in other lessons. The link rewriting step must handle cross-lesson references, not just within-lesson links.

---

## 10. Phased Implementation

### Phase 1: Automated Import Script
- Parse sidebar config → generate mapping table
- Transform markdown files (frontmatter, image paths, heading removal)
- Copy assets
- Generate book outline + index.md
- **Estimated effort:** 1-2 days

### Phase 2: Manual Review & Refinement
- Review all ~110 imported files for formatting issues
- Fix edge cases in link rewriting
- Verify image rendering
- Test book outline navigation
- **Estimated effort:** 1 day

### Phase 3: Enhancements (Optional)
- Convert YouTube/TED links to MDC embeds
- Generate lesson containers with proper `articles[]` / `projects[]` references
- Auto-generate descriptions from first paragraphs
- Add AI-generated summaries for short listening/watching pages
- **Estimated effort:** 1 day

---

## 11. Visual Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                    VitePress DMD-100 Book                          │
│  108 .md files │ docs/assets/ images │ config.mjs sidebar          │
└─────────────┬───────────────────────────────┬───────────────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────────┐
│  Content Transform       │     │  Sidebar → Outline Transform    │
│                          │     │                                 │
│  • Extract title from #  │     │  text/items/link hierarchy      │
│  • Generate frontmatter  │     │     ↓                           │
│  • Rewrite /assets/ →    │     │  title/path/content/items tree  │
│    /uploads/dmd100_      │     │                                 │
│  • Rewrite internal links│     │  4-level outline for book       │
│  • Classify → article /  │     │  index.md                       │
│    exercise / project    │     │                                 │
└───────────┬──────────────┘     └──────────────┬──────────────────┘
            │                                    │
            ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     OER Platform Collections                        │
│                                                                     │
│  content/books/dmd-100-digital-multimedia-design/index.md           │
│    └─ outline: [ Introduction, Lesson 1–5, License ]                │
│                                                                     │
│  content/articles/dmd100-*.md             (~73 files)               │
│  content/exercises/dmd100-*.md            (~4 files)                │
│  content/projects/dmd100-*.md             (~33 files)               │
│  public/uploads/dmd100_*                  (~20-30 images)           │
└─────────────────────────────────────────────────────────────────────┘
```
