# AIUL (AI Usage License) Implementation

This project now includes full support for the **Artificial Intelligence Usage License (AIUL)** framework, which helps educators clearly communicate AI usage policies for assignments.

## What is AIUL?

AIUL is a Creative Commons-style licensing system for educational assignments that specifies how students may or may not use AI tools. It was developed by the Penn State DMD Program.

Learn more: [https://dmd-program.github.io/aiul/](https://dmd-program.github.io/aiul/)

## Features Implemented

### 1. License Data (`content/data/licenses.json`)

Added 6 primary AIUL license types:

- **AIUL-NA** (Not Allowed): No AI tools allowed
- **AIUL-WA** (With Approval): AI only with instructor approval
- **AIUL-CD** (Conceptual Development): AI for research/ideation only
- **AIUL-TC** (Transformative Collaboration): AI as collaborative tool
- **AIUL-DP** (Directed Production): AI-assisted creation permitted
- **AIUL-IU** (Integrated Usage): AI usage is required

### 2. Content Schema Support

Added `aiLicense` field to:
- `exercises` collection
- `projects` collection

### 3. AIULComponent (`components/AIULComponent.vue`)

New Vue component that displays:
- License tag with appropriate color coding
- Full license name and description
- Media-specific suffix (e.g., `-3D`, `-WR`, `-IM`)
- Direct link to AIUL documentation

Color coding by strictness:
- 🔴 Red: AIUL-NA (No AI allowed)
- 🟠 Orange: AIUL-WA (With approval)
- 🟡 Yellow: AIUL-CD (Conceptual only)
- 🔵 Blue: AIUL-TC (Transformative)
- 🟣 Indigo: AIUL-DP (Directed)
- 🟣 Purple: AIUL-IU (Integrated)

### 4. CollectionItem Integration

The AIUL license now displays below the Creative Commons license (if present) on exercise and project pages, providing clear guidance to students about AI usage policies.

### 5. DecapCMS Admin Support

Added AI Usage License dropdown in the CMS admin for:
- Exercises
- Projects

Includes all primary licenses plus media-specific variants:
- `-WR` (Writing)
- `-IM` (Image)
- `-VD` (Video)
- `-AU` (Audio)
- `-3D` (3D Design)
- `-TR` (Traditional Media)
- `-MX` (Mixed Media)
- `-CO` (Code)

### 6. Utility Functions

Added `getAIULUrl()` function in `lib/oer-schema-utils.ts` to:
- Parse AIUL license tags
- Extract base license from combined tags (e.g., "AIUL-CD-3D" → "AIUL-CD")
- Return appropriate documentation URLs

## Usage

### In Frontmatter

Add an AIUL license to any exercise or project:

```yaml
---
title: My 3D Modeling Exercise
license: CC BY 4.0
aiLicense: AIUL-CD-3D
---
```

### In DecapCMS

1. Edit or create an exercise/project
2. Find the "AI Usage License" dropdown
3. Select the appropriate license:
   - Choose base license (e.g., AIUL-CD) for general assignments
   - Choose media-specific (e.g., AIUL-CD-3D) for specialized work

### Display on Pages

The license automatically displays on exercise and project pages with:
- Color-coded icon and tag
- Full description of the policy
- Media type indicator (if applicable)
- Link to learn more

## Example Licenses by Use Case

### Traditional Exams
```yaml
aiLicense: AIUL-NA
```
No AI allowed. All work must be student-generated.

### Research Papers
```yaml
aiLicense: AIUL-CD-WR
```
AI for research/ideation, but writing must be original.

### 3D Modeling
```yaml
aiLicense: AIUL-CD-3D
```
AI for concept art/references, but modeling must be manual.

### Creative Writing with AI
```yaml
aiLicense: AIUL-TC-WR
```
AI collaboration allowed with significant transformation.

### AI-Focused Assignments
```yaml
aiLicense: AIUL-IU
```
AI usage is required and is the learning objective.

## Migration from Old Site

If you had AIUL licenses in your old site:

1. The frontmatter field should be `aiLicense` (not `ai_license`)
2. License tags should use uppercase and hyphens (e.g., `AIUL-CD-3D`)
3. All existing exercises/projects can be updated via DecapCMS admin

## Benefits for Students

- **Clear Expectations**: Students know exactly what AI usage is permitted
- **Educational**: Links explain why certain policies are in place
- **Consistent**: Same framework across all assignments
- **Visible**: Displayed prominently on assignment pages

## Benefits for Instructors

- **Standardized**: Use established framework instead of custom policies
- **Flexible**: 6 levels + 8 media types = 48+ combinations
- **Easy to Apply**: Simple dropdown in CMS admin
- **Well-Documented**: Links to full AIUL documentation

## Resources

- **AIUL Website**: https://dmd-program.github.io/aiul/
- **License Guide**: https://dmd-program.github.io/aiul/licenses.html
- **Tag Generator**: https://dmd-program.github.io/aiul/tag-generator.html
- **Implementation Resources**: https://dmd-program.github.io/aiul/resources.html

## Technical Details

### Component Structure

```
AIULComponent.vue
├── Props: { license: string }
├── Computed:
│   ├── baseTag: Extract "AIUL-XX" from full tag
│   ├── mediaSuffix: Extract "-XX" media type
│   ├── licenseInfo: Lookup license data
│   └── mediaType: Convert suffix to readable name
└── Template:
    ├── Color-coded icon
    ├── License tag link
    ├── Media type badge
    ├── Description text
    └── Learn more link
```

### Data Flow

```
Content File (*.md)
  └── aiLicense: "AIUL-CD-3D"
       ↓
Content Schema (content.config.ts)
  └── Validates field
       ↓
Page Component (*.vue)
  └── Passes to CollectionItem
       ↓
CollectionItem.vue
  └── Renders AIULComponent
       ↓
AIULComponent.vue
  └── Displays formatted license
```

## Future Enhancements

Potential improvements:

1. **Rubric Integration**: Link AIUL policies to rubric items
2. **Student Declaration**: Component for students to declare AI usage
3. **Analytics**: Track which licenses are most commonly used
4. **Custom Descriptions**: Allow instructors to add assignment-specific notes
5. **Bulk Updates**: Script to add AIUL licenses to existing content

## Credits

AIUL framework created by faculty in the Penn State DMD Program.
License: CC-BY-4.0

Implementation in this project: 2026
