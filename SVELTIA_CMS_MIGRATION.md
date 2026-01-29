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

### 3. Features to Review

#### Custom Widgets
Our existing custom widgets should continue to work:
- YouTube widget (`/admin/youtube-widget.js`)
- Custom editor components (`/admin/editor-components.js`)

**Note**: May need testing to ensure full compatibility. Sveltia CMS supports the same widget API.

#### Preview Styles
Our custom preview styles should continue to work:
- `/admin/preview-styles.css`

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
2. ⏳ Update admin HTML with Sveltia CMS script
3. ⏳ Test basic functionality:
   - Login via GitHub
   - View collections
   - Create/edit content
   - Upload media
   - Preview content
4. ⏳ Test custom features:
   - YouTube widget
   - Editor components
   - Preview styles
5. ⏳ Test version management
6. ⏳ Test DecapCMS edit links (may need updating)

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

## Potential Breaking Changes

From the documentation, Sveltia CMS is still in beta (targeting 1.0 in early 2026), so:
- Monitor release notes for breaking changes
- Consider pinning to a specific version once stable
- Current approach uses `@sveltia/cms` (latest) for auto-updates

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
