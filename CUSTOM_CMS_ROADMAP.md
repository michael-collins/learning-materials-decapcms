# Custom CMS Roadmap: Decap-Compatible Git CMS for OER Content

## Project Vision

Build a custom, Nuxt-native CMS admin interface that reads the existing Decap CMS `config.yml` for schema definitions, uses the GitHub API for git operations, and provides a modern, tailored editing experience purpose-built for educational content authoring.

**Core Principles:**

- **Decap-compatible**: Reads the same `config.yml`, writes the same markdown+frontmatter files — Decap remains a working fallback throughout development
- **Incremental**: Build one widget/collection at a time; both systems run side-by-side
- **Education-first UX**: Specialized interfaces for OER schema, pathways, rubrics, prerequisites, and version management that Decap can never provide
- **Zero external services**: Git-backed, self-hosted, no databases — same Jamstack philosophy

---

## Current State Inventory

### Collections in config.yml (10 total)

| Collection | Widget Complexity | Custom Needs |
|---|---|---|
| articles | Medium | Prerequisites (typed list), attachments |
| tutorials | Medium | Prerequisites, attachments, difficulty |
| exercises | High | AI licenses (multi-select), rubric ref, tags, versioning, prerequisites, attachments |
| projects | High | Same as exercises |
| lectures | Medium | Course code, attachments, prerequisites |
| lessons | High | Ordered content items (typed list), prerequisites, versioning, changelog |
| specializations | High | Ordered lesson relations, skills, tools, learning objectives |
| pathways | High | Ordered specialization relations, learning objectives |
| rubrics | Medium | Grading criteria (nested list) |
| docs | Low | Simple title + body |

### Decap Widget Types Used

| Widget | Count | Custom CMS Component Needed |
|---|---|---|
| `string` | ~30 | `<CmsString>` — text input |
| `text` | ~15 | `<CmsText>` — textarea |
| `markdown` | 10 | `<CmsMarkdown>` — Tiptap editor |
| `select` | ~20 | `<CmsSelect>` — dropdown (single + multi) |
| `boolean` | ~15 | `<CmsBoolean>` — checkbox/switch |
| `datetime` | ~5 | `<CmsDatetime>` — date picker |
| `image` | ~8 | `<CmsImage>` — file upload + preview |
| `file` | ~5 | `<CmsFile>` — file upload |
| `list` | ~15 | `<CmsList>` — repeatable fields |
| `list` (typed) | ~10 | `<CmsTypedList>` — polymorphic list (prerequisites, items) |
| `relation` | ~20 | `<CmsRelation>` — content reference picker |
| `object` | ~10 | `<CmsObject>` — nested field group |
| `hidden` | ~10 | `<CmsHidden>` — hidden input with default |

### Editor Components (MDC shortcuts in markdown body)

| Component | Fields | Pattern |
|---|---|---|
| YouTube Video | id, title | `::youtube-video{id="..." title="..."}::` |
| Video Embed (iframe) | src, title | `::iframe-component{src="..." title="..."}::` |
| Google Slides | id, title | `::google-slides-component{id="..." title="..."}::` |
| Assessment Rubric | id | `::rubric-component{id="..."}::` |
| Sketchfab Model | src, title, height | `::sketchfab-component{src="..." ...}::` |
| 3D Model Upload | src, title, height, autoRotate | `::threed-viewer-component{src="..." ...}::` |

### Existing UI Components Available

Shadcn/Vue components already installed: Button, Card, Dialog, Input, Label, Pagination, Popover, Radio Group, Scroll Area, Select, Sidebar, Stepper, Table, Textarea, Tooltip, Breadcrumb.

### Existing Infrastructure

- `gray-matter` already in devDependencies (frontmatter parsing)
- `@nuxt/content` for reading content (query builder)
- `reka-ui` / `radix-vue` for accessible primitives
- Tailwind CSS v4 with `@tailwindcss/typography`
- `lucide-vue-next` icons
- Nuxt H3 server routes available

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Custom CMS (/cms/...)                        │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │ Config Parser │  │ Form Engine  │  │ Content Browser       │ │
│  │              │  │              │  │                       │ │
│  │ Reads        │  │ DynamicField │  │ Grid/list views       │ │
│  │ config.yml   │→ │ per widget   │  │ Filters, search       │ │
│  │ at build     │  │ type         │  │ Sort, pagination      │ │
│  └──────────────┘  └──────┬───────┘  └───────────────────────┘ │
│                           │                                     │
│  ┌──────────────┐  ┌──────┴───────┐  ┌───────────────────────┐ │
│  │ Markdown     │  │ Collection   │  │ Media Manager         │ │
│  │ Editor       │  │ Form         │  │                       │ │
│  │              │  │              │  │ Upload, browse,       │ │
│  │ Tiptap +     │  │ Auto-gen     │  │ delete files from     │ │
│  │ MDC toolbar  │  │ from config  │  │ public/uploads        │ │
│  └──────────────┘  └──────┬───────┘  └───────────────────────┘ │
│                           │                                     │
│  ┌────────────────────────┴────────────────────────────────┐   │
│  │                   Git Backend Layer                      │   │
│  │                                                          │   │
│  │  ┌─────────────┐  ┌───────────┐  ┌──────────────────┐  │   │
│  │  │ GitHub Auth  │  │ Read/Write│  │ Editorial        │  │   │
│  │  │ (OAuth)      │  │ Content   │  │ Workflow         │  │   │
│  │  │              │  │ (Octokit) │  │ (Branch + PR)    │  │   │
│  │  └─────────────┘  └───────────┘  └──────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

   Decap CMS (/admin) remains functional as fallback throughout.
```

### Key Design Decisions

1. **Config-driven forms**: Parse `public/admin/config.yml` → generate Vue form components dynamically. No separate schema definition needed.
2. **Local-first for dev**: In development mode, read/write directly to the filesystem (like Decap's `local_backend`). In production, use GitHub API.
3. **Nuxt Content for reads**: Use `queryContent()` for listing/searching content (fast, already indexed). Use GitHub API only for writes.
4. **Editorial workflow**: Match Decap's branch+PR model — create a branch, commit changes, open a PR. Authors can merge from GitHub or from the CMS.

---

## Phase 0 — Foundation ✅ COMPLETE

**Goal:** Project scaffolding, config parser, auth, and a working read-only content browser.

### 0.1 Config Parser

- [x] **`lib/cms/config-parser.ts`** — Parse `config.yml` into typed TypeScript interfaces
  - `DecapConfig` (backend, media_folder, collections)
  - `DecapCollection` (name, label, folder, slug, path, fields, view_filters, sort)
  - `DecapField` (label, name, widget, required, default, options, hint, pattern, fields, types, collection, value_field, search_fields, display_fields, multiple)
- [x] **`lib/cms/config-types.ts`** — Full type definitions
- [x] **`server/api/cms/config.get.ts`** — Endpoint that serves parsed config (cached)
- [x] **`composables/useCmsConfig.ts`** — Client-side composable to fetch and cache config

### 0.2 Authentication

- [x] **`server/api/cms/auth/github.get.ts`** — GitHub OAuth flow initiation
- [x] **`server/api/cms/auth/callback.get.ts`** — OAuth callback, exchange code for token, store in httpOnly cookie
- [x] **`server/api/cms/auth/session.get.ts`** — Get current session
- [x] **`server/api/cms/auth/logout.post.ts`** — Clear session
- [x] **`server/api/cms/auth/token.get.ts`** — Token retrieval for API calls
- [x] **`composables/useCmsAuth.ts`** — Auth state, login/logout, guard (supports OAuth + PAT dual auth)
- [x] **`middleware/cms-auth.ts`** — Route middleware protecting `/cms/**`
- [x] **`pages/cms/login.vue`** — Login page with OAuth + PAT options

### 0.3 CMS Layout & Navigation

- [x] **`layouts/cms.vue`** — Admin layout with sidebar, top bar, user menu
- [x] **`pages/cms/index.vue`** — Dashboard: collection cards with item counts, quick links, batch publish
- [x] **`pages/cms/[collection]/index.vue`** — Collection browser (search, sort, pagination)
- [x] Sidebar generated from config collections

### 0.4 Content Reading (via Nuxt Content)

- [x] **`composables/useCmsContent.ts`** — Wrapper around `queryCollection()` for CMS views
  - List items in a collection with pagination
  - Search by title/description
  - Sort by sortable_fields from config
  - Filter out version files automatically

**Milestone: ✅ Browse all collections and items in a custom UI.**

---

## Phase 1 — Form Engine & Basic Widgets ✅ COMPLETE

**Goal:** Dynamic form generation from config, covering simple widget types. Edit and save one collection (articles — simplest schema).

### 1.1 Dynamic Field Components

- [x] **`components/cms/fields/CmsString.vue`** — Text input with validation (supports `pattern`)
- [x] **`components/cms/fields/CmsText.vue`** — Textarea
- [x] **`components/cms/fields/CmsBoolean.vue`** — Switch (shadcn style)
- [x] **`components/cms/fields/CmsSelect.vue`** — Dropdown, supports `multiple: true` for multi-select
- [x] **`components/cms/fields/CmsDatetime.vue`** — Date/time picker
- [x] **`components/cms/fields/CmsHidden.vue`** — Hidden field with default value
- [x] **`components/cms/fields/CmsNumber.vue`** — Number input

### 1.2 DynamicField Router

- [x] **`components/cms/DynamicField.vue`** — Routes `field.widget` → correct component
- [x] **`components/cms/CollectionForm.vue`** — Renders all fields for a collection, manages form state
- [x] Form validation based on `required`, `pattern`, `hint` from config

### 1.3 Git Write Operations

- [x] **`server/api/cms/content/save.post.ts`** — Save content to GitHub (branch+PR or direct commit)
- [x] **`server/api/cms/content/save-local.post.ts`** — Direct local filesystem save for dev
- [x] **`server/api/cms/content/read.get.ts`** — Read content for editing
- [x] **`composables/useCmsSave.ts`** — Client-side save with loading/error states, publish to GitHub

### 1.4 Editor Pages

- [x] **`pages/cms/[collection]/new.vue`** — Create new content item
- [x] **`pages/cms/[collection]/edit/[...slug].vue`** — Edit existing content item
- [x] **`pages/cms/[collection]/[...slug].vue`** — View content item (preview)

### 1.5 Local Development Backend

- [x] **`lib/cms/local-backend.ts`** — File-system based read/write for `nuxt dev`
- [x] **`lib/cms/git-backend.ts`** — GitHub API abstraction (read, write, branch, PR, tree, commit)
- [x] Toggle via `local_backend: true` in config (same as Decap)

**Milestone: ✅ Create and edit all collections via custom CMS. Form auto-generates from config.yml.**

- [ ] **`pages/cms/[collection]/new.vue`** — Create new content item
- [ ] **`pages/cms/[collection]/edit/[...slug].vue`** — Edit existing content item
  - Load existing markdown via GitHub API (or filesystem in dev)
  - Parse frontmatter with gray-matter
  - Populate form
  - Save → branch + PR

### 1.5 Local Development Backend

- [ ] **`server/api/cms/local/`** — File-system based read/write for `nuxt dev`
  - Read: `fs.readFile` from content directory
  - Write: `fs.writeFile` directly (no git operations)
  - Toggle via `local_backend: true` in config (same as Decap)

**Milestone: Create and edit articles via custom CMS. Form auto-generates from config.yml.**

---

## Phase 2 — Complex Widgets ✅ COMPLETE

**Goal:** Support the remaining widget types that make up the bulk of your content complexity.

### 2.1 List Widget

- [x] **`components/cms/fields/CmsList.vue`** — Repeatable field group
  - Add/remove items
  - Drag-to-reorder
  - Supports `fields` (fixed structure per item)
  - Supports `field` (single field per item, e.g., tags, skills)

### 2.2 Typed List Widget (Polymorphic)

- [x] **`components/cms/fields/CmsTypedList.vue`** — List with `types` (used by prerequisites, lesson items)
  - Type selector dropdown per item
  - Renders different field sets per type
  - Manages `__typename` hidden field
  - Drag-to-reorder

### 2.3 Relation Widget

- [x] **`components/cms/fields/CmsRelation.vue`** — Content reference picker
  - Fetch items from referenced `collection` via Nuxt Content
  - Searchable dropdown (combobox) using `search_fields`
  - Display with `display_fields`
  - Stores `value_field` (slug)
  - Supports `multiple: true` for ordered multi-select

### 2.4 Object Widget

- [x] **`components/cms/fields/CmsObject.vue`** — Nested field group
  - Renders child `fields` recursively using DynamicField
  - Collapsible section in form

### 2.5 File & Image Widgets

- [x] **`components/cms/fields/CmsImage.vue`** — Image upload with preview and media browser
- [x] **`components/cms/fields/CmsFile.vue`** — Generic file upload with media browser

### 2.6 Additional Widgets

- [x] **`components/cms/fields/CmsMarkdown.vue`** — Delegates to the Tiptap MarkdownEditor
- [x] **`components/cms/fields/CmsVersionSelect.vue`** — Version selector for versioned content

**Milestone: ✅ All 10 collections fully editable. Every Decap widget type replicated.**

---

## Phase 3 — Markdown Editor ✅ COMPLETE

**Goal:** A rich markdown editor with toolbar, MDC component insertion, and live preview.

### 3.1 Tiptap Integration

- [x] **`components/cms/editor/MarkdownEditor.vue`** — Main editor component (513 lines)
  - Tiptap with `tiptap-markdown` extension for markdown ↔ rich-text
  - Toolbar: bold, italic, headings (1-3), lists (ordered/unordered), blockquote, code block, horizontal rule, link, image
  - Three modes: Rich editor, Code view, Preview
  - Responsive full-width layout

### 3.2 MDC Component Toolbar

- [x] **`components/cms/MdcToolbar.vue`** — "Insert Component" dropdown
  - YouTube Video, Video Embed, Google Slides, Rubric, Sketchfab, 3D Viewer
- [x] **`components/cms/MdcComponentModal.vue`** — Modal for editing MDC component props
- [x] **`components/cms/editor/MdcBlockExtension.ts`** — Custom Tiptap Node for MDC blocks
- [x] **`components/cms/editor/MdcBlockView.vue`** — NodeView renderer for MDC block cards

### 3.3 Code Mode

- [x] **`components/cms/editor/CodeEditor.vue`** — CodeMirror 6 integration
  - Markdown + YAML frontmatter syntax highlighting
  - Dark/light theme support

**Milestone: ✅ Rich markdown editing with MDC components. Matches or exceeds Decap's editor.**

---

## Phase 4 — Media Manager ✅ COMPLETE

**Goal:** Browse, upload, and manage files in `public/uploads/`.

### 4.1 Media Browser

- [x] **`pages/cms/media.vue`** — Full media manager page
- [x] **`components/cms/media/MediaBrowser.vue`** — Full-featured browser (874 lines)
  - Grid view with thumbnails (images), icons (other files)
  - Folder navigation
  - Search by filename
  - File type filtering
- [x] **`components/cms/media/MediaPickerModal.vue`** — Reusable picker for image/file fields

### 4.2 Upload & Operations

- [x] **`server/api/cms/media/upload.post.ts`** — File upload handler
- [x] **`server/api/cms/media/list.get.ts`** — Browse media directory
- [x] **`server/api/cms/media/delete.post.ts`** — Delete files
- [x] **`server/api/cms/media/create-folder.post.ts`** — Create folders
- [x] **`server/api/cms/media/move.post.ts`** — Move/rename files

**Milestone: ✅ Complete media management. No need to use Decap for file uploads.**

---

## Phase 5 — Editorial Workflow & Publishing ✅ COMPLETE

**Goal:** Branch-based drafts, PR review, sync checking, and batch publishing.

### 5.1 Draft Management

- [x] **`pages/cms/drafts.vue`** — List all open draft PRs (304 lines)
- [x] **`composables/useCmsDrafts.ts`** — Fetch and manage draft PRs via GitHub API (267 lines)
  - List open PRs with `cms/` branch prefix
  - Show status, diff summary
  - Publish (merge) and discard (close PR + delete branch)

### 5.2 Save Modes

- [x] "Publish to GitHub" split button: Commit to main / Create Pull Request
- [x] Local save (filesystem) for development mode
- [x] Direct commit to main for trusted authors
- [x] Branch+PR editorial workflow

### 5.3 Sync & Conflict Resolution

- [x] **`composables/useCmsSync.ts`** — Pre-publish sync checking (SHA comparison)
- [x] **`server/api/cms/content/sync-check.post.ts`** — Single-file sync check (local vs GitHub)
- [x] **`server/api/cms/content/pull.post.ts`** — Pull GitHub version to local
- [x] **`components/cms/SyncConflictDialog.vue`** — Force Publish / Resolve / Pull / Cancel
- [x] **`components/cms/ConflictResolver.vue`** — Full-screen side-by-side diff resolver for non-developers

### 5.4 Batch Publishing

- [x] **`server/api/cms/content/batch-sync-check.post.ts`** — Scan collections using Git Trees API (recursive, single API call)
- [x] **`server/api/cms/content/batch-publish.post.ts`** — Atomic multi-file commit using Git Data API
- [x] **`composables/useBatchPublish.ts`** — Reactive scan + publish state
- [x] **`components/cms/BatchPublishDialog.vue`** — File checklist, select/deselect, split button publish
- [x] "Publish Changes" button on dashboard and collection pages

**Milestone: ✅ Full editorial workflow with sync checking, conflict resolution, and batch publishing.**

---

## Phase 6 — Enhanced UX for Education Content (⬜ NEXT UP)

**Goal:** Custom interfaces that go far beyond what any generic CMS can offer.

> **Status:** Not started. All prerequisite phases complete. This is the next major phase.

### 6.1 Prerequisites Builder

- [ ] **`components/cms/custom/PrerequisitesBuilder.vue`**
  - Visual drag-and-drop prerequisite chain
  - Searchable content picker across all collections
  - Show content cards (title, type badge, description) instead of raw slugs
  - Circular dependency detection and warning
  - Quick-add from recent/related content

### 6.2 Lesson Composer

- [ ] **`components/cms/custom/LessonComposer.vue`**
  - Drag-and-drop ordering of lectures, tutorials, exercises, articles, projects
  - Visual timeline/outline view
  - Quick search across all content types
  - Preview card for each item showing type, title, difficulty
  - Estimated total duration calculation

### 6.3 Specialization Builder

- [ ] **`components/cms/custom/SpecializationBuilder.vue`**
  - Ordered lesson list with drag-and-drop
  - Skills and tools tag management
  - Learning objectives editor with AI suggestion option
  - Visual progress indicator (completeness of required fields)

### 6.4 Pathway Visualizer

- [ ] **`components/cms/custom/PathwayBuilder.vue`**
  - Visual map of specializations → lessons → items
  - Drag to reorder specializations
  - Expandable tree showing full content hierarchy
  - Gap analysis: highlight specializations missing lessons, lessons missing content

### 6.5 AI License Selector

- [ ] **`components/cms/custom/AILicenseSelector.vue`**
  - Grouped by license type (NA, WA, CD, TC, DP, IU) with clear labels
  - Media-type sub-selectors (Writing, Image, Video, Audio, 3D, etc.)
  - Visual matrix UI instead of a flat multi-select dropdown
  - Tooltips explaining each license code
  - Common presets ("Strict — No AI", "Standard — Approval Required", "Open — Full AI")

### 6.6 Version Management Dashboard

- [ ] **`pages/cms/versions/[collection]/[...slug].vue`**
  - List all version snapshots
  - Side-by-side diff between versions
  - Rollback option (create new version from old)
  - Changelog and breaking changes display
  - Embed status per version

### 6.7 Rubric Editor

- [ ] **`components/cms/custom/RubricEditor.vue`**
  - Drag-and-drop criteria ordering
  - Inline editing of criterion name and description
  - Preview of rubric as rendered table
  - Templates for common rubric patterns

**Milestone: Education-specific UX that no existing CMS can provide.**

---

## Phase 7 — Outline Builder Integration (⬜ PLANNED)

**Goal:** Implement the course creation pipeline from OUTLINE_BUILDER_PLAN.md using the new CMS infrastructure.

### 7.1 Course Content Type

- [ ] Add `courses` collection to config.yml
- [ ] Add courses collection to content.config.ts
- [ ] Create `pages/courses/[...slug].vue`
- [ ] Add to navigation sidebar

### 7.2 Outline Builder Page

- [ ] **`pages/cms/outline-builder.vue`**
  - Course metadata panel (title, description, author, license, difficulty, objectives)
  - Hierarchical module builder (drag-and-drop tree)
  - Content linker: search and attach existing content to each module node
  - Free-text sections for module descriptions
  - Generate → creates course markdown → commits via CMS git backend

### 7.3 Course Editing

- [ ] Generated courses editable via standard CMS collection form
- [ ] Module reordering via custom Lesson Composer-style UI
- [ ] Content linking updated via Relation widget

**Milestone: Full course authoring pipeline from outline to published course.**

---

## Phase 8 — Bulk Operations & Analytics (⬜ PLANNED)

**Goal:** Power-user tools for managing content at scale.

### 8.1 Bulk Editor

- [ ] **`pages/cms/bulk/index.vue`** — Select multiple items, apply changes
  - Update license across selected items
  - Update AI license presets
  - Toggle published/unpublished
  - Add/remove tags in batch
  - Change author
- [ ] Creates a single branch with all changes, one PR

### 8.2 Content Analytics Dashboard

- [ ] **`pages/cms/analytics.vue`**
  - Total content by type (pie/bar chart)
  - Content with missing fields (no description, no image, no license)
  - Orphaned content (not referenced by any lesson/specialization/pathway)
  - Version status overview (how many items have versions, latest vs archived)
  - Embed usage stats

### 8.3 Content Health Checks

- [ ] Broken internal references (prerequisites pointing to deleted content)
- [ ] Missing media files
- [ ] Schema validation warnings (content that doesn't match config)
- [ ] Duplicate slugs or titles

**Milestone: Content governance and quality management at scale.**

---

## Phase 9 — Polish & Migration (⬜ PLANNED)

**Goal:** Production-ready CMS that can replace Decap for daily use.

### 9.1 UX Polish

- [x] Keyboard shortcuts (Cmd+K command palette)
- [ ] Cmd+S save shortcut in editor
- [x] Command palette integration (existing CommandPalette.vue)
- [ ] Toast notifications for save/error/publish events
- [ ] Autosave drafts to localStorage
- [ ] Unsaved changes warning on navigation
- [x] Responsive design for tablet/mobile editing
- [x] Dark mode support (existing theme system)
- [ ] Loading skeletons for all async operations

### 9.2 Performance

- [ ] Config parsing cached at build time
- [ ] Relation field options prefetched and cached
- [ ] Lazy-load heavy components (Tiptap, media browser)
- [ ] Optimistic UI updates on save

### 9.3 Testing

- [ ] Config parser unit tests (cover all widget types)
- [ ] Form generation tests (each widget renders correctly)
- [ ] Git backend integration tests (mock GitHub API)
- [ ] E2E tests: create, edit, draft, publish workflows

### 9.4 Documentation

- [ ] Author guide: how to use the CMS
- [ ] Developer guide: adding new widget types, custom fields
- [ ] Migration notes: differences from Decap workflow

### 9.5 Cutover Plan

- [ ] Run both Decap (/admin) and Custom CMS (/cms) in parallel for 2–4 weeks
- [ ] Track usage of each to confirm feature parity
- [ ] Redirect /admin → /cms when confident
- [ ] Keep Decap config.yml as source of truth for schema (or migrate to TypeScript schema)

**Milestone: Custom CMS is the primary editing interface. Decap available as emergency fallback.**

---

## Phase 10 — Layout & Design Components

> **Status:** Research complete. Ready for implementation.
>
> **Goal:** Give content authors control over how media and text blocks render — alignment, sizing, callouts, collapsible sections, card views — without requiring theme edits or raw HTML.

### Research Summary

#### Current State
- All 10 existing MDC components (image, video, iframe, code-embed, Google Slides, rubric, Sketchfab, 3D viewer, citation, YouTube) are **atom-type** blocks in Tiptap (`atom: true`), meaning they render as non-editable cards in the editor.
- MDC blocks use **double-colon** syntax: `::component-name{props}::` — no nested markdown content.
- Content pages are constrained by `container max-w-4xl mx-auto` in `CollectionItem.vue`, and prose gets `max-w-none` (fluid within the container).
- No layout CSS or alignment utilities exist in the project today.

#### MDC Container Syntax (Triple-Colon)
MDC natively supports **container components** with nested markdown content:

```md
:::callout{type="warning"}
This is a **warning** with _formatted_ markdown inside.
:::
```

Container components:
- Use `:::` (triple-colon) instead of `::` (double-colon)
- Accept a default slot for nested markdown content
- Support named slots via `#slotName` syntax
- Render nested content through `<MDCSlot unwrap="p" />` in the Vue component
- Are auto-resolved from `components/content/` directory by Nuxt Content

#### Industry Patterns (Notion, Editor.js)
- **Notion** succeeds with a minimal set of layout blocks: Callout (boxed text with emoji icon for tips/warnings), Toggle list (collapsible), Quote, Columns, Divider. These cover ~90% of content layout needs.
- **Editor.js** favors a block-based architecture with clean JSON output, keeping each block self-contained.
- **Best practice:** A small set of composable layout primitives outperforms a large library of specialized components. Don't recreate a CSS framework.

#### Technical Constraint: Tiptap Editor
- The current `MdcBlockExtension.ts` creates atom nodes — no editable content inside.
- Container blocks with editable nested markdown require either:
  1. A **new Tiptap node type** that supports nested editable content (complex but ideal UX)
  2. **Code-mode insertion** — authors type `:::` syntax in the markdown code view; Nuxt Content renders it correctly at view time (simpler, leverages existing infrastructure)
  3. A **hybrid approach** — card preview in rich editor with a mini-editor for the inner content (modal or inline expandable)
- **Recommendation:** Start with approach 2 (code-mode) for container components while building prop-based features (Tier 1) in the rich editor. Upgrade to approach 1 or 3 as a follow-up.

### Implementation Tiers

#### Tier 1 — Media Alignment & Sizing Props (Easiest)
Add `align` and `size` props to existing atom-type MDC components.

**Components affected:** `image-component`, `video-component`, `iframe-component`, `youtube-video`

**New props:**
| Prop | Values | Default | Description |
|------|--------|---------|-------------|
| `align` | `left`, `center`, `right`, `full` | `center` | Horizontal alignment within the content column |
| `size` | `small` (25%), `medium` (50%), `large` (75%), `full` (100%) | `full` | Width relative to content column |
| `float` | `left`, `right`, `none` | `none` | Text wrap behavior (left/right float with margin) |
| `caption` | string | — | Optional caption below the media |

**Markdown syntax (existing atom format):**
```md
::image-component{src="/img/photo.jpg" alt="Example" align="right" size="medium" caption="Photo credit: Author"}::
```

**CSS approach:**
- Alignment classes applied to the component wrapper: `mx-auto`, `mr-auto`, `ml-auto`
- Size classes set `max-width` percentages
- `align="full"` uses negative margins to break out of the `max-w-4xl` container (standard CSS breakout pattern)
- Float classes use `float-left`/`float-right` with `mr-4`/`ml-4` margin and `clear` rules

**Editor UX:** Add alignment and size dropdowns to MdcToolbar field definitions for media components. No Tiptap architecture changes needed.

**Tasks:**
- [ ] Add `align`, `size`, `float`, `caption` props to media MDC components
- [ ] Create shared CSS utility classes for layout (e.g., `.mdc-align-left`, `.mdc-size-medium`, `.mdc-float-right`)
- [ ] Add full-width breakout CSS (negative margin pattern for `align="full"`)
- [ ] Update MdcToolbar to include alignment/size fields on media insert dialogs
- [ ] Update MdcBlockExtension to pass new props through to rendered components

#### Tier 2 — Container Components (Moderate)
New MDC components that wrap arbitrary markdown content using triple-colon syntax.

**Components to build:**

| Component | Purpose | Education Use Case |
|-----------|---------|-------------------|
| `callout` | Boxed text with icon/color by type | Tips, warnings, definitions, key concepts, learning objectives |
| `accordion` | Collapsible section with title | FAQ, progressive disclosure, self-assessment answers |
| `card` | Styled card with optional title/image | Highlighted content blocks, summaries |
| `figure` | Captioned wrapper for any content | Images with credits, diagrams with descriptions |

**Markdown syntax (container format):**
```md
:::callout{type="info" title="Key Concept"}
The **OER Schema** defines metadata for open educational resources.
:::

:::accordion{title="Click to reveal the answer"}
The answer is **42**. This is because...
:::

:::card{title="Summary" variant="outlined"}
This lesson covered three main topics:
1. First topic
2. Second topic
3. Third topic
:::

:::figure{caption="Figure 1: System Architecture" align="center"}
::image-component{src="/img/architecture.png" alt="Architecture diagram"}::
:::
```

**Callout types and styling:**
| Type | Icon | Color | Use Case |
|------|------|-------|----------|
| `info` | ℹ️ | Blue | General information |
| `tip` | 💡 | Green | Helpful tips, best practices |
| `warning` | ⚠️ | Amber | Cautions, common mistakes |
| `danger` | 🚫 | Red | Critical warnings, errors |
| `definition` | 📖 | Purple | Terms, glossary entries |
| `objective` | 🎯 | Teal | Learning objectives |

**Vue component pattern:**
```vue
<!-- components/content/Callout.vue -->
<template>
  <div :class="['callout', `callout-${type}`]" role="note">
    <div class="callout-icon">{{ icon }}</div>
    <div class="callout-content">
      <div v-if="title" class="callout-title">{{ title }}</div>
      <MDCSlot unwrap="p" />
    </div>
  </div>
</template>
```

**Tasks:**
- [ ] Create `components/content/Callout.vue` with type variants and styling
- [ ] Create `components/content/Accordion.vue` using shadcn-vue/radix-vue accordion primitives
- [ ] Create `components/content/CardBlock.vue` (name avoids shadcn `Card` conflict)
- [ ] Create `components/content/Figure.vue` with caption and alignment support
- [ ] Add CSS for all container component variants (Tailwind utilities + custom classes)
- [ ] Document triple-colon syntax for content authors
- [ ] Test nested markdown rendering with `<MDCSlot unwrap="p" />`

**Editor integration (deferred to Tier 2b):**
- [ ] Implement Tiptap container node type for editable nested content
- [ ] OR implement code-mode insertion helpers (toolbar buttons that insert `:::` boilerplate)
- [ ] Add container component previews in the rich editor

#### Tier 3 — Layout Primitives (Advanced)
Multi-column layouts and spatial arrangement.

**Components:**

| Component | Purpose | Syntax |
|-----------|---------|--------|
| `columns` | Side-by-side column layout | `:::columns{count="2"}` with `:::col` dividers |
| `divider` | Horizontal rule with optional label | `:::divider{label="Section 2"}:::` |
| `spacer` | Vertical spacing control | `::spacer{size="lg"}::` (atom, not container) |

**Column syntax:**
```md
:::columns{count="2" gap="lg"}
#left
This content appears in the **left column**.

#right
This content appears in the **right column**.
:::
```

**Tasks:**
- [ ] Create `components/content/Columns.vue` with named slots and responsive collapse
- [ ] Create `components/content/ContentDivider.vue` (avoids HTML `<hr>` naming)
- [ ] Create `components/content/Spacer.vue` (atom component, simple)
- [ ] Implement responsive behavior (columns stack on mobile)
- [ ] Test with various content combinations (media inside columns, etc.)

### Dependencies
- **Tier 1** has no blockers — can begin immediately using existing atom-block architecture
- **Tier 2** requires decisions on editor integration approach (code-mode vs. nested Tiptap nodes)
- **Tier 3** depends on Tier 2 container infrastructure being proven

### Design Principles
1. **Minimal and composable** — A few well-designed primitives that combine, not dozens of specialized blocks
2. **Markdown-first** — All layout expressed in standard MDC syntax, stored as plain markdown files
3. **Progressive enhancement** — Content remains readable without layout styling (graceful degradation)
4. **Mobile-responsive** — All layout components collapse sensibly on small screens
5. **Accessible** — Semantic HTML, ARIA roles, keyboard navigation (especially accordion)
6. **Education-focused** — Prioritize components that serve teaching: callouts for key concepts, accordions for self-assessment, figures for diagrams

---

## Future Phases (Post-Launch)

### Real-Time Collaboration
- WebSocket-based co-editing (Tiptap Collaboration extension)
- Presence indicators (who's editing what)
- Conflict-free saves

### AI-Assisted Authoring
- AI-generated descriptions, learning objectives, tags
- Content suggestions based on existing materials
- Auto-prerequisite detection from content analysis
- Integration with existing chatbot system

### Common Cartridge Export
- Generate IMS Common Cartridge packages from courses/pathways
- LTI integration for LMS platforms

### Multi-Repository Support
- Extend config parser to support multiple repos
- Cross-repo content referencing

---

## Timeline Summary

| Phase | Focus | Status |
|---|---|---|
| **Phase 0** | Foundation, config parser, auth, content browser | ✅ Complete |
| **Phase 1** | Form engine, basic widgets, git save, all collections editable | ✅ Complete |
| **Phase 2** | Complex widgets (list, typed list, relation, file) | ✅ Complete |
| **Phase 3** | Markdown editor (Tiptap + CodeMirror + MDC components) | ✅ Complete |
| **Phase 4** | Media manager | ✅ Complete |
| **Phase 5** | Editorial workflow, sync, conflict resolution, batch publish | ✅ Complete |
| **Phase 6** | Education-specific UX (custom builders) | ⬜ **Next up** |
| **Phase 7** | Outline Builder integration | ⬜ Planned |
| **Phase 8** | Bulk operations & analytics | ⬜ Planned |
| **Phase 9** | Polish, testing, migration | ⬜ Planned (some items done) |
| **Phase 10** | Layout & design components (Tier 1→3) | ⬜ Planned |

**Total estimated timeline: 14 weeks (~3.5 months)**

### Acceleration Strategies

- **AI-assisted development**: Use Copilot for boilerplate widget components (each follows the same pattern)
- **Skip Phase 4 initially**: Use Decap for media uploads only; build custom media manager later
- **Skip Phase 5 initially**: Direct commits to main for solo author; add editorial workflow when needed
- **Prioritize Phase 6**: If custom education UX is the main motivation, jump to Phase 6 after Phase 2

### Minimum Viable CMS (Fast Track — 4–5 weeks)

If time is constrained, build only:

| Phase | What | Time |
|---|---|---|
| Phase 0 | Config parser, auth, content browser | 1 week |
| Phase 1 | Basic widgets + simple save (direct to main) | 1.5 weeks |
| Phase 2 | Complex widgets (list, relation, typed list) | 1.5 weeks |
| Phase 3 | Markdown editor (Tiptap, basic toolbar) | 1 week |

This gives you a working CMS for all collections in ~5 weeks. Media uploads and editorial workflow stay on Decap.

---

## Dependencies to Install

```bash
# Core
npm install @octokit/rest           # GitHub API
npm install @tiptap/vue-3            # Rich text editor
npm install @tiptap/starter-kit      # Tiptap extensions
npm install tiptap-markdown          # Markdown ↔ Tiptap
npm install js-yaml                  # YAML parsing

# Optional (later phases)
npm install @tiptap/extension-collaboration  # Real-time collab
npm install @tiptap/extension-image          # Image handling in editor
npm install vuedraggable@next                # Drag-and-drop lists
```

---

## File Structure

```
lib/cms/
  config-parser.ts          # Parse config.yml → TypeScript types
  config-types.ts           # Type definitions
  git-backend.ts            # GitHub API operations
  local-backend.ts          # Filesystem operations for dev
  slug-utils.ts             # Slug generation matching Decap patterns

composables/
  useCmsAuth.ts             # Authentication state
  useCmsConfig.ts           # Parsed config access
  useCmsContent.ts          # Content reading (via Nuxt Content)
  useCmsSave.ts             # Save/commit operations
  useCmsDrafts.ts           # Draft/PR management
  useCmsMedia.ts            # Media upload/browse

components/cms/
  DynamicField.vue          # Widget router
  CollectionForm.vue        # Auto-generated form
  ContentBrowser.vue        # Collection list/grid
  
  fields/                   # One component per widget type
    CmsString.vue
    CmsText.vue
    CmsMarkdown.vue
    CmsSelect.vue
    CmsBoolean.vue
    CmsDatetime.vue
    CmsImage.vue
    CmsFile.vue
    CmsList.vue
    CmsTypedList.vue
    CmsRelation.vue
    CmsObject.vue
    CmsHidden.vue

  editor/                   # Markdown editor
    MarkdownEditor.vue
    EditorToolbar.vue
    MdcToolbar.vue
    MdcComponentModal.vue
    CodeEditor.vue

  media/                    # Media manager
    MediaBrowser.vue
    MediaUpload.vue
    MediaGrid.vue

  custom/                   # Education-specific UX
    PrerequisitesBuilder.vue
    LessonComposer.vue
    SpecializationBuilder.vue
    PathwayBuilder.vue
    AILicenseSelector.vue
    RubricEditor.vue
    OutlineBuilder.vue

layouts/
  cms.vue                   # Admin layout

middleware/
  cms-auth.ts               # Auth guard

pages/cms/
  index.vue                 # Dashboard
  media.vue                 # Media manager
  drafts.vue                # Draft PRs
  analytics.vue             # Content analytics
  bulk/
    index.vue               # Bulk operations
  outline-builder.vue       # Course creation
  versions/
    [collection]/
      [...slug].vue         # Version management
  [collection]/
    index.vue               # Collection browser
    new.vue                 # Create new item
    edit/
      [...slug].vue         # Edit existing item

server/api/cms/
  config.get.ts             # Serve parsed config
  auth/
    github.ts               # OAuth flow
    session.get.ts           # Current session
    logout.post.ts           # Logout
  content/
    save.post.ts             # Save via GitHub API
    save-direct.post.ts      # Direct commit (dev/trusted)
    [collection]/
      [...slug].get.ts       # Read single item
  media/
    upload.post.ts           # File upload
    list.get.ts              # Browse media
    delete.post.ts           # Delete file
  drafts/
    list.get.ts              # List open PRs
    publish.post.ts          # Merge PR
    discard.post.ts          # Close PR + delete branch
  local/
    read.get.ts              # Filesystem read (dev)
    write.post.ts            # Filesystem write (dev)
```

---

## Success Criteria

**Phase 0–2 complete (Minimum Viable): ✅ DONE**
- [x] All 10 collections browsable in custom UI
- [x] All widget types render and accept input
- [x] Content saves produce valid markdown identical to Decap output
- [x] Can create new content and edit existing content

**Phase 3–5 complete (Feature Parity): ✅ DONE**
- [x] Markdown editing with MDC components matches Decap
- [x] Media upload works without Decap
- [x] Editorial workflow (draft → review → publish) works
- [x] Sync checking, conflict resolution, batch publishing
- [x] No reason to use Decap for standard editing

**Phase 6+ complete (Beyond Decap): ⬜ IN PROGRESS**
- [ ] Custom education UX that Decap cannot provide
- [ ] Outline Builder creates courses
- [ ] Bulk operations save hours of manual work
- [ ] Content health checks catch issues proactively
