# AIUL Multiple License Support

## Overview

The AIUL implementation now supports **multiple licenses per assignment**. This allows you to specify different AI policies for different aspects of the work.

## Why Multiple Licenses?

Different parts of an assignment may have different AI usage requirements:

- **General work** might allow AI with approval (`AIUL-WA`)
- **Conceptual phase** might allow AI for brainstorming (`AIUL-CD`)
- **Specific medium** might prohibit AI entirely (`AIUL-NA-3D`)

## Usage Examples

### Exercise with Two Licenses

```yaml
---
title: 3D Modeling Exercise
aiLicense:
  - AIUL-WA       # General AI usage requires approval
  - AIUL-NA-3D    # No AI for 3D modeling
---
```

**Student sees:**
- Combined guidance from both licenses
- Clear indication of what's allowed and what's not
- Media-specific restrictions highlighted

### Project with Three Licenses

```yaml
---
title: Creative Project
aiLicense:
  - AIUL-WA       # General approval needed
  - AIUL-CD       # AI allowed for conceptual work
  - AIUL-NA-3D    # No AI for 3D assets
---
```

**Result:**
- Students can use AI for brainstorming (CD)
- Must get approval for other AI usage (WA)
- Cannot use AI for 3D modeling (NA-3D)

## Default License Sets

### Exercises (Skills Building)
```yaml
aiLicense:
  - AIUL-WA       # Approval required
  - AIUL-NA-3D    # No AI for 3D
```

**Rationale:** Students should practice fundamental 3D skills without AI, but may use AI for other aspects with instructor approval.

### Projects (Creative Work)
```yaml
aiLicense:
  - AIUL-WA       # Approval required
  - AIUL-CD       # Conceptual development OK
  - AIUL-NA-3D    # No AI for 3D
```

**Rationale:** Projects allow more creative freedom with AI for ideation, but maintain restrictions on technical execution.

## Component Behavior

### AIULComponent Display

When multiple licenses are present:

1. **Header** shows "AI Usage Licenses" (plural)
2. **All licenses displayed** in color-coded badges
3. **Media suffixes** shown in parentheses
4. **Combined guidance** merges all unique rules:
   - What's Allowed: Union of all allowed actions
   - What's Not Allowed: Union of all restrictions
   - Tips: Combined best practices

### Example Output

```
AI Usage Licenses:
🤖 AIUL-WA (General) | AIUL-NA-3D (3D Design)

With Approval: AI tools may be used only with explicit instructor approval.
No AI (3D Design): AI tools must not be used for any part of this assignment.

[Show detailed guidance ▼]
```

## DecapCMS Admin

### Selecting Multiple Licenses

1. Navigate to `/admin`
2. Edit exercise or project
3. Find **"AI Usage Licenses"** field
4. Use **Ctrl/Cmd+Click** to select multiple options
5. Default licenses auto-populate for new content

### Available in Admin

- 54 total options (6 base × 9 variants)
- Multi-select dropdown
- Smart defaults per collection type
- Helpful hints link to AIUL documentation

## Technical Details

### Schema Definition

```typescript
// content.config.ts
aiLicense: z.union([z.string(), z.array(z.string())]).optional()
```

**Supports:**
- Single string: `aiLicense: "AIUL-CD"`
- Array of strings: `aiLicense: ["AIUL-WA", "AIUL-NA-3D"]`

### Component Props

```typescript
interface Props {
  license: string | string[]
}
```

**Handles both:**
- Legacy single license format (backward compatible)
- New multiple license format

### Guidance Merging

The component intelligently merges guidance from multiple licenses:

```typescript
const allGuidance = computed(() => {
  const allAllowed = new Set<string>()
  const allNotAllowed = new Set<string>()
  const allTips = new Set<string>()
  
  licenseDetails.value.forEach(detail => {
    const guide = guidesData[detail.baseTag]
    if (guide) {
      guide.allowed.forEach(item => allAllowed.add(item))
      guide.notAllowed.forEach(item => allNotAllowed.add(item))
      guide.tips.forEach(item => allTips.add(item))
    }
  })
  
  return {
    allowed: Array.from(allAllowed),
    notAllowed: Array.from(allNotAllowed),
    tips: Array.from(allTips)
  }
})
```

## Best Practices

### 1. Use Media Suffixes
Specify exactly which medium has restrictions:
```yaml
aiLicense:
  - AIUL-WA       # General
  - AIUL-NA-3D    # No AI for 3D specifically
```

### 2. Layer Policies
Combine general and specific policies:
```yaml
aiLicense:
  - AIUL-TC       # Must document all AI use
  - AIUL-NA-CO    # But no AI for coding
```

### 3. Progressive Permissions
Allow AI for early stages, restrict for final work:
```yaml
aiLicense:
  - AIUL-CD       # AI for brainstorming
  - AIUL-DP-WR    # AI for draft writing
  - AIUL-TC       # Document everything
```

### 4. Clear Communication
Don't overdo it—2-3 licenses max:
```yaml
# ✅ Good - Clear and focused
aiLicense:
  - AIUL-WA
  - AIUL-NA-3D

# ❌ Too many - Confusing
aiLicense:
  - AIUL-WA
  - AIUL-CD
  - AIUL-DP
  - AIUL-TC
  - AIUL-NA-3D
```

## Migration from Single License

Existing content with single licenses continues to work:

```yaml
# Still valid ✅
aiLicense: AIUL-CD-3D

# Also valid ✅
aiLicense: 
  - AIUL-CD-3D
```

Both formats are supported for backward compatibility.

## Summary

✅ **Multiple licenses per assignment**
✅ **Smart guidance merging**
✅ **CMS multi-select support**
✅ **Default license sets**
✅ **Backward compatible**
✅ **Clear student communication**

Visit http://localhost:3001/exercises/3d-modeling-with-ai-assistance to see it in action!
