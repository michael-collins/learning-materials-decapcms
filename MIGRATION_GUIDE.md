# Migration Guide: 3D Pathways → Learning Materials DecapCMS

This guide walks you through migrating content from the 3d-pathways-nuxt repository to this DecapCMS-based system.

## Prerequisites

- Node.js and npm installed
- Both repositories cloned locally
- Dependencies installed: `npm install`

## Quick Start

### 1. Test the Migration (Dry Run)

First, run the migration in dry-run mode to see what would happen without making changes:

```bash
npm run migrate:dry-run
```

This will:
- Analyze all source content
- Show what files would be migrated
- Report any potential issues
- Generate statistics

### 2. Run the Full Migration

Once you're satisfied with the dry run results, execute the actual migration:

```bash
npm run migrate
```

For verbose output during migration:

```bash
npm run migrate:verbose
```

## What Gets Migrated

### Content Collections (90 files)
- **Exercises** (42): Practice activities with tutorials
- **Projects** (3): Larger assessment assignments
- **Specializations** (29): Learning component units
- **Pathways** (10): Course-level content
- **Lectures** (4): Supporting materials (slide decks)
- **Docs** (2): Static pages

### Media Assets (989MB, 1,488 files)
- Exercise images and assets
- Project images
- Downloadable files and attachments

### Data Files
- Rubrics, licenses, and file metadata

## Migration Process

The script performs the following steps:

### Phase 1: Content Migration
1. Reads markdown files from source repository
2. Parses frontmatter metadata
3. Transforms field formats (licenses, paths, etc.)
4. Updates asset paths (`/assets/` → `/uploads/`)
5. Writes to target repository

### Phase 2: Media Assets
1. Copies exercise assets to `public/uploads/exercises/`
2. Copies project assets to `public/uploads/projects/`
3. Copies file attachments to `public/uploads/files/`

### Phase 3: Data Files
1. Copies JSON data files to `content/data/`

### Phase 4: Validation
1. Checks for broken image references
2. Validates frontmatter structure
3. Reports any issues found

## Transformations Applied

### License Format Conversion
- `cc-by-40` → `CC BY 4.0`
- `cc-by-sa-40` → `CC BY-SA 4.0`
- And other CC license variations...

### Path Updates
All asset references are updated:
- `/assets/exercises/image.jpg` → `/uploads/exercises/image.jpg`
- `/assets/projects/image.png` → `/uploads/projects/image.png`
- `/assets/files/document.pdf` → `/uploads/files/document.pdf`

### Frontmatter Preservation
The following fields are preserved:
- `recordId` - Original Airtable IDs
- `type` - OER Schema types
- `oer` - JSON-LD structured metadata
- All custom fields specific to each collection

## After Migration

### 1. Review the Report

A detailed migration report is saved to `migration-report.json` containing:
- Number of files processed
- Files successfully migrated
- Any errors encountered
- Warnings about potential issues

### 2. Verify Content

Check a few sample files:

```bash
# View an exercise
cat content/exercises/animated-procedural-textures.md

# View a project
cat content/projects/ideas-in-motion.md

# Check images
ls public/uploads/exercises/ | head
```

### 3. Test DecapCMS

1. Start the dev server: `npm run dev`
2. Navigate to `/admin`
3. Log in with GitHub
4. Try editing a few items from each collection

### 4. Verify Media Assets

Check that images load correctly:
- Browse to a few content pages
- Verify featured images display
- Check inline images render
- Test file downloads

## Manual Steps Required

### 1. Embedded Content

All exercises and projects will have `allowEmbed: true` set during migration, which enables the existing DecapCMS iframe embedding functionality.

**YouTube Playlists:**
- Content uses `youtubePlaylistID` field
- Your existing embedding system should handle these

**Google Slides:**
- Lectures use `googleSlidesID` field  
- Your existing embedding system should handle these

Verify that embeds render correctly on migrated content pages.

### 2. Review OER Schema Metadata

The `oer` field contains JSON-LD structured data. Verify it's:
- Valid JSON
- Properly formatted
- Renders correctly if you're displaying it

### 4. Check Relationships and Rubrics

Some content references other content:
- Pathways reference Specializations
- Specializations reference Lessons
- These relationships are in the `hasPart` arrays

**Rubrics:**
- Exercises and projects reference rubrics via `rubric` field (e.g., "exercise", "project")
- Rubric definitions are in `/content/data/rubrics.json`
- Contains detailed grading criteria for each rubric type
- You may want to create a rubrics display component or editor interface

### 4. Test Publishing Workflow

Try the complete workflow:
1. Edit content via DecapCMS
2. Save changes
3. Commit to GitHub
4. Verify changes appear in the repository

## Troubleshooting

### Migration Script Fails

**Check paths:**
```javascript
// Verify in scripts/migrate-content.js
const CONFIG = {
  sourceRepo: '/Users/msc227/Documents/repos/3d-pathways-nuxt',
  targetRepo: '/Users/msc227/Documents/repos/open-curriculum/oerschema/learning-materials-decapcms',
  // ...
};
```

**Check dependencies:**
```bash
npm install
```

### Broken Image References

If validation reports broken images:

1. Check the path mapping in the script
2. Verify assets were copied correctly
3. Look for assets with special characters in names

### DecapCMS Not Showing Collections

1. Verify `config.yml` syntax
2. Check folder paths exist
3. Restart dev server
4. Clear browser cache

### Content Not Rendering

1. Check frontmatter format
2. Verify markdown syntax
3. Look for unsupported custom components
4. Check console for errors

## Rollback

If you need to undo the migration:

```bash
# Remove migrated content
rm -rf content/exercises content/projects content/specializations content/pathways content/lectures content/docs

# Remove copied assets
rm -rf public/uploads/exercises public/uploads/projects public/uploads/files

# Restore from git (if committed)
git checkout content/ public/uploads/
```

## File Structure After Migration

```
learning-materials-decapcms/
├── content/
│   ├── articles/           # Existing
│   ├── tutorials/          # Existing
│   ├── exercises/          # ← New (42 files)
│   ├── projects/           # ← New (3 files)
│   ├── specializations/    # ← New (29 files)
│   ├── pathways/           # ← New (10 files)
│   ├── lectures/           # ← New (4 files)
│   ├── docs/               # ← New (2 files)
│   └── data/               # ← New (JSON files)
│
├── public/
│   └── uploads/
│       ├── exercises/      # ← 1,246 files
│       ├── projects/       # ← 83 files
│       └── files/          # ← 159 files
│
├── scripts/
│   └── migrate-content.js  # Migration script
│
├── MIGRATION_PLAN.md       # Detailed migration plan
├── MIGRATION_GUIDE.md      # This file
└── migration-report.json   # Generated after migration
```

## Support & Issues

If you encounter issues:

1. Check the migration report: `migration-report.json`
2. Run with verbose logging: `npm run migrate:verbose`
3. Review the detailed plan: `MIGRATION_PLAN.md`
4. Check DecapCMS docs: https://decapcms.org/docs/

## Next Steps

After successful migration:

1. ✅ Review migrated content
2. ✅ Test DecapCMS admin interface
3. ✅ Verify media assets
4. ✅ Create custom MDC components if needed
5. ✅ Update documentation
6. ✅ Train content editors
7. ✅ Deploy to production

---

**Migration Script Location:** `scripts/migrate-content.js`  
**Configuration File:** `public/admin/config.yml`  
**Detailed Plan:** `MIGRATION_PLAN.md`
