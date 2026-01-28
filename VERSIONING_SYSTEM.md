# Content Versioning & Embed Protection System

This document explains the multi-layer protection system that prevents accidental modifications to archived version snapshots.

## Overview

When content (exercises, tutorials, etc.) is embedded in external courses, users rely on stable, unchanging versions. This system ensures that published content versions remain immutable while still allowing for updates through new version releases.

## Protection Layers

### 1. 🚫 Decap CMS UI Protection
**What:** Version snapshot files are hidden from the Decap CMS interface.

**How:** The `config.yml` excludes files matching `**/v[0-9]*.md` pattern.

**Benefit:** Content editors never see archived versions in their CMS, preventing accidental selection.

```yaml
# In public/admin/config.yml
collections:
  - name: "exercises"
    exclude: "**/v[0-9]*.md"  # Hides v1.0.0.md, v1.2.3.md, etc.
```

### 2. 💻 Local Pre-Commit Hook
**What:** Interactive confirmation before committing version file changes.

**How:** Git pre-commit hook (Husky) detects staged version files and prompts user.

**Benefit:** Catches accidental edits before they reach the remote repository.

**Setup:**
```bash
npm install
npx husky install
```

**Bypass (emergency only):**
```bash
git commit --no-verify -m "Critical security fix for v1.2.0"
```

### 3. 🔍 GitHub PR Validation
**What:** Automated check on all pull requests that modify version files.

**How:** GitHub Action workflow runs on PR open/update.

**Actions Taken:**
- ✅ Adds warning comment to PR
- 🏷️ Adds labels: `⚠️ version-edit`, `needs-admin-review`
- 📝 Updates PR description with warning banner
- ❌ **Fails the check** to block auto-merge

**Workflow:** [.github/workflows/validate-version-edits.yml](.github/workflows/validate-version-edits.yml)

### 4. 👤 Required Admin Review
**What:** Version files require explicit approval from repository owner.

**How:** CODEOWNERS file specifies required reviewers for version files.

**Benefit:** No merge possible without conscious admin approval.

**Configuration:** [.github/CODEOWNERS](.github/CODEOWNERS)

### 5. 🔬 Integrity Validation
**What:** Comprehensive validation of all version files in repository.

**How:** Script checks version consistency, frontmatter validity, registry sync.

**Run manually:**
```bash
npm run version:validate
```

**Checks performed:**
- Version number matches filename
- Required frontmatter fields present
- Status matches version registry
- No corruption or invalid data

## File Naming Convention

```
content/exercises/
├── animation-basics.md          # Current working version (edit this)
├── v1.0.0.md                    # Archived snapshot (DO NOT EDIT)
├── v1.1.0.md                    # Archived snapshot (DO NOT EDIT)
└── v1.2.0.md                    # Latest published snapshot (DO NOT EDIT)
```

## Version File Frontmatter

```yaml
---
title: "Animation Basics Exercise"
version: "1.2.0"                    # Must match filename
versionStatus: "archived"           # latest | archived | deprecated
publishEmbed: true                  # If true, available for embedding
changelog: "Fixed typo in step 3"   # What changed in this version
breakingChanges: []                 # Array of breaking change descriptions
---
```

## When to Edit Version Files (Rare!)

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

Instead of editing archived versions, create a new version:

### 1. Edit Current Version
Edit the main file (e.g., `animation-basics.md`) in Decap CMS or directly.

### 2. Bump Version Number
Update the `version` field in frontmatter:
```yaml
version: "1.3.0"  # Was 1.2.0
```

### 3. Add Changelog
```yaml
changelog: "Added new section on keyframe timing"
```

### 4. Commit Changes
When you push to main, GitHub Actions will:
- Detect the version change
- Create a snapshot file (`v1.3.0.md`)
- Update the version registry
- Mark previous version as archived

### 5. (Optional) Manual Snapshot
```bash
npm run version:snapshot
```

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

1. **Document the reason** in PR description
2. **Notify affected users** if possible (check embed analytics)
3. **Commit with --no-verify** to bypass local hook
4. **Request explicit admin approval** on PR
5. **Update changelog** in the version file
6. **Consider creating hotfix version** (e.g., 1.2.1) instead

## Scripts Reference

```bash
# Validate all version files
npm run version:validate

# Check specific files for version edit issues
npm run version:check "content/exercises/v1.0.0.md"

# Create snapshots from current versions
npm run version:snapshot
```

## Monitoring & Analytics

### Check Embed Usage
To see which versions are actively embedded:

```bash
# TODO: Add analytics endpoint
curl https://yoursite.com/api/analytics/embed-versions/animation-basics
```

### Version Registry
Check [content/data/version-registry.json](content/data/version-registry.json) for:
- All published versions
- Publication dates
- Status (latest/archived/deprecated)
- Changelog history

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
A: Update the `versionStatus` to `deprecated` and optionally set `publishEmbed: false` to hide it from new embeds.

## Related Files

- [.github/workflows/validate-version-edits.yml](.github/workflows/validate-version-edits.yml) - PR validation
- [.github/workflows/version-snapshot.yml](.github/workflows/version-snapshot.yml) - Automatic snapshots
- [.github/CODEOWNERS](.github/CODEOWNERS) - Required reviewers
- [scripts/check-version-edits.js](scripts/check-version-edits.js) - Validation script
- [scripts/validate-version-integrity.js](scripts/validate-version-integrity.js) - Integrity checker
- [scripts/create-version-snapshot.js](scripts/create-version-snapshot.js) - Snapshot generator
- [lib/version-resolver.ts](lib/version-resolver.ts) - Version resolution logic

## Support

For questions or issues with the versioning system:
1. Check this documentation first
2. Review the GitHub Action logs for specific errors
3. Contact the repository administrator
