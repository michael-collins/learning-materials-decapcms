# Content Versioning System

This document explains the content versioning system built into the custom CMS.

## Overview

When content (exercises, tutorials, etc.) is embedded in external courses, users rely on stable, unchanging versions. This system creates immutable version snapshots while allowing updates through new version releases.

## How It Works

### File Structure

Each content item uses a directory-based structure:

```
content/lessons/
├── animation-basics/
│   ├── index.md            # Current working version (latest)
│   └── v/
│       ├── 1.0.0.md        # Archived snapshot
│       ├── 1.1.0.md        # Archived snapshot
│       └── 1.2.0.md        # Archived snapshot
```

- `index.md` — always the latest version, editable
- `v/{version}.md` — archived snapshots, read-only by convention

### Version Frontmatter

```yaml
---
title: "Animation Basics"
version: "2.0.0"               # Semantic version number
versionStatus: "latest"         # latest | archived
changelog: "Major rewrite"      # What changed in this version
---
```

Archived versions have `versionStatus: "archived"` and a `_snapshotCreatedAt` timestamp.

## CMS Version Management

### Creating a New Version

Two ways to create a new version from the edit page:

1. **Save as New Version** — from the Save button dropdown (local backend)
   - Saves current form data to disk
   - Opens the version dialog to choose a version bump (major/minor/patch/custom)
   - Archives the current version as a snapshot in `v/`
   - Updates `index.md` with the new version number

2. **Publish as New Version** — from the Publish to GitHub dropdown
   - Same as above, but also publishes to GitHub after version creation

### Version Switcher

The edit page header shows a version button (e.g., **v2.0.0 ▾**) that:
- Fetches all available versions from the API
- Shows latest version with a "latest" badge
- Lists archived versions below a separator
- Clicking any version navigates to edit it

### Editing Archived Versions

- An amber banner warns when editing an archived version
- Changes are saved to the archived version file (`v/{version}.md`)
- Publishing a modified archived version requires typing "OVERRIDE" (version protection)
- A link to "Edit latest version instead" is always available

### Version API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/cms/content/versions` | List all versions for a content item (local + GitHub modes) |
| `POST /api/cms/content/create-version` | Archive current version and bump to new version (local only) |
| `GET /api/cms/content/read?version=X.Y.Z` | Read a specific archived version |
| `POST /api/cms/content/save-local?version=X.Y.Z` | Save to an archived version file |
| `POST /api/cms/content/save?version=X.Y.Z` | Publish an archived version to GitHub |

## Protection Layers

### CMS Version Protection Dialog
When publishing a modified archived version via the custom CMS, users must type "OVERRIDE" to confirm. This prevents accidental changes to historical snapshots.

### Version Field as Hidden Widget
The `version` and `versionStatus` fields are configured as `widget: "hidden"` in `cms/config.yml`. Authors can't accidentally change version numbers through the form — versioning is managed exclusively through the version creation workflow.

## When to Edit Archived Versions (Rare!)

### ✅ Acceptable Reasons:
1. **Critical Security Issue** - Fix security vulnerability in embedded content
2. **Legal Compliance** - Remove content that violates copyright/licensing
3. **Broken Links/Resources** - Update dead links to essential resources
4. **Accessibility Fix** - Critical accessibility improvements

### ❌ NOT Acceptable:
- Typo fixes (create new version instead)
- Content improvements (create new version instead)
- Style/formatting changes
- Adding new features

## Creating New Versions

Use the CMS version creation UI:

### From the Edit Page

1. Make your changes to the content
2. Click the **Save ▾** dropdown and choose **Save as New Version**
   - Or click the **Publish to GitHub ▾** dropdown and choose **Publish as New Version**
3. In the version dialog, select a bump type:
   - **Major** (2.0.0) — breaking changes
   - **Minor** (1.1.0) — new content or features
   - **Patch** (1.0.1) — bug fixes, typos
   - **Custom** — enter any valid semver
4. Click **Create Version**

The system will:
- Save your current form edits to disk
- Copy the current `index.md` to `v/{currentVersion}.md` with `versionStatus: archived`
- Update `index.md` with the new version number and `versionStatus: latest`
- (If Publish as New Version) Auto-publish to GitHub

### Version Switcher

Click the version button in the edit page header (e.g., **v2.0.0 ▾**) to browse and switch between all versions of the content.

## URL Patterns for Embeds

Users embedding your content can choose their stability level:

```html
<!-- Latest (auto-updates) -->
<iframe src="https://yoursite.com/embed/exercises/animation-basics"></iframe>

<!-- Major version (stays on 1.x) -->
<iframe src="https://yoursite.com/embed/exercises/animation-basics?version=1"></iframe>

<!-- Pinned version (never changes) -->
<iframe src="https://yoursite.com/embed/exercises/animation-basics?version=1.2.0"></iframe>
```

## Emergency Override Procedure

If you MUST edit an archived version:

1. Navigate to the archived version via the version switcher
2. Make your changes
3. Click Publish to GitHub
4. Type "OVERRIDE" in the version protection dialog
5. Document the reason in the commit message
6. Consider creating a new version (e.g., 1.2.1 hotfix) instead

## Related Files

- `server/api/cms/content/create-version.post.ts` — Version creation API
- `server/api/cms/content/versions.get.ts` — Version listing API
- `components/cms/CreateVersionDialog.vue` — Version creation UI
- `components/cms/VersionProtectionDialog.vue` — Override protection for archived versions
- `cms/config.yml` — Collection config with version fields
- `composables/useCmsSave.ts` — Version-aware save/publish
- `composables/useCmsSync.ts` — Version-aware sync check

## FAQ

**Q: I made a typo in an archived version. Can I fix it?**
A: No. Create a new version (bump patch number) with the fix. Users can upgrade when ready.

**Q: What if the typo is really embarrassing?**
A: Still create a new version. If it's a critical error, document it in the changelog and notify users through your usual channels.

**Q: Can I delete old versions?**
A: No. Once published, versions must remain available. You can mark them as `deprecated` but not delete them.

**Q: What happens if I bypass all protections and force-push?**
A: The integrity validation will fail in CI, and deployed sites may break user embeds. Don't do this.

**Q: How do I deprecate a version?**
A: Update the `versionStatus` to `deprecated`.

## Book Outline Version Pinning

### Overview

Book outlines can pin individual content references to specific versions, ensuring that a book's chapters remain stable even as the underlying content evolves. This bridges the content versioning system with the book publishing system — authors can lock a book to known-good versions of each chapter's content.

### Schema

The `outlineLeaf` schema in `content.config.ts` includes an optional `version` field:

```ts
const outlineLeaf = z.object({
  title: z.string(),
  path: z.string().optional(),
  content: z.string().optional(),
  icon: z.string().optional(),
  imported: z.boolean().optional(),
  locked: z.boolean().optional(),
  importChildren: z.boolean().optional(),
  version: z.string().optional(),   // ← pinned content version (e.g., "1.2.0")
})
```

When `version` is set, the outline item references a specific archived version (e.g., `lessons/animation-basics/v/1.2.0`) rather than the latest version.

### How It Works

#### In the CMS Outline Builder (`CmsOutlineEditor.vue`)

- **Selecting content**: When an author links content to an outline item via the content picker, they can choose a specific version from the version dropdown. The chosen version string (e.g., `"1.2.0"`) is stored on the outline item.
- **Version badge**: Pinned items display a blue version badge (e.g., `v1.2.0`) next to the content reference badge in the outline tree.
- **Unlinking content**: Clearing a content reference also clears the pinned version.
- **Picker pre-selection**: Re-opening the content picker for an already-linked item pre-filters to the item's collection, boosts the current item to the top of search results, pre-selects the pinned version in the dropdown, and highlights the current item with a blue border.

#### Version Propagation

The `version` field flows through the entire rendering pipeline:

| Layer | Interface | Field |
|---|---|---|
| Schema | `outlineLeaf` (content.config.ts) | `version: z.string().optional()` |
| Composable | `OutlineNode` / `OutlineItem` (useOutlineBuilder.ts) | `version?: string` |
| CMS Editor | `FlatItem` (CmsOutlineEditor.vue) | `version: string` |
| Book Outline | `FlatChapter` (useBookOutline.ts) | `version?: string` |
| Sidebar Tree | `SidebarNode` (useBookOutline.ts) | `version?: string` |
| Chapter Page | `[...path].vue` (pages/books/) | `contentVersion` computed |

#### On Book Chapter Pages (`pages/books/[book]/[...path].vue`)

- A version badge with a `GitBranch` icon displays the pinned version (e.g., `v1.2.0`) in the chapter metadata row.
- The version status (`latest` or `archived`) is shown alongside.
- The "View original →" link includes a `?version=X.Y.Z` query parameter for non-latest versions, linking directly to the archived version's edit page.

### Content Path Format

| Scenario | Content Path | Version Field |
|---|---|---|
| Latest (unpinned) | `lessons/animation-basics` | `""` (empty) |
| Pinned to version | `lessons/animation-basics` | `"1.2.0"` |
| Resolved URL (pinned) | `lessons/animation-basics/v/1.2.0` | — |

The content path stored in the outline always uses the base slug (without `/v/X.Y.Z`). The version is stored separately in the `version` field. Resolution to the full versioned path happens at render time.

### Related Files

- `content.config.ts` — `outlineLeaf` schema with `version` field
- `composables/useOutlineBuilder.ts` — `OutlineNode` and `OutlineItem` with version, flat↔nested conversion
- `composables/useBookOutline.ts` — `FlatChapter` and `SidebarNode` with version propagation
- `components/cms/fields/CmsOutlineEditor.vue` — Version selection in picker, version badge in tree, pre-selection UX
- `pages/books/[book]/[...path].vue` — Version badge and versioned "View original" link

---

## Related Documentation

- [Custom CMS Roadmap](CUSTOM_CMS_ROADMAP.md) — Phase 5.5 covers version management implementation, Phase 7 covers book publishing
- [Feature Roadmap](FEATURE_ROADMAP.md) — Section 3 covers the OER Course Book Publishing System
- [Outline Builder Plan](OUTLINE_BUILDER_PLAN.md) — Course outline builder (separate from book outline)

---

*Last Updated: July 14, 2025*
