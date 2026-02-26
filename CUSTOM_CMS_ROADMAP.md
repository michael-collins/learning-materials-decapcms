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

## Phase 0 — Foundation (Week 1)

**Goal:** Project scaffolding, config parser, auth, and a working read-only content browser.

### 0.1 Config Parser

- [ ] **`lib/cms/config-parser.ts`** — Parse `config.yml` into typed TypeScript interfaces
  - `DecapConfig` (backend, media_folder, collections)
  - `DecapCollection` (name, label, folder, slug, path, fields, view_filters, sort)
  - `DecapField` (label, name, widget, required, default, options, hint, pattern, fields, types, collection, value_field, search_fields, display_fields, multiple)
- [ ] **`server/api/cms/config.get.ts`** — Endpoint that serves parsed config (cached)
- [ ] **`composables/useCmsConfig.ts`** — Client-side composable to fetch and cache config

### 0.2 Authentication

- [ ] **`server/api/cms/auth/github.ts`** — GitHub OAuth flow (reuse same GitHub App as Decap)
  - Exchange code for token
  - Store token in httpOnly cookie
  - Return user profile (login, avatar)
- [ ] **`server/api/cms/auth/session.get.ts`** — Get current session
- [ ] **`server/api/cms/auth/logout.post.ts`** — Clear session
- [ ] **`composables/useCmsAuth.ts`** — Auth state, login/logout, guard
- [ ] **`middleware/cms-auth.ts`** — Route middleware protecting `/cms/**`

### 0.3 CMS Layout & Navigation

- [ ] **`layouts/cms.vue`** — Admin layout with sidebar, top bar, user menu
- [ ] **`pages/cms/index.vue`** — Dashboard: collection cards with item counts, recent edits, quick links
- [ ] **`pages/cms/[collection]/index.vue`** — Collection browser (list/grid toggle, filters, search, sort)
- [ ] Sidebar generated from config collections (auto-grouped by type)
- [ ] Link to legacy Decap admin (`/admin`) in footer/sidebar

### 0.4 Content Reading (via Nuxt Content)

- [ ] **`composables/useCmsContent.ts`** — Wrapper around `queryContent()` for CMS views
  - List items in a collection with pagination
  - Search by title/description
  - Filter by view_filters from config (published/unpublished/all)
  - Sort by sortable_fields from config

**Milestone: Browse all collections and items in a custom UI. No editing yet.**

---

## Phase 1 — Form Engine & Basic Widgets (Weeks 2–3)

**Goal:** Dynamic form generation from config, covering simple widget types. Edit and save one collection (articles — simplest schema).

### 1.1 Dynamic Field Components

Build one Vue component per Decap widget type. Each receives a `DecapField` definition and `v-model`:

- [ ] **`components/cms/fields/CmsString.vue`** — Text input with validation (supports `pattern`)
- [ ] **`components/cms/fields/CmsText.vue`** — Textarea
- [ ] **`components/cms/fields/CmsBoolean.vue`** — Switch (shadcn style)
- [ ] **`components/cms/fields/CmsSelect.vue`** — Dropdown, supports `multiple: true` for multi-select
- [ ] **`components/cms/fields/CmsDatetime.vue`** — Date/time picker
- [ ] **`components/cms/fields/CmsHidden.vue`** — Hidden field with default value
- [ ] **`components/cms/fields/CmsNumber.vue`** — Number input (future-proofing)

### 1.2 DynamicField Router

- [ ] **`components/cms/DynamicField.vue`** — Routes `field.widget` → correct component
- [ ] **`components/cms/CollectionForm.vue`** — Renders all fields for a collection, manages form state
- [ ] Form validation based on `required`, `pattern`, `hint` from config

### 1.3 Git Write Operations

- [ ] **`server/api/cms/content/save.post.ts`** — Save content to GitHub
  - Read current file (if editing)
  - Create branch (`cms/{collection}/{slug}-{timestamp}`)
  - Commit markdown file with frontmatter (gray-matter stringify)
  - Create PR with descriptive title
  - Return PR URL
- [ ] **`server/api/cms/content/save-direct.post.ts`** — Direct commit to main (for local dev / trusted authors)
- [ ] **`composables/useCmsSave.ts`** — Client-side save with loading/error states

### 1.4 Editor Pages

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

## Phase 2 — Complex Widgets (Weeks 3–4)

**Goal:** Support the remaining widget types that make up the bulk of your content complexity.

### 2.1 List Widget

- [ ] **`components/cms/fields/CmsList.vue`** — Repeatable field group
  - Add/remove items
  - Drag-to-reorder (use `@vueuse/core` useSortable or vuedraggable)
  - Supports `fields` (fixed structure per item)
  - Supports `field` (single field per item, e.g., tags, skills)

### 2.2 Typed List Widget (Polymorphic)

- [ ] **`components/cms/fields/CmsTypedList.vue`** — List with `types` (used by prerequisites, lesson items)
  - Type selector dropdown per item
  - Renders different field sets per type
  - Manages `__typename` hidden field
  - Drag-to-reorder
  - **This is the hardest widget** — prerequisites span 8 content types

### 2.3 Relation Widget

- [ ] **`components/cms/fields/CmsRelation.vue`** — Content reference picker
  - Fetch items from referenced `collection` via Nuxt Content
  - Searchable dropdown (combobox) using `search_fields`
  - Display with `display_fields`
  - Stores `value_field` (slug)
  - Supports `multiple: true` for ordered multi-select (specializations → lessons, pathways → specializations)
  - Drag-to-reorder for multi-select

### 2.4 Object Widget

- [ ] **`components/cms/fields/CmsObject.vue`** — Nested field group
  - Renders child `fields` recursively using DynamicField
  - Collapsible section in form

### 2.5 File & Image Widgets

- [ ] **`components/cms/fields/CmsImage.vue`** — Image upload with preview
  - Upload to `public/uploads` (via API)
  - Show thumbnail preview
  - Alt text companion field
- [ ] **`components/cms/fields/CmsFile.vue`** — Generic file upload
  - Upload to `public/uploads`
  - Show filename and size
- [ ] **`server/api/cms/media/upload.post.ts`** — Handle file uploads
  - Local dev: write to filesystem
  - Production: commit to GitHub via API

**Milestone: All 10 collections fully editable. Every Decap widget type replicated.**

---

## Phase 3 — Markdown Editor (Week 4–5)

**Goal:** A rich markdown editor with toolbar, MDC component insertion, and live preview.

### 3.1 Tiptap Integration

- [ ] **`components/cms/editor/MarkdownEditor.vue`** — Main editor component
  - Tiptap with `tiptap-markdown` extension for markdown ↔ rich-text
  - Toolbar: bold, italic, headings (1-3), lists (ordered/unordered), blockquote, code block, horizontal rule, link, image
  - Keyboard shortcuts matching standard conventions
  - Responsive: full-width on mobile, split-pane on desktop

### 3.2 MDC Component Toolbar

- [ ] **`components/cms/editor/MdcToolbar.vue`** — "Insert Component" dropdown
  - YouTube Video
  - Video Embed (iframe)
  - Google Slides
  - Assessment Rubric
  - Sketchfab Model
  - 3D Model Upload
- [ ] Each opens a modal with the component's fields, inserts `::component{props}::` syntax
- [ ] **`components/cms/editor/MdcComponentModal.vue`** — Reusable modal for MDC insertion
  - Auto-generates fields from a component definition (same pattern as editor-components.js)

### 3.3 Editor Preview

- [ ] Split-pane view: editor left, rendered preview right
- [ ] Preview renders markdown → HTML with Nuxt Content's markdown pipeline
- [ ] MDC components render as styled placeholder cards (similar to Decap's toPreview)
- [ ] Toggle between: Edit only | Split | Preview only

### 3.4 Code Mode

- [ ] Raw markdown editing mode (Monaco or CodeMirror)
- [ ] Toggle between rich-text and raw modes
- [ ] Syntax highlighting for markdown + frontmatter

**Milestone: Rich markdown editing with MDC components. Matches or exceeds Decap's editor.**

---

## Phase 4 — Media Manager (Week 5–6)

**Goal:** Browse, upload, and manage files in `public/uploads/`.

### 4.1 Media Browser

- [ ] **`pages/cms/media.vue`** — Full media manager page
- [ ] **`components/cms/media/MediaBrowser.vue`** — Reusable browser (also used in image/file fields)
  - Grid view with thumbnails (images), icons (other files)
  - List view with name, size, date
  - Folder navigation
  - Search by filename
  - File type filtering (images, documents, 3D models, all)

### 4.2 Upload

- [ ] Drag-and-drop upload zone
- [ ] Multi-file upload with progress
- [ ] Auto-generate unique filenames (avoid collisions)
- [ ] Image optimization on upload (optional: generate thumbnails)

### 4.3 Media Operations

- [ ] Delete file (with confirmation + usage check)
- [ ] Rename file
- [ ] Copy URL to clipboard
- [ ] Insert into editor (for markdown editor integration)

### 4.4 Media in Git

- [ ] Local dev: direct filesystem operations
- [ ] Production: commit media files via GitHub API (blob → tree → commit)
- [ ] Handle large files gracefully (GitHub API has 100MB limit)

**Milestone: Complete media management. No need to use Decap for file uploads.**

---

## Phase 5 — Editorial Workflow (Week 6–7)

**Goal:** Branch-based drafts and PR review, matching Decap's `publish_mode: editorial_workflow`.

### 5.1 Draft Management

- [ ] **`pages/cms/drafts.vue`** — List all open draft PRs
- [ ] **`composables/useCmsDrafts.ts`** — Fetch and manage draft PRs via GitHub API
  - List open PRs with `cms/` branch prefix
  - Show status: draft, in review, approved, changes requested
  - Show diff summary (files changed)

### 5.2 Save → Draft Flow

- [ ] When saving, author chooses: "Save as draft" (branch+PR) or "Publish" (direct to main)
- [ ] Draft creates branch `cms/{collection}/{slug}-{timestamp}`
- [ ] Auto-creates PR with labels (`cms`, `draft`, collection name)
- [ ] Author can continue editing the draft (commit to same branch)
- [ ] Multiple edits to the same item accumulate on one branch

### 5.3 Review & Publish

- [ ] View PR diff in CMS (rendered markdown diff, not raw)
- [ ] "Publish" button: merge PR → main via GitHub API
- [ ] "Discard" button: close PR and delete branch
- [ ] Status indicators in content browser (published, draft, in review)

### 5.4 Conflict Resolution

- [ ] Detect when main has advanced since branch was created
- [ ] Offer "Update from main" (rebase/merge) before publishing
- [ ] Show clear error if merge conflicts exist, link to GitHub for manual resolution

**Milestone: Full editorial workflow. Non-technical authors can draft, review, and publish without touching GitHub.**

---

## Phase 6 — Enhanced UX for Education Content (Weeks 7–9)

**Goal:** Custom interfaces that go far beyond what any generic CMS can offer.

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

## Phase 7 — Outline Builder Integration (Weeks 9–10)

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

## Phase 8 — Bulk Operations & Analytics (Weeks 10–11)

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

## Phase 9 — Polish & Migration (Weeks 11–12)

**Goal:** Production-ready CMS that can replace Decap for daily use.

### 9.1 UX Polish

- [ ] Keyboard shortcuts (Cmd+S save, Cmd+N new, Cmd+K search)
- [ ] Command palette integration (reuse existing CommandPalette.vue)
- [ ] Toast notifications for save/error/publish events
- [ ] Autosave drafts to localStorage
- [ ] Unsaved changes warning on navigation
- [ ] Responsive design for tablet/mobile editing
- [ ] Dark mode support (reuse existing theme system)
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

| Phase | Focus | Duration | Cumulative |
|---|---|---|---|
| **Phase 0** | Foundation, config parser, auth, content browser | Week 1 | Week 1 |
| **Phase 1** | Form engine, basic widgets, git save, articles editable | Weeks 2–3 | Week 3 |
| **Phase 2** | Complex widgets (list, typed list, relation, file) | Weeks 3–4 | Week 4 |
| **Phase 3** | Markdown editor (Tiptap + MDC components) | Weeks 4–5 | Week 5 |
| **Phase 4** | Media manager | Weeks 5–6 | Week 6 |
| **Phase 5** | Editorial workflow (drafts, PRs, publish) | Weeks 6–7 | Week 7 |
| **Phase 6** | Education-specific UX (custom builders) | Weeks 7–9 | Week 9 |
| **Phase 7** | Outline Builder integration | Weeks 9–10 | Week 10 |
| **Phase 8** | Bulk operations & analytics | Weeks 10–11 | Week 11 |
| **Phase 9** | Polish, testing, migration | Weeks 11–12 | Week 12 |

**Total estimated timeline: 12 weeks (3 months)**

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

**Phase 0–2 complete (Minimum Viable):**
- [ ] All 10 collections browsable in custom UI
- [ ] All widget types render and accept input
- [ ] Content saves produce valid markdown identical to Decap output
- [ ] Can create new content and edit existing content

**Phase 3–5 complete (Feature Parity):**
- [ ] Markdown editing with MDC components matches Decap
- [ ] Media upload works without Decap
- [ ] Editorial workflow (draft → review → publish) works
- [ ] No reason to use Decap for standard editing

**Phase 6+ complete (Beyond Decap):**
- [ ] Custom education UX that Decap cannot provide
- [ ] Outline Builder creates courses
- [ ] Bulk operations save hours of manual work
- [ ] Content health checks catch issues proactively
