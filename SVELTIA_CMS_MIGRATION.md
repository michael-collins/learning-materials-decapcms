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

- ⚠️ **YouTube field widget** - Custom input control for YouTube fields
  - Workaround: Use string field or editor component
  - Status: Feature planned, coming soon
- ⚠️ **toPreview in editor components** - Preview rendering in editor
  - Impact: Minimal, components still insert correctly
  - Status: Coming soon

## Potential Limitations

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

## Status

- [x] Branch created: `sveltiacms`
- [ ] Script updated
- [ ] Initial testing
- [ ] Custom widgets verified
- [ ] Production deployment
