# AIUL Quick Reference Guide

## What Changed?

Your site now has full AIUL (AI Usage License) support integrated alongside Creative Commons licensing.

## Files Modified

1. **`content/data/licenses.json`** - Added 6 AIUL license definitions
2. **`content.config.ts`** - Added `aiLicense` field to exercises and projects
3. **`components/AIULComponent.vue`** ⭐ NEW - Component to display AIUL licenses
4. **`components/CollectionItem.vue`** - Integrated AIUL component display
5. **`pages/exercises/[...slug].vue`** - Passes aiLicense prop (already done)
6. **`pages/projects/[...slug].vue`** - Passes aiLicense prop (already done)
7. **`lib/oer-schema-utils.ts`** - Added `getAIULUrl()` utility function
8. **`public/admin/config.yml`** - Added AI License dropdown to CMS admin

## Demo File

Created: [`content/exercises/3d-modeling-with-ai-assistance.md`](content/exercises/3d-modeling-with-ai-assistance.md)

Example showing multiple licenses:
- `AIUL-WA` - General AI usage requires approval
- `AIUL-NA-3D` - No AI allowed for 3D modeling portion

## How to Use

### Adding AIUL to Existing Content

#### Option 1: Edit Frontmatter Directly (Single License)
```yaml
---
title: My Exercise
license: CC BY 4.0
aiLicense: AIUL-CD-3D  # Single license
---
```

#### Option 2: Multiple Licenses (Recommended)
```yaml
---
title: My Exercise
license: CC BY 4.0
aiLicense:
  - AIUL-WA       # General approval required
  - AIUL-NA-3D    # No AI for 3D work
---
```

#### Option 3: Use DecapCMS Admin
1. Go to `/admin`
2. Edit an exercise or project
3. Find "AI Usage Licenses" dropdown
4. Select one or more licenses (Ctrl/Cmd+Click for multiple)
5. Save & publish

### Default Licenses

When creating new content in the CMS:

**Exercises:**
- `AIUL-WA` - With Approval (general)
- `AIUL-NA-3D` - No AI for 3D modeling

**Projects:**
- `AIUL-WA` - With Approval (general)
- `AIUL-CD` - Conceptual Development allowed
- `AIUL-NA-3D` - No AI for 3D work

## AIUL License Types

| Code | Name | When to Use |
|------|------|-------------|
| **AIUL-NA** | Not Allowed | Traditional exams, skill-building |
| **AIUL-WA** | With Approval | Exceptions on case-by-case basis |
| **AIUL-CD** | Conceptual Development | Research/ideation only, execution must be original |
| **AIUL-TC** | Transformative Collaboration | AI collaboration with significant transformation |
| **AIUL-DP** | Directed Production | AI-assisted creation with student direction |
| **AIUL-IU** | Integrated Usage | AI usage is required/learning objective |

## Media Suffixes

Add to base license for media-specific guidance:

- `-WR` - Writing
- `-IM` - Image
- `-VD` - Video
- `-AU` - Audio
- `-3D` - 3D Design
- `-TR` - Traditional Media
- `-MX` - Mixed Media
- `-CO` - Code

Examples:
- `AIUL-CD-3D` - Conceptual development for 3D work
- `AIUL-NA-WR` - No AI for writing assignments
- `AIUL-IU-CO` - Integrated AI for coding projects

## Display Example

When a student views an exercise with `aiLicense: AIUL-CD-3D`, they see:

```
┌─────────────────────────────────────────────────────┐
│ [AI Icon] AI Usage License: AIUL-CD-3D (3D Design) │
│                                                     │
│ Conceptual Development: AI tools may be used for   │
│ research and ideation, but the final work must be  │
│ entirely student-generated.                        │
│                                                     │
│ Learn more about AI Usage Licenses →               │
└─────────────────────────────────────────────────────┘
```

Color-coded:
- 🔴 AIUL-NA (strictest)
- 🟠 AIUL-WA
- 🟡 AIUL-CD
- 🔵 AIUL-TC
- 🟣 AIUL-DP
- 🟣 AIUL-IU (most permissive)

## Testing the Implementation

1. Start dev server: `npm run dev`
2. Visit: http://localhost:3000/exercises/3d-modeling-with-ai-assistance
3. Scroll to bottom to see AIUL license display
4. Test admin: http://localhost:3000/admin

## Common Scenarios

### 3D Modeling Exercise (No AI Generation)
```yaml
aiLicense: AIUL-CD-3D
```
Students can use AI for research/references but must create models manually.

### Writing Assignment (No AI)
```yaml
aiLicense: AIUL-NA-WR
```
Traditional writing, no AI assistance allowed.

### AI Art Project (AI Required)
```yaml
aiLicense: AIUL-IU-IM
```
Students must use AI tools as part of the assignment.

### Code Project (AI Collaboration)
```yaml
aiLicense: AIUL-TC-CO
```
AI can assist but must be significantly modified/understood.

## Resources

- **Full Documentation**: [AIUL_IMPLEMENTATION.md](AIUL_IMPLEMENTATION.md)
- **AIUL Website**: https://dmd-program.github.io/aiul/
- **License Guide**: https://dmd-program.github.io/aiul/licenses.html
- **Tag Generator**: https://dmd-program.github.io/aiul/tag-generator.html

## Next Steps

1. ✅ Implementation complete
2. Review existing exercises/projects and add AIUL licenses
3. Update course documentation to explain AIUL to students
4. Consider adding AIUL policy to syllabus
5. Train instructors on choosing appropriate licenses

## Migration from Old Site

If you had AIUL implemented in the old 3d-pathways-nuxt site:

1. Field name is `aiLicense` (not `ai_license` or `aiusage`)
2. Use uppercase format: `AIUL-CD-3D` (not `aiul-cd-3d`)
3. Old frontmatter can be updated via CMS admin
4. Component is automatic - just add the field

## Support

Questions about:
- **Implementation**: See [AIUL_IMPLEMENTATION.md](AIUL_IMPLEMENTATION.md)
- **AIUL Framework**: Visit https://dmd-program.github.io/aiul/
- **Technical Issues**: Check component code in `components/AIULComponent.vue`
