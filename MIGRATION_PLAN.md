# Content Migration Plan: 3D Pathways → Learning Materials DecapCMS

## Overview

This document outlines the migration plan for content from `/Users/msc227/Documents/repos/3d-pathways-nuxt` to the current DecapCMS-based system.

## Source Content Analysis

### Collections Inventory

| Collection | Count | Description |
|------------|-------|-------------|
| Exercises | 42 | Practice activities with tutorials and assessments |
| Specializations | 29 | Learning component units (skill areas) |
| Pathways | 10 | Course-level content (learning pathways) |
| Lectures | 4 | Supporting materials (slide decks) |
| Projects | 3 | Assessment activities (larger assignments) |
| Docs | 2 | Static pages (home, about) |
| **Total** | **90** | **Markdown files** |

### Media Assets

- **Location**: `/public/assets/`
- **Size**: 989MB
- **Files**: 1,488 files
- **Structure**:
  - `assets/exercises/` - Exercise-related images
  - `assets/projects/` - Project-related images
  - `assets/files/` - Downloadable attachments (159 files)

### Metadata Structure by Collection

#### 1. Exercises (42 items)
```yaml
recordId: recHfTCKlxhMVb30g
title: String
slug: String
type: "oer:Practice"
difficulty: String (beginner/intermediate/advanced)
youtubePlaylistID: String (optional)
image: String (path)
imageAlt: String
license: String (cc-by-40 format)
rubric: String (exercise)
tags: Array[String]
author: String
authorUrl: String
published: Boolean
```

**Special Features**:
- YouTube playlist embeds
- Custom component: `::iframe-component`
- Image references in `/assets/exercises/`
- Multiple difficulty levels

#### 2. Projects (3 items)
```yaml
recordId: recKy155GBMBZKNjJ
title: String
slug: String
type: "oer:Assessment"
difficulty: String
youtubePlaylistID: String (optional)
image: String (path)
imageAlt: String
license: String
rubric: String (project)
tags: Array[String]
author: String
authorUrl: String
published: Boolean
```

**Special Features**:
- Project themes and requirements sections
- Rubric references
- Similar to exercises but larger scope

#### 3. Specializations (29 items)
```yaml
title: String
slug: String
type: "oer:LearningComponent"
whoItsFor: String (optional)
targetRole: String (optional)
published: Boolean
oer: Object (JSON-LD structured data)
  @context: "https://oerschema.org/"
  @type: "LearningComponent"
  name: String
  componentType: "Unit"
  teaches: Array[String] (learning objectives)
  hasPart: Array (relationships)
  duration: String (ISO 8601 duration)
  educationalLevel: String
  inLanguage: String
  license: String (URL)
```

**Special Features**:
- OER Schema JSON-LD metadata
- Structured learning objectives
- Relationships to lessons/units

#### 4. Pathways (10 items)
```yaml
title: String
slug: String
type: "oer:Course"
description: String
published: Boolean
oer: Object (JSON-LD structured data)
  @context: "https://oerschema.org/"
  @type: "Course"
  courseCode: String
  name: String
  description: String
  teaches: Array[String]
  hasPart: Array (course components)
  duration: String (ISO 8601)
  inLanguage: String
  isAccessibleForFree: Boolean
  license: String (URL)
```

**Special Features**:
- Course-level structure
- References to specializations
- OER Schema Course type

#### 5. Lectures (4 items)
```yaml
title: String
slug: String
type: "oer:SupportingMaterial"
googleSlidesID: String (long ID for embed)
topics: String (long markdown list)
author: String
published: Boolean
oer: Object (JSON-LD structured data)
  @context: "https://oerschema.org/"
  @type: "SupportingMaterial"
  name: String
  materialType: "Slide Deck"
  about: Array[String] (topics covered)
  encodingFormat: String
  duration: String (ISO 8601)
  inLanguage: String
  license: String (URL)
```

**Special Features**:
- Google Slides embeds
- Complex topic lists
- Custom component: `::iframe-component`

#### 6. Docs (2 items)
```yaml
title: String
description: String
slug: String
document: String (page type)
```

**Special Features**:
- Simple static pages
- Basic frontmatter

### Additional Data Files

Located in `/content/data/`:
- `files.json` - File attachment metadata (23KB)
- `files-by-slug.json` - Indexed file data (23KB)
- `licenses.json` - License definitions (1KB)
- `rubrics.json` - Assessment rubric definitions (6KB)

## Current DecapCMS Configuration

### Existing Collections
1. **Articles** - General content with attachments
2. **Tutorials** - Step-by-step guides with difficulty levels

### Current Features
- GitHub backend integration
- Media folder: `public/uploads`
- License selection (CC licenses)
- Embedding capability
- File attachments list

## Gap Analysis

### Missing Collection Types
- ❌ Exercises
- ❌ Projects  
- ❌ Specializations
- ❌ Pathways
- ❌ Lectures
- ❌ Docs/Pages

### Missing Field Types
- ❌ `recordId` - Original Airtable record IDs
- ❌ `type` - OER Schema type designation
- ❌ `difficulty` - Skill level (already in tutorials, needs in exercises/projects)
- ❌ `youtubePlaylistID` - YouTube playlist embeddings
- ❌ `image` & `imageAlt` - Featured images
- ❌ `rubric` - Assessment rubric type
- ❌ `tags` - Content tagging
- ❌ `authorUrl` - Author website/profile
- ❌ `oer` - JSON-LD structured metadata
- ❌ `googleSlidesID` - Google Slides embed ID
- ❌ `topics` - Structured topic lists
- ❌ `whoItsFor` / `targetRole` - Audience targeting

### Missing Widget Types Needed
- `object` - For nested OER Schema JSON-LD data
- `hidden` - For maintaining recordId without editing
- Image widget with alt text

### Content Components to Support
- `::iframe-component` - Custom MDC component for embeds
  - YouTube playlists
  - Google Slides presentations

## Migration Requirements

### 1. DecapCMS Configuration Updates

#### New Collections Needed
1. **Exercises** (42 items)
2. **Projects** (3 items)
3. **Specializations** (29 items)
4. **Pathways** (10 items)
5. **Lectures** (4 items)
6. **Docs** (2 items)

#### New Fields Configuration
- Featured image with alt text
- YouTube playlist ID
- Google Slides ID
- Tags (list widget)
- Difficulty selector (shared with tutorials)
- OER Schema JSON-LD (object widget)
- Record ID (hidden field for backwards compatibility)

### 2. Media Migration Strategy

#### Assets to Migrate
```
Source: /3d-pathways-nuxt/public/assets/
  ├── exercises/ (1246 files) → exercises/
  ├── projects/ (83 files) → projects/
  └── files/ (159 files) → files/ or attachments/

Target: /learning-materials-decapcms/public/uploads/
```

#### Path Updates Required
- Old: `/assets/exercises/recXXX_image_filename.jpg`
- New: `/uploads/exercises/recXXX_image_filename.jpg`
- All markdown content image references need updating

### 3. Data File Migration

Special consideration for:
- **`rubrics.json`** - Assessment criteria definitions (4 rubric types: exercise, project, task, written-statement)
  - Contains detailed grading criteria with descriptions
  - Content references rubrics via `rubric` field (e.g., `rubric: "exercise"`)
  - **Will be copied to `/content/data/rubrics.json` for reference**
  - Future consideration: Create DecapCMS collection for rubric management
- `licenses.json` - License metadata
- `files.json` - File attachment registry

**Implementation**:
1. ✅ Copy data files to `/content/data/` (migration script handles this)
2. Content can reference rubrics by slug
3. Future enhancement: Create rubrics collection in DecapCMS for editing

### 4. Content Transformations

#### Frontmatter Updates
- Convert `cc-by-40` → `CC BY 4.0` (match existing format)
- Preserve `recordId` for reference
- Transform OER Schema JSON-LD (keep as-is or restructure)
- Update all asset paths- **Set `allowEmbed: true` for all exercises and projects** (enables existing iframe component)
#### Markdown Body Updates
- Update image paths: `/assets/` → `/uploads/`
- Verify `::iframe-component` syntax compatibility
- Preserve YouTube and Google Slides embeds
- Check for any hardcoded paths

## Migration Script Specification

### Script Requirements

#### Language: Node.js / TypeScript
```
Dependencies:
- fs-extra (file operations)
- gray-matter (frontmatter parsing)
- js-yaml (YAML handling)
- glob (file matching)
```

#### Core Functions

1. **Content Migration**
   ```typescript
   - readSourceContent(collectionType)
   - parseFrontmatter(fileContent)
   - transformFrontmatter(oldMeta, newSchema)
   - updateImagePaths(content, pathMapping)
   - writeTargetContent(content, destination)
   ```

2. **Media Migration**
   ```typescript
   - copyAssetFiles(source, target, collectionType)
   - validateImageReferences(content, assetList)
   - generatePathMapping(oldPaths)
   ```

3. **Validation**
   ```typescript
   - validateFrontmatter(data, schema)
   - checkBrokenLinks(content)
   - verifyMediaExists(imagePath)
   - generateMigrationReport()
   ```

### Migration Process

#### Phase 1: Preparation (Manual)
1. ✅ Analyze source content structure
2. ⏳ Update DecapCMS config.yml with all collections
3. ⏳ Create content directories in target repo
4. ⏳ Backup current content

#### Phase 2: Configuration (Automated)
1. Update `config.yml` with new collections
2. Add shared field definitions
3. Configure widgets for complex fields
4. Test DecapCMS admin interface

#### Phase 3: Media Migration (Automated)
1. Copy `/assets/exercises/` → `/uploads/exercises/`
2. Copy `/assets/projects/` → `/uploads/projects/`
3. Copy `/assets/files/` → `/uploads/files/`
4. Generate path mapping JSON
5. Verify file integrity (checksums)

#### Phase 4: Content Migration (Automated)
1. Migrate exercises (42 files)
2. Migrate projects (3 files)
3. Migrate specializations (29 files)
4. Migrate pathways (10 files)
5. Migrate lectures (4 files)
6. Migrate docs (2 files)
7. Update all image paths in content
8. Preserve custom components

#### Phase 5: Validation (Semi-automated)
1. Validate all frontmatter against schemas
2. Check for broken image links
3. Verify YouTube/Google Slides embeds
4. Test sample content in DecapCMS
5. Generate migration report

#### Phase 6: Data Files (Manual)
1. Copy data files to `/content/data/`
2. Document data file usage
3. Consider future database migration

## Risk Assessment

### High Risk
- **Image path updates** - 1,488 files to map correctly
- **OER Schema JSON-LD** - Complex nested data structure
- **Custom components** - `::iframe-component` must work

### Medium Risk
- **License format conversion** - Different format conventions
- **Attachment references** - File links may break
- **Large file size** - 989MB of assets to copy

### Low Risk
- **Frontmatter structure** - Well-defined schemas
- **Markdown content** - Standard format
- **Collection types** - Similar to existing

## Manual Interventions Required

1. **Review transformed licenses** - Ensure CC license format compatibility
2. **Test custom components** - Verify iframe embeds work
3. **Validate OER metadata** - Check JSON-LD structure
4. **Review specialization relationships** - Verify `hasPart` links
5. **Check rubric references** - Ensure assessment criteria are accessible
6. **Test DecapCMS workflow** - Create/edit/publish cycle
7. **Verify YouTube embeds** - Playlist IDs correct
8. **Review Google Slides embeds** - Embed IDs and permissions

## Success Criteria

- [ ] All 90 markdown files migrated
- [ ] All 1,488 media files copied and accessible
- [ ] No broken image references
- [ ] All collections visible in DecapCMS admin
- [ ] Sample content can be edited via DecapCMS
- [ ] Custom components render correctly
- [ ] YouTube and Google Slides embeds work
- [ ] OER Schema metadata preserved
- [ ] Migration report generated with zero critical errors

## Timeline Estimate

- **Phase 1**: 30 minutes (analysis complete)
- **Phase 2**: 1-2 hours (DecapCMS config)
- **Phase 3**: 30 minutes (media copy)
- **Phase 4**: 2-3 hours (content migration script + execution)
- **Phase 5**: 1-2 hours (validation)
- **Phase 6**: 30 minutes (data files)

**Total**: 6-8 hours

## Next Steps

1. Review and approve this migration plan
2. Begin Phase 2: Update DecapCMS configuration
3. Develop migration script
4. Test with small subset of content
5. Execute full migration
6. Validate and document results
