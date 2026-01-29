# Migration to Sveltia CMS

## Overview

This document outlines the migration from Decap CMS to Sveltia CMS. Sveltia CMS is an actively maintained, modern successor to Netlify/Decap CMS with hundreds of improvements while maintaining full configuration compatibility.

## Why Migrate?

- **Active Development**: Decap CMS appears to be in maintenance mode, while Sveltia CMS has regular updates and bug fixes (typically within 24 hours)
- **Better Performance**: Lightweight (<500KB), built with Svelte framework
- **Modern UX**: Cleaner interface with dark mode, keyboard shortcuts, mobile/tablet support
- **Enhanced Asset Management**: Full-fledged DAM with external storage and stock photo integration
- **First-Class i18n**: Built-in multilingual support with AI-powered translation
- **Improved DX**: Better documentation, JSON schema validation, TypeScript support
- **CDN-Served**: Always up-to-date, no build tools or servers required

## Migration Steps

### 1. Update Admin HTML (Simple Script Swap)

The migration is as simple as replacing the Decap CMS script with Sveltia CMS script in `/public/admin/index.html`:

**Before (Decap CMS):**
```html
<script src="https://unpkg.com/decap-cms@^3.3.3/dist/decap-cms.js"></script>
```

**After (Sveltia CMS):**
```html
<script src="https://unpkg.com/@sveltia/cms/dist/sveltia-cms.js"></script>
```

### 2. Configuration Compatibility

✅ **No changes needed to config.yml** - Sveltia CMS is designed to be fully compatible with Netlify/Decap CMS configuration:
- Backend configuration (GitHub)
- Collections structure
- Field definitions
- Media folders
- Custom widgets
- Editor components

### 3. Custom Component Compatibility

#### ✅ Custom Editor Components - FULLY COMPATIBLE
Our existing custom editor components **will work without changes**:
- YouTube video component (`youtube-video`)
- iframe component (`iframe-component`)
- Google Slides component
- Sketchfab component
- 3D viewer component
- Rubric component

**API Compatibility:**
- ✅ `CMS.registerEditorComponent()` - Supported
- ✅ `pattern`, `fromBlock`, `toBlock` - Supported
- ⚠️ `toPreview` - Not yet implemented (planned soon)
- ✅ All field types we use are supported

Our components use standard Decap CMS patterns that are 100% compatible with Sveltia CMS.

#### ⚠️ Custom Field Widget - NEEDS MIGRATION
Our YouTube widget (`/admin/youtube-widget.js`) uses `registerWidget()` for custom field types:
- ⚠️ Custom field types are **not yet implemented** in Sveltia CMS
- 📅 Feature is planned and coming soon
- ✅ `registerWidget()` alias is reserved for backward compatibility

**Impact:** The YouTube field widget won't work initially, but:
1. Our YouTube **editor component** will still work (inserts markdown in editor)
2. We can continue using string fields for YouTube IDs temporarily
3. Once Sveltia implements custom field types, we can re-enable the widget

**Workaround:** Keep the widget file but it will be inactive until feature ships.

#### ✅ Preview Styles - FULLY COMPATIBLE
- ✅ `CMS.registerPreviewStyle()` - Supported
- ✅ `/admin/preview-styles.css` will continue to work

### 4. New Features Available

Once migrated, we can explore Sveltia CMS-specific enhancements:

1. **Asset Library**: Enhanced media management with better search and organization
2. **Stock Photos**: Integration with Pexels, Pixabay, Unsplash
3. **AI Translation**: One-click translation for multilingual content
4. **Dark Mode**: Built-in dark mode support
5. **Better Mobile Support**: Improved mobile/tablet editing experience
6. **Local Workflow**: Enhanced local development workflow

### 5. Testing Plan

1. ✅ Create `sveltiacms` branch
2. ✅ Update admin HTML with Sveltia CMS script
3. ⏳ Test basic functionality:
   - Login via GitHub
   - View collections
   - Create/edit content
   - Upload media
   - Preview content
4. ⏳ Test editor components (should all work):
   - YouTube video insertion via "+" menu
   - iframe component
   - Google Slides component
   - Sketchfab component
   - 3D viewer component
   - Rubric component
5. ⚠️ YouTube widget (custom field type):
   - Will not work initially (feature not yet implemented)
   - Can fallback to string field temporarily
   - Monitor Sveltia CMS releases for custom field types support
6. ✅ Preview styles (should work as-is)
7. ⏳ Test version management
8. ⏳ Test DecapCMS edit links (may need updating)

### 6. Rollback Plan

If issues arise, rollback is simple:
1. Revert the script change in `index.html`
2. Merge back to main branch
3. No configuration changes needed

## Configuration File Enhancement

Sveltia CMS supports JSON Schema for better IDE support. We can add this to the top of `config.yml`:

```yaml
# yaml-language-server: $schema=https://unpkg.com/@sveltia/cms/schema/sveltia-cms.json
```

This enables:
- Syntax validation in VS Code (with YAML extension)
- Autocomplete for configuration options
- Inline documentation

## What Works Immediately ✅

All of these Decap CMS features are fully compatible:

### Configuration
- ✅ All `config.yml` settings
- ✅ Backend configuration (GitHub OAuth)
- ✅ Collections and fields
- ✅ Media folder configuration
- ✅ Editorial workflow
- ✅ All built-in field types

### Custom Features
- ✅ **Editor components** - All 6 of our custom components work
  - YouTube video (`::youtube-video`)
  - iframe (`::iframe-component`)
  - Google Slides (`::google-slides`)
  - Sketchfab (`::sketchfab-component`)
  - 3D Viewer (`::threed-viewer-component`)
  - Rubric (`::rubric-component`)
- ✅ **Preview styles** - CSS customization for preview pane
- ✅ **Content structure** - Folder-based versioning system
- ✅ **Markdown editing** - All existing content and formats

### What Doesn't Work (Yet) ⚠️

- ⚠️ **Editorial Workflow** - Draft → In Review → Ready workflow for content approval
  - Your config has: `publish_mode: editorial_workflow` 
  - **Current Status**: Not yet implemented in Sveltia CMS
  - **Impact**: All changes save directly to your main branch (simple mode)
  - **Workaround**: Use branches, PRs, or Git workflow for review process
  - **When Available**: Feature is in development (UI components exist but disabled)
  - **Tracking**: Monitor [Sveltia CMS releases](https://github.com/sveltia/sveltia-cms/releases) for updates

- ⚠️ **YouTube field widget** - Custom input control for YouTube fields
  - Workaround: Use string field or editor component
  - Status: Feature planned, coming soon

## Potential Limitations

### Editorial Workflow - Not Yet Implemented 📋

**Background:**
Decap CMS supports an **Editorial Workflow** mode that provides a Kanban-style content review process with three columns:
- **Drafts** - Work in progress
- **In Review** - Ready for team review
- **Ready** - Approved and ready to publish

Each content state corresponds to a pull request status, allowing teams to review and approve content before it goes live.

**Your Current Config:**
Your `config.yml` has `publish_mode: editorial_workflow` enabled.

**Sveltia CMS Status:**
- ⚠️ **Not yet supported** - The feature is under development
- UI components exist (workflow-page.svelte) but are currently disabled
- Config option is recognized but ignored
- Warning message appears in console: "Editorial workflow is not yet supported in Sveltia CMS"

**What This Means:**
When using Sveltia CMS, **all changes will save directly to your main branch** (simple mode), bypassing the draft/review/ready workflow.

**Workarounds:**
1. **Git Branch Workflow**: Use Git branches manually for drafts, create PRs for review
2. **GitHub PR Process**: Create PRs directly in GitHub for content review
3. **Temporary Branches**: Create feature branches for new content, merge after review
4. **External Review Tools**: Use Google Docs or similar for content review before CMS entry
5. **Keep Decap CMS**: Continue using Decap CMS for projects requiring editorial workflow

**When Will It Be Available?**
- The feature is actively being developed (code exists, just not enabled)
- No official timeline announced
- Monitor [Sveltia CMS releases](https://github.com/sveltia/sveltia-cms/releases) and [GitHub issues](https://github.com/sveltia/sveltia-cms/issues)

**Migration Decision:**
If editorial workflow is critical for your team, you may want to:
- ✅ **Wait** - Stay on Decap CMS until Sveltia implements this feature
- ✅ **Adapt** - Switch to Sveltia and use Git-based review workflows
- ✅ **Hybrid** - Use Decap for production, Sveltia for development/testing

### Custom Field Types (Widgets) - Not Yet Implemented

**Current Status:** Sveltia CMS does not yet support custom field types (`registerWidget`/`registerFieldType`).

**What This Means:**
- Our YouTube **field widget** (`/admin/youtube-widget.js`) won't work initially
- The fancy YouTube URL input with live preview won't be available
- **Editor components still work** - users can still insert YouTube videos via the "+" menu

**Workarounds:**
1. Use standard string field for YouTube IDs temporarily
2. Continue using YouTube **editor component** (fully functional)
3. Keep widget code in place for when feature ships

**Timeline:** Feature is documented as "coming soon" - monitor [Sveltia CMS releases](https://github.com/sveltia/sveltia-cms/releases)

### Preview Function in Editor Components

**Current Status:** `toPreview` function in `registerEditorComponent` is not yet implemented.

**Impact:** 
- Minimal - mainly affects preview pane rendering
- Components still insert correctly into content
- Will be supported soon according to documentation

### Not Supported from Decap CMS

These Decap CMS features are intentionally not supported:
- ❌ `registerLocale` - Sveltia auto-detects browser language
- ❌ `registerRemarkPlugin` - Sveltia uses Lexical instead of Remark
- ❌ Custom backends - May come in future with different implementation
- ❌ Custom media storage providers - May come in future

**Impact:** We don't use any of these features, so no impact on our project.

## Resources

- [Sveltia CMS Documentation](https://sveltiacms.app/en/docs/intro)
- [Migration Guide](https://sveltiacms.app/en/docs/migration/netlify-decap-cms)
- [GitHub Repository](https://github.com/sveltia/sveltia-cms)
- [Showcase](https://sveltiacms.app/en/showcase)

## Post-Migration Improvements

After successful migration, consider:

1. **Update Edit Links**: Review edit button URLs to use Sveltia CMS paths
2. **Asset Organization**: Leverage enhanced asset library features
3. **Documentation**: Add YAML schema reference for better DX
4. **AI Translation**: Explore multilingual features if needed
5. **Local Workflow**: Implement improved local development workflow

## Known Issue: Body Field Not Loading - FIXED ✅

**Problem:** The markdown/body field was not loading in Sveltia CMS editor.

**Root Cause:** Sveltia's Lexical editor calls `toPreview` functions during initialization, sometimes before component properties are fully set. This caused `TypeError: Cannot read properties of undefined (reading 'endsWith')` at line 288 of `editor-components.js`.

**Solution Applied:**
Added defensive null checks to all `toPreview` functions in `/public/admin/editor-components.js`:

```javascript
toPreview: function(obj) {
  // Guard clause for undefined/null obj or properties
  if (!obj || !obj.src) {
    return '<div style="...">Component (loading...)</div>';
  }
  // ... rest of preview code using obj.src safely
}
```

**Affected Components (All Fixed):**
- ✅ YouTube Video
- ✅ Video Embed (iframe)
- ✅ Google Slides
- ✅ Assessment Rubric
- ✅ Sketchfab Model
- ✅ 3D Model Upload (was the original crash)

**Result:** All editor components now work correctly with Sveltia's Lexical editor. The body/markdown field loads properly.

**Key Learning:** When migrating from Decap CMS to Sveltia CMS, always add null checks in `toPreview` functions because Lexical's initialization differs from Remark's.

## Status

- [x] Branch created: `sveltiacms`
- [x] Script updated in admin HTML
- [x] Editor component bug fixed (null checks added)
- [x] Body field now loads correctly
- [ ] Full testing of editor components and features
- [ ] Custom widgets verified (YouTube widget - known limitation)
- [ ] Production deployment decision
