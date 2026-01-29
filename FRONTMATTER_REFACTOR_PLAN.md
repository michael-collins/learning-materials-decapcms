# Frontmatter Refactoring Plan

## Overview
This document outlines the plan to restructure parent-child relationships in frontmatter so that parents list their children, rather than children pointing to parents. This allows for easier management and editing of hierarchies in the CMS.

## Current State

### Hierarchy Structure
```
Pathways
  ├─ specializations: [] (listed in pathway frontmatter)
  └─ Contains multiple Specializations

Specializations
  ├─ pathway: string (references parent - CURRENT STATE)
  ├─ lessons: [] (OPTIONAL - currently not consistently used)
  └─ Contains multiple Lessons

Lessons
  ├─ specialization: string (references parent)
  ├─ lectures: [] (listed in lesson frontmatter)
  ├─ exercises: [] (listed in lesson frontmatter)
  ├─ projects: [] (listed in lesson frontmatter)
  ├─ tutorials: [] (listed in lesson frontmatter)
  ├─ articles: [] (listed in lesson frontmatter)
  └─ Contains multiple Content Items

Content Items (Lectures, Exercises, Projects, Tutorials, Articles)
  ├─ lesson: string (REFERENCE NOT IN CURRENT FRONTMATTER)
  └─ Currently queried by reverse search
```

### Current Query Pattern
1. **Pathways → Specializations**: ✅ Direct (pathway.specializations lists children)
2. **Specializations → Lessons**: ❌ Reverse (page filters by specialization: specSlug)
3. **Lessons → Content**: ✅ Direct (lesson.lectures, lesson.exercises, etc.)
4. **Content → Lessons**: ❌ Reverse (reverse-searched by type)

## Desired State

### Hierarchy Structure
```
Pathways
  ├─ specializations: [] (list specialization slugs)
  └─ Lists all children

Specializations
  ├─ pathway: string (DEPRECATED - removed)
  ├─ lessons: [] (list lesson slugs - REQUIRED, currently optional)
  └─ Lists all children

Lessons
  ├─ specialization: string (DEPRECATED - removed)
  ├─ lectures: [] (list lecture slugs)
  ├─ exercises: [] (list exercise slugs)
  ├─ projects: [] (list project slugs)
  ├─ tutorials: [] (list tutorial slugs)
  ├─ articles: [] (list article slugs)
  └─ Lists all children

Content Items
  └─ No parent references needed (parent tracks them)
```

## Tasks

### Phase 1: Frontmatter Changes

#### 1.1 Specializations Frontmatter
- **Task**: Add `lessons: []` array to all specializations
- **Impact**: Will list lesson slugs in order
- **Example**:
  ```yaml
  ---
  title: 3D Design
  slug: 3d-design
  ...
  lessons:
    - drawing-for-3d-design
    - hard-surface-modeling
    - digital-sculpting
  ---
  ```
- **Files to Update**: All markdown files in `content/specializations/`
- **Count**: ~15-20 specializations

#### 1.2 Remove Parent References from Lessons
- **Task**: Remove `specialization:` field from all lessons
- **Impact**: Children no longer reference parents (decouples data)
- **Files to Update**: All markdown files in `content/lessons/`
- **Count**: ~40-50 lessons

#### 1.3 Lessons Content Cleanup
- **Task**: Ensure all lessons have complete lists of content items
- **Current State**: Some lessons already have `lectures:`, `exercises:`, etc.
- **Action**: Audit and complete any missing references
- **Files to Update**: All markdown files in `content/lessons/`

### Phase 2: Code Refactoring

#### 2.1 Composables Refactoring

**usePathways.ts**
- ✅ Already implements parent-child pattern correctly
- `getPathway()`: Fetches pathway and lists specializations
- No changes needed

**useSpecializations.ts**
- ⚠️ Needs refactoring
- **Current**: Filters by parent pathway reference (`pathway: filters.pathway`)
- **Change**: Keep same but note data source shifts to specialization.lessons array
- **Update getSpecialization()**: 
  - Fetch lessons from `specialization.lessons` array (already does this)
  - Remove dependency on `specialization.pathway` for parent data
- **Update listSpecializations()**: 
  - Can still filter by pathway if needed for navigation
  - But pathway no longer stored in spec frontmatter (optional: add as reverse reference in pages)

**useLessons.ts**
- ⚠️ Needs refactoring
- **Current**: Fetches by `specialization: slug` field
- **Change**: Must reverse approach
  1. Lessons no longer store parent reference
  2. Need to find parent specialization differently
  3. Two options:
     - **Option A**: Add reverse reference via page (ask parent first, then get child lessons)
     - **Option B**: Keep specialization field for backward compatibility during transition
- **Recommended**: Option B for safety - deprecate but keep field initially

#### 2.2 Page Components Refactoring

**pages/pathways/[...slug].vue**
- ✅ Already implements correct pattern
- Fetches pathway, lists specializations
- No changes needed

**pages/specializations/[...slug].vue**
- ⚠️ Needs refactoring
- **Current**: 
  ```typescript
  const allLessons = await queryCollection('lessons').all()
  const filtered = allLessons.filter((lesson: any) => lesson.specialization === specialization.value.slug)
  ```
- **Change**: Use lessons array from specialization frontmatter
  ```typescript
  const fetchLessons = async () => {
    if (!specialization.value?.lessons || specialization.value.lessons.length === 0) {
      lessons.value = []
      return
    }
    
    const lessonSlugs = specialization.value.lessons.map((l: any) =>
      typeof l === 'string' ? l : l.slug
    )
    
    const lessonData = await Promise.all(
      lessonSlugs.map((slug: string) =>
        queryCollection('lessons').path(`/lessons/${slug}`).first()
      )
    )
    lessons.value = lessonData.filter(Boolean)
  }
  ```
- **Benefit**: Direct lookup by slug instead of filtering all lessons

**pages/lessons/[...slug].vue**
- ⚠️ Needs minor refactoring
- **Current**: 
  ```typescript
  const { data: specialization } = await useAsyncData(
    `lesson-specialization-${lesson.value?.specialization}`,
    () => {
      if (!lesson.value?.specialization) return null
      return queryCollection('specializations').path(`/specializations/${lesson.value.specialization}`).first()
    }
  )
  ```
- **Change**: After Phase 1, specialization field removed from lessons
- **New approach**: Need to find parent via reverse lookup (expensive) or keep field
- **Recommended**: Keep `specialization:` field in lessons for now, deprecate later

#### 2.3 CMS Configuration Updates (netlify.config.ts, content.config.ts)

**What needs checking**:
- Collection schemas for specializations
- Field definitions for lessons arrays
- Validation rules
- Backend configuration

### Phase 3: Migration Script

#### 3.1 Create Frontmatter Migration Script
- **Purpose**: Automate moving child references from children to parents
- **Logic**:
  1. Read all lessons, find which specialization each belongs to
  2. For each specialization, compile list of lessons
  3. Add `lessons: []` array to each specialization
  4. Remove `specialization:` from each lesson
- **Output**: Updated markdown files
- **Safety**: Create backups first

#### 3.2 Validation Script
- **Purpose**: Verify refactor completeness
- **Checks**:
  - All specializations have lessons array
  - All lessons in specialization.lessons array exist
  - No orphaned lessons (belongs to no specialization)
  - All lessons have complete content item references

### Phase 4: Testing & Documentation

#### 4.1 Testing
- Verify all pages load correctly
- Check pagination/ordering
- Test version compatibility
- Verify OER schema generation still works
- Check embed functionality

#### 4.2 Documentation Updates
- Update OER_SCHEMA_IMPLEMENTATION.md
- Update content model documentation
- Create data migration notes
- Document any breaking changes

## Affected Files Summary

### Content Files (Frontmatter)
- **Specializations**: ~15-20 files
  - Add `lessons: []` array with lesson slugs
  - Can keep or remove `pathway:` field
- **Lessons**: ~40-50 files
  - Keep `specialization:` field (for now) OR remove after code changes
  - Ensure complete `lectures:`, `exercises:`, `projects:`, `tutorials:`, `articles:` arrays

### Code Files
1. **composables/**
   - useSpecializations.ts (refactor parent lookup)
   - useLessons.ts (refactor parent lookup)

2. **pages/**
   - specializations/[...slug].vue (use parent's lessons array)
   - lessons/[...slug].vue (find parent via specialization field)

3. **Configuration**
   - content.config.ts (verify schemas)
   - netlify.config.ts (verify collections)

## Implementation Sequence

1. ✅ Create `frontmatter-refactor` branch
2. Create migration script for Phase 3.1
3. Audit all specializations (Phase 1.1)
4. Audit all lessons (Phase 1.2, 1.3)
5. Add `lessons: []` to specializations
6. Optionally remove `specialization:` from lessons (or keep for transition)
7. Refactor specializations page component
8. Refactor useLessons composable
9. Run validation script
10. Test all affected pages
11. Update documentation
12. Create PR with detailed migration notes

## Backwards Compatibility

**Option 1: Hard Break** (Recommended)
- Remove `specialization:` from lessons immediately
- Force page queries to go through parent
- Cleaner long-term but requires all code updated simultaneously

**Option 2: Soft Deprecation** (Safer)
- Keep `specialization:` field in lessons as fallback
- New code uses `specialization.lessons`
- Old code falls back to specialization field
- Remove field in future version

**Recommendation**: Use Option 2 for safer migration

## Benefits

1. **CMS Usability**: Users editing a specialization can see and edit all lessons in one place
2. **Data Integrity**: Easier to prevent orphaned content
3. **Performance**: Direct slug lookup instead of filtering
4. **Clarity**: Frontmatter reflects actual parent-child relationships
5. **Maintenance**: Easier to reorder and manage hierarchies

## Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| Orphaned lessons | Validation script before/after |
| Broken links during migration | Keep fallback fields during transition |
| Version history inconsistency | Document migration in version notes |
| CMS UI issues | Test Decap CMS with new schema |
| Performance during large queries | Monitor query times after changes |

## Timeline Estimate

- Phase 1 (Frontmatter): 2-3 hours (can be automated)
- Phase 2 (Code): 2-3 hours
- Phase 3 (Scripts): 1-2 hours
- Phase 4 (Testing): 2-3 hours
- **Total**: 7-11 hours of development work

---

**Created**: January 29, 2026
**Status**: Planning Phase
**Branch**: frontmatter-refactor
