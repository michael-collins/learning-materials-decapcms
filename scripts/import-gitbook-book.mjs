#!/usr/bin/env node
/**
 * GitBook DMD Book → OER Platform Import Script
 *
 * Imports a legacy GitBook repository (SUMMARY.md ToC) into the OER platform's
 * collection system (books, articles, projects, lessons).
 *
 * Supported courses (selected via --prefix):
 *   dmd300  →  dmd-program/dmd-300-master
 *   dmd400  →  dmd-program/dmd-400-master
 *
 * Usage:
 *   node scripts/import-gitbook-book.mjs --prefix dmd300
 *   node scripts/import-gitbook-book.mjs --prefix dmd400
 *   node scripts/import-gitbook-book.mjs --prefix dmd300 --repo-dir /tmp/dmd-300-master
 *   node scripts/import-gitbook-book.mjs --prefix dmd300 --dry-run
 *
 * Flags:
 *   --prefix     dmd300 | dmd400   (required)
 *   --repo-dir   path              Use an existing local clone (skips git clone)
 *   --dry-run                      Print what would be written; no filesystem changes
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const WORKSPACE = path.resolve(__dirname, '..')

// ═══════════════════════════════════════════════════════════════════
// Per-course configuration
// ═══════════════════════════════════════════════════════════════════

const COURSE_CONFIGS = {
  dmd300: {
    repoUrl: 'https://github.com/dmd-program/dmd-300-master.git',
    bookSlug: 'dmd-300-digital-multimedia-design-studio',
    bookTitle: 'DMD 300: Digital Multimedia Design Studio',
    courseName: 'DMD 300',
    defaultAuthor: 'Michael Collins',
    license: 'CC BY 4.0',
    assetTargetDir: 'uploads/dmd300',        // relative to public/
    coverTarget: 'uploads/dmd300-cover.jpg', // relative to public/
    tags: ['design', 'digital-multimedia', 'studio', 'dmd-300'],
    theme: 'lambda',
  },
  dmd400: {
    repoUrl: 'https://github.com/dmd-program/dmd-400-master.git',
    bookSlug: 'dmd-400-digital-multimedia-design-capstone',
    bookTitle: 'DMD 400: Digital Multimedia Design Capstone',
    courseName: 'DMD 400',
    defaultAuthor: 'Michael Collins',
    license: 'CC BY 4.0',
    assetTargetDir: 'uploads/dmd400',
    coverTarget: 'uploads/dmd400-cover.jpg',
    tags: ['design', 'digital-multimedia', 'capstone', 'dmd-400'],
    theme: 'lambda',
  },
}

// ═══════════════════════════════════════════════════════════════════
// CLI argument parsing
// ═══════════════════════════════════════════════════════════════════

function parseArgs() {
  const argv = process.argv.slice(2)
  const opts = {
    prefix: null,
    repoDir: null,
    dryRun: false,
  }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--prefix' && argv[i + 1]) opts.prefix = argv[++i]
    else if (argv[i] === '--repo-dir' && argv[i + 1]) opts.repoDir = path.resolve(argv[++i])
    else if (argv[i] === '--dry-run') opts.dryRun = true
    else if (!argv[i].startsWith('--') && !opts.prefix) opts.prefix = argv[i]
  }
  return opts
}

// ═══════════════════════════════════════════════════════════════════
// String helpers
// ═══════════════════════════════════════════════════════════════════

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Safely quote a string value for YAML */
function yamlValue(val) {
  if (typeof val === 'boolean') return val.toString()
  if (typeof val === 'number') return val.toString()
  if (typeof val !== 'string') return `'${String(val)}'`
  if (val === '') return "''"
  const needsQuote = /[:#{}\[\]|>&*?,!@`]/.test(val) ||
    val.includes("'") || val.includes('"') ||
    val.startsWith(' ') || val.endsWith(' ')
  if (needsQuote) return `'${val.replace(/'/g, "''")}'`
  return val
}

/** Convert a SUMMARY.md markdown path to a content slug */
function pathToSlug(mdPath, prefix) {
  // Strip .md extension, convert to kebab-case, prepend prefix
  const clean = mdPath
    .replace(/\.md$/i, '')
    .replace(/\\/g, '/')
    .replace(/\//g, '-')   // subdir/file → subdir-file
  return `${prefix}-${slugify(clean)}`
}

/** Convert a SUMMARY.md markdown path to an outline path slug (last segment) */
function pathToOutlinePath(mdPath) {
  const clean = mdPath.replace(/\.md$/i, '').replace(/\\/g, '/')
  const parts = clean.split('/')
  return slugify(parts[parts.length - 1]).substring(0, 40)
}

// ═══════════════════════════════════════════════════════════════════
// SUMMARY.md parser
// ═══════════════════════════════════════════════════════════════════

/**
 * Parse a GitBook SUMMARY.md file into a nested tree of items.
 * Each item: { text, path (nullable), children: [...] }
 *
 * GitBook format:
 *   * [Title](file.md)
 *   * [Section](section.md)
 *     * [Child](child.md)
 *       * [Grandchild](subdir/grandchild.md)
 */
function parseSummary(summaryText) {
  const lines = summaryText.split('\n')
  const root = []
  const stack = [{ children: root, indent: -1 }]

  for (const line of lines) {
    // Match bullet items: optional spaces + * or - + [Title](path)
    const m = line.match(/^(\s*)[*-]\s+\[([^\]]+)\]\(([^)]*)\)\s*$/)
    if (!m) continue

    const indent = m[1].length
    const text = m[2].trim()
    const rawPath = m[3].trim()

    const item = {
      text,
      path: rawPath || null,
      children: [],
    }

    // Pop stack until we find an appropriate parent
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop()
    }

    stack[stack.length - 1].children.push(item)
    stack.push({ children: item.children, indent })
  }

  return root
}

// ═══════════════════════════════════════════════════════════════════
// Content classification
// ═══════════════════════════════════════════════════════════════════

/**
 * Classify a page based on its path and context.
 * @param {string} mdPath  - source file path from SUMMARY.md (e.g. "project-1/phase-1.md")
 * @param {{ inProjectSection?: boolean, parentText?: string }} context
 * @returns {{ type: 'article'|'project', tags: string[] }}
 */
function classifyPage(mdPath, prefix, context = {}) {
  const tags = []
  let type = 'article'

  const p = mdPath.toLowerCase()

  // Mark as project if we're inside a project/capstone section
  if (context.inProjectSection) {
    type = 'project'
    tags.push('project-deliverable')
    return { type, tags }
  }

  // Recognize project deliverable paths by content patterns
  const projectPatterns = [
    /capstone-project-(?!overview|overview\.md|\.md$)/,
    /\/phase-\d/,
    /-proposal/,
    /-production-report/,
    /-exhibition/,
    /-statement/,
    /-document\.md/,
    /project-midterm/,
    /project-explainer/,
    /project-2-(?!project-description)/,  // project-2 deliverables (not the overview)
    /weekly-activity-report/,
    /-pitch/,
    /-interview/,
    /work-statement/,
    /-documentation\.md/,
    /project-files/,
    /evidence-of-ability/,
    /capstone-project-advisor/,
    /capstone-project-agreement/,
    /capstone-project-research/,
    /production-report-discussions/,
    /capstone-project-survey/,
    /proof-of-concept/,
  ]
  if (projectPatterns.some(re => re.test(p))) {
    type = 'project'
    tags.push('project-deliverable')
    return { type, tags }
  }

  // Categorize articles
  if (p.includes('license')) tags.push('license')
  else if (p.includes('introduction')) tags.push('introduction')
  else if (p.includes('assessment')) tags.push('assessment')
  else if (p.includes('resource')) tags.push('resources')
  else if (p.includes('concept-development')) tags.push('concept-development')
  else if (p.includes('project-categories')) tags.push('project-categories')
  else if (p.includes('writing-project')) { type = 'project'; tags.push('writing-project') }

  return { type, tags }
}

// ═══════════════════════════════════════════════════════════════════
// Link map builder
// ═══════════════════════════════════════════════════════════════════

/**
 * Walk the parsed SUMMARY tree and build a linkMap keyed by the mdPath.
 * Each entry: { type, slug, tags, text, isSection, children (original tree item) }
 *
 * Also returns: sectionItems — the top-level items that have children (become lessons)
 */
function buildLinkMap(summaryTree, prefix) {
  const linkMap = {}
  const sectionItems = []

  function walk(items, depth, context) {
    for (const item of items) {
      const ctx = { ...context }

      // Detect project/capstone section at level 1 (direct children of top-level sections)
      if (depth === 0 && item.text && /projects?|capstone/i.test(item.text) && item.children.length > 0) {
        // The section's own page is an article (overview), children are projects
        ctx.inProjectSection = true
      }
      // Propagate project section context to direct children of a project section
      if (depth >= 1 && context.inProjectSection) {
        ctx.inProjectSection = true
      }

      if (item.path && item.path !== 'README.md') {
        const classification = classifyPage(item.path, prefix, ctx)
        const slug = pathToSlug(item.path, prefix)

        // Override: if this item IS a top-level section (has children + depth 0), it becomes a lesson
        const isTopLevelSection = depth === 0 && item.children.length > 0

        linkMap[item.path] = {
          type: isTopLevelSection ? 'lesson' : classification.type,
          slug: isTopLevelSection ? `${prefix}-${slugify(item.text)}` : slug,
          tags: classification.tags,
          text: item.text,
          isSection: isTopLevelSection,
          treeItem: item,
        }

        if (isTopLevelSection) {
          sectionItems.push(item)
        }
      } else if (!item.path && item.children.length > 0 && depth === 0) {
        // Section with no page of its own — still track as a section-level entry
        sectionItems.push(item)
      }

      // Recurse, passing project section context to children of project sections
      const childCtx = ctx.inProjectSection ? { inProjectSection: true } : {}
      walk(item.children, depth + 1, childCtx)
    }
  }

  walk(summaryTree, 0, {})
  return { linkMap, sectionItems }
}

// ═══════════════════════════════════════════════════════════════════
// Markdown transformations
// ═══════════════════════════════════════════════════════════════════

/**
 * Remove the first # heading from markdown and return { title, body }.
 * Falls back to using an ## heading as the title (kept in body).
 */
function extractAndRemoveTitle(content) {
  const lines = content.split('\n')
  let title = null
  let titleLine = -1

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^# (.+)/)
    if (m) { title = m[1].trim(); titleLine = i; break }
  }

  if (!title) {
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^## (.+)/)
      if (m) { title = m[1].trim(); break }
    }
  }

  if (titleLine >= 0) {
    lines.splice(titleLine, 1)
    if (titleLine < lines.length && lines[titleLine]?.trim() === '') {
      lines.splice(titleLine, 1)
    }
  }

  return { title, body: lines.join('\n').trim() }
}

/** Extract a short description from the first real prose paragraph */
function extractDescription(bodyText, fallback) {
  const paragraphs = bodyText.split('\n\n')
  for (const p of paragraphs) {
    const t = p.trim()
    if (!t) continue
    if (t.startsWith('#')) continue
    if (t.startsWith('!')) continue
    if (t.startsWith('---')) continue
    if (t.startsWith('|')) continue
    if (t.startsWith('- ') || t.startsWith('* ') || /^\d+\./.test(t)) continue
    if (t.startsWith('<')) continue  // HTML blocks

    let desc = t
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_`]/g, '')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (desc.length > 200) desc = desc.substring(0, 197) + '...'
    if (desc.length > 20) return desc
  }
  return fallback
}

/** Rewrite GitBook asset paths: assets/foo.png → /uploads/{prefix}/foo.png */
function rewriteAssetPaths(content, assetTargetDir) {
  // Match markdown images: ![alt](assets/...) or ![alt](./assets/...) or ![alt](../assets/...)
  content = content.replace(
    /!\[([^\]]*)\]\(\.{0,2}\/?(assets\/[^)]+)\)/g,
    (_, alt, assetPath) => `![${alt}](/${assetTargetDir}/${assetPath.replace(/^assets\//, '')})`
  )
  // Match HTML img src: src="assets/..." or src="./assets/..." or src="../assets/..."
  content = content.replace(
    /src=["']\.{0,2}\/?assets\/([^"']+)["']/g,
    `src="/${assetTargetDir}/$1"`
  )
  // Match markdown links to asset files: [text](assets/foo.pdf) or [text](../assets/foo.pdf)
  content = content.replace(
    /\[([^\]]+)\]\(\.{0,2}\/?assets\/([^)]+)\)/g,
    (_, text, assetFile) => `[${text}](/${assetTargetDir}/${assetFile})`
  )
  return content
}

/**
 * Rewrite internal GitBook links to OER content paths.
 * Handles both root-relative (from same dir) and subdir-relative paths.
 * @param {string} content       - Markdown body
 * @param {Object} linkMap       - Map of mdPath → { type, slug }
 * @param {string} sourceFilePath - The mdPath of the current file being processed
 */
function rewriteInternalLinks(content, linkMap, sourceFilePath) {
  // Build a reverse lookup: filename → linkMap entry (for resolving relative links)
  // Also build a fullpath lookup
  const fullPathMap = linkMap

  // Directory of the source file (for resolving relative links)
  const sourceDir = path.dirname(sourceFilePath).replace(/^\./, '')

  return content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, href) => {
    // Skip external and anchor-only
    if (href.startsWith('http') || href.startsWith('https') || href.startsWith('#') || href.startsWith('mailto:')) {
      return match
    }
    // Skip absolute paths to non-.md resources
    if (href.startsWith('/') && !href.endsWith('.md')) return match

    // Extract anchor
    const [hrefPath, anchor] = href.split('#')
    const anchorStr = anchor ? `#${anchor}` : ''

    if (!hrefPath || !hrefPath.endsWith('.md')) return match

    // Resolve relative path to a canonical mdPath
    let resolved = hrefPath
    if (!path.isAbsolute(hrefPath)) {
      // Resolve relative to source file's directory
      const srcDirFull = sourceDir ? sourceDir.replace(/^\//, '') : ''
      if (srcDirFull) {
        resolved = path.posix.normalize(path.posix.join(srcDirFull, hrefPath))
      } else {
        resolved = path.posix.normalize(hrefPath)
      }
    }
    resolved = resolved.replace(/^\//, '')

    const mapped = fullPathMap[resolved]
    if (mapped) {
      if (mapped.type === 'lesson') {
        return `[${text}](/lessons/${mapped.slug}${anchorStr})`
      }
      return `[${text}](/${mapped.type}s/${mapped.slug}${anchorStr})`
    }

    return match
  })
}

// ═══════════════════════════════════════════════════════════════════
// Frontmatter generators
// ═══════════════════════════════════════════════════════════════════

const IMPORT_DATE = new Date().toISOString().split('T')[0]

function generateArticleFrontmatter(title, description, author, license, courseName, prefix, tags) {
  return [
    '---',
    `title: ${yamlValue(title)}`,
    "description: ''",
    'authors:',
    `  - name: ${yamlValue(author)}`,
    `date: '${IMPORT_DATE}'`,
    `license: ${yamlValue(license)}`,
    `courses:`,
    `  - ${yamlValue(courseName)}`,
    'tags:',
    ...tags.map(t => `  - ${t}`),
    'published: true',
    '---',
  ].join('\n') + '\n'
}

function generateProjectFrontmatter(title, author, license, courseName, prefix, tags) {
  return [
    '---',
    `title: ${yamlValue(title)}`,
    'authors:',
    `  - name: ${yamlValue(author)}`,
    `date: '${IMPORT_DATE}'`,
    `license: ${yamlValue(license)}`,
    `courses:`,
    `  - ${yamlValue(courseName)}`,
    'difficulty: intermediate',
    'tags:',
    ...tags.map(t => `  - ${t}`),
    'published: true',
    '---',
  ].join('\n') + '\n'
}

function generateLessonFrontmatter(title, order, author, license, courseName, prefix, tags, outlineYaml) {
  const lines = [
    '---',
    `title: ${yamlValue(title)}`,
    "description: ''",
    'authors:',
    `  - name: ${yamlValue(author)}`,
    `date: '${IMPORT_DATE}'`,
    `license: ${yamlValue(license)}`,
    `courses:`,
    `  - ${yamlValue(courseName)}`,
    `order: ${order}`,
    'tags:',
    ...tags.map(t => `  - ${t}`),
    'published: true',
  ]
  if (outlineYaml && outlineYaml.trim()) {
    lines.push('outline:')
    lines.push(outlineYaml)
  }
  lines.push('---')
  return lines.join('\n') + '\n'
}

// ═══════════════════════════════════════════════════════════════════
// Outline YAML generation
// ═══════════════════════════════════════════════════════════════════

/**
 * Convert a SUMMARY.md subtree to OER outline YAML.
 * @param {Object[]} items      - Array of parsed SUMMARY items
 * @param {Object}   linkMap    - mdPath → { type, slug, isSection }
 * @param {number}   dashIndent - Leading spaces before the `-`
 */
function summaryItemsToOutlineYaml(items, linkMap, dashIndent) {
  const propIndent = dashIndent + 2
  let yaml = ''

  for (const item of items) {
    const p = item.path ? pathToOutlinePath(item.path) : slugify(item.text)

    yaml += ' '.repeat(dashIndent) + `- title: ${yamlValue(item.text)}\n`
    yaml += ' '.repeat(propIndent) + `path: ${p}\n`

    if (item.path && item.path !== 'README.md') {
      const mapped = linkMap[item.path]
      if (mapped) {
        if (mapped.isSection) {
          yaml += ' '.repeat(propIndent) + `content: lessons/${mapped.slug}\n`
        } else {
          yaml += ' '.repeat(propIndent) + `content: ${mapped.type}s/${mapped.slug}\n`
        }
      }
    }

    if (item.children && item.children.length > 0) {
      yaml += ' '.repeat(propIndent) + 'items:\n'
      yaml += summaryItemsToOutlineYaml(item.children, linkMap, dashIndent + 4)
    }
  }

  return yaml
}

// ═══════════════════════════════════════════════════════════════════
// File system helpers
// ═══════════════════════════════════════════════════════════════════

function writeFile(filePath, content, dryRun) {
  if (dryRun) {
    console.log(`  [dry-run] Would write: ${path.relative(WORKSPACE, filePath)}`)
    return
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content)
}

function copyFileToDir(src, destDir, destName, dryRun) {
  if (!fs.existsSync(src)) return false
  if (dryRun) {
    console.log(`  [dry-run] Would copy: ${src} → ${path.join(destDir, destName)}`)
    return true
  }
  fs.mkdirSync(destDir, { recursive: true })
  fs.copyFileSync(src, path.join(destDir, destName))
  return true
}

/** Recursively copy all files from srcDir into destDir (flat) */
function copyAssetsRecursive(srcDir, destDir, dryRun) {
  let count = 0
  if (!fs.existsSync(srcDir)) return count
  if (!dryRun) fs.mkdirSync(destDir, { recursive: true })

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name)
    if (entry.isDirectory()) {
      count += copyAssetsRecursive(srcPath, destDir, dryRun)
    } else if (entry.isFile()) {
      if (dryRun) {
        console.log(`  [dry-run] Would copy asset: ${entry.name}`)
      } else {
        fs.copyFileSync(srcPath, path.join(destDir, entry.name))
      }
      count++
    }
  }
  return count
}

// ═══════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════

async function main() {
  const opts = parseArgs()

  if (!opts.prefix || !COURSE_CONFIGS[opts.prefix]) {
    console.error(`
Error: --prefix is required. Valid values: ${Object.keys(COURSE_CONFIGS).join(', ')}

Usage:
  node scripts/import-gitbook-book.mjs --prefix dmd300
  node scripts/import-gitbook-book.mjs --prefix dmd400
  node scripts/import-gitbook-book.mjs --prefix dmd300 --repo-dir /tmp/dmd-300-master
  node scripts/import-gitbook-book.mjs --prefix dmd300 --dry-run
`)
    process.exit(1)
  }

  const cfg = COURSE_CONFIGS[opts.prefix]
  const {
    repoUrl, bookSlug, bookTitle, courseName, defaultAuthor,
    license, assetTargetDir, coverTarget, tags: bookTags, theme,
  } = cfg
  const prefix = opts.prefix
  const dryRun = opts.dryRun

  if (dryRun) console.log('\n⚠  DRY RUN — no files will be written.\n')

  // ─── Clone / locate repo ────────────────────────────────────────
  let repoDir = opts.repoDir
  if (!repoDir) {
    repoDir = `/tmp/${prefix}-import`
    if (fs.existsSync(path.join(repoDir, '.git'))) {
      console.log(`Using existing clone at ${repoDir}`)
      try { execSync('git pull', { cwd: repoDir, stdio: 'pipe' }) }
      catch { console.log('  (pull failed, using as-is)') }
    } else {
      console.log(`Cloning ${repoUrl} …`)
      execSync(`rm -rf "${repoDir}"`)
      execSync(`git clone --depth 1 "${repoUrl}" "${repoDir}"`, { stdio: 'inherit' })
    }
  }

  console.log(`\n  Source: ${repoDir}`)
  console.log(`  Target: ${WORKSPACE}`)
  console.log(`  Prefix: ${prefix}`)
  console.log(`  Book:   ${bookSlug}\n`)

  // ─── Step 1: Parse SUMMARY.md ────────────────────────────────────
  console.log('Step 1: Parsing SUMMARY.md…')
  const summaryPath = path.join(repoDir, 'SUMMARY.md')
  if (!fs.existsSync(summaryPath)) {
    throw new Error(`SUMMARY.md not found at ${summaryPath}`)
  }
  const summaryText = fs.readFileSync(summaryPath, 'utf-8')
  const summaryTree = parseSummary(summaryText)
  console.log(`  ${summaryTree.length} top-level entries`)

  // ─── Step 2: Build link map ────────────────────────────────────
  console.log('Step 2: Building link map…')
  const { linkMap, sectionItems } = buildLinkMap(summaryTree, prefix)
  const totalPages = Object.keys(linkMap).length
  const lessonCount_planned = Object.values(linkMap).filter(m => m.isSection).length
  console.log(`  ${totalPages} pages mapped (${lessonCount_planned} top-level sections → lessons)`)

  // ─── Step 3: Import content files ─────────────────────────────
  console.log('Step 3: Importing content files…')
  const stats = { articles: 0, projects: 0, lessons: 0, skipped: 0, errors: [] }

  for (const [mdPath, mapping] of Object.entries(linkMap)) {
    // Skip lesson-section pages that will be handled in Step 5
    if (mapping.isSection) continue

    const sourceFile = path.join(repoDir, mdPath)
    if (!fs.existsSync(sourceFile)) {
      console.log(`  ⚠  Missing: ${mdPath}`)
      stats.errors.push(`Missing: ${mdPath}`)
      stats.skipped++
      continue
    }

    const raw = fs.readFileSync(sourceFile, 'utf-8')
    const { title: extractedTitle, body: bodyNoTitle } = extractAndRemoveTitle(raw)
    const title = extractedTitle || mapping.text || mapping.slug

    let body = rewriteAssetPaths(bodyNoTitle, assetTargetDir)
    body = rewriteInternalLinks(body, linkMap, mdPath)

    const outputPath = path.join(WORKSPACE, 'content', `${mapping.type}s`, mapping.slug, 'index.md')
    let frontmatter

    if (mapping.type === 'article') {
      const desc = extractDescription(body, `Imported from ${bookTitle}`)
      frontmatter = generateArticleFrontmatter(title, desc, defaultAuthor, license, courseName, prefix, mapping.tags)
      stats.articles++
    } else {
      frontmatter = generateProjectFrontmatter(title, defaultAuthor, license, courseName, prefix, mapping.tags)
      stats.projects++
    }

    writeFile(outputPath, frontmatter + '\n' + body + '\n', dryRun)
    if (!dryRun) console.log(`  → content/${mapping.type}s/${mapping.slug}/index.md`)
  }
  console.log(`  ${stats.articles} articles, ${stats.projects} projects written`)

  // ─── Step 4: Copy assets ────────────────────────────────────────
  console.log('Step 4: Copying assets…')
  const targetAssetsDir = path.join(WORKSPACE, 'public', assetTargetDir)
  const assetSrcDir = path.join(repoDir, 'assets')
  let assetCount = copyAssetsRecursive(assetSrcDir, targetAssetsDir, dryRun)
  console.log(`  ${assetCount} files → public/${assetTargetDir}/`)

  // ─── Step 5: Copy cover image ────────────────────────────────────
  console.log('Step 5: Copying cover image…')
  const coverSrc = path.join(repoDir, 'cover.jpg')
  const coverDestDir = path.join(WORKSPACE, 'public', path.dirname(coverTarget))
  const coverDestName = path.basename(coverTarget)
  const coverCopied = copyFileToDir(coverSrc, coverDestDir, coverDestName, dryRun)
  if (coverCopied) {
    console.log(`  cover.jpg → public/${coverTarget}`)
  } else {
    console.log(`  ⚠  cover.jpg not found at ${coverSrc}`)
  }
  const coverImageRef = coverCopied ? `/${coverTarget}` : ''

  // ─── Step 6: Generate lesson files ───────────────────────────────
  console.log('Step 6: Generating lesson files for top-level sections…')
  let lessonOrder = 0
  let lessonsWritten = 0

  for (const sectionItem of sectionItems) {
    if (!sectionItem.path || !linkMap[sectionItem.path]) continue

    const mapping = linkMap[sectionItem.path]
    if (!mapping.isSection) continue

    lessonOrder++
    const lessonSlug = mapping.slug
    const lessonTitle = mapping.text
    const lessonTags = [prefix, ...mapping.tags.filter(t => !mapping.tags.includes(t))]

    // Build lesson outline from the section's children
    const outlineYaml = (sectionItem.children && sectionItem.children.length > 0)
      ? summaryItemsToOutlineYaml(sectionItem.children, linkMap, 2).trimEnd()
      : ''

    // Read the section's own page as the lesson body
    const sourceFile = path.join(repoDir, sectionItem.path)
    let lessonBody = ''
    if (fs.existsSync(sourceFile)) {
      const raw = fs.readFileSync(sourceFile, 'utf-8')
      const { body: bodyNoTitle } = extractAndRemoveTitle(raw)
      lessonBody = rewriteAssetPaths(bodyNoTitle, assetTargetDir)
      lessonBody = rewriteInternalLinks(lessonBody, linkMap, sectionItem.path)
    }

    const fm = generateLessonFrontmatter(
      lessonTitle, lessonOrder, defaultAuthor, license, courseName, prefix,
      ['lesson'], outlineYaml
    )
    const outputPath = path.join(WORKSPACE, 'content', 'lessons', lessonSlug, 'index.md')
    writeFile(outputPath, fm + '\n' + lessonBody.trim() + '\n', dryRun)
    if (!dryRun) console.log(`  → content/lessons/${lessonSlug}/index.md`)
    lessonsWritten++
  }
  console.log(`  ${lessonsWritten} lesson files generated`)

  // ─── Step 7: Parse README for book description ───────────────────
  console.log('Step 7: Generating book index…')
  const readmePath = path.join(repoDir, 'README.md')
  let bookBody = ''
  let bookDescription = `${bookTitle}.`
  if (fs.existsSync(readmePath)) {
    const raw = fs.readFileSync(readmePath, 'utf-8')
    const { body: bodyNoTitle } = extractAndRemoveTitle(raw)
    bookBody = rewriteAssetPaths(bodyNoTitle, assetTargetDir)
    bookBody = rewriteInternalLinks(bookBody, linkMap, 'README.md')
    bookDescription = extractDescription(bookBody, bookDescription)
  }

  // Build book outline YAML from the full SUMMARY tree (excluding README)
  //   Top-level with page → reference lessons/ or articles/
  //   Others → articles/projects inline
  const bookOutlineYaml = summaryItemsToOutlineYaml(summaryTree, linkMap, 2).trimEnd()

  const bookFm = [
    '---',
    `title: ${yamlValue(bookTitle)}`,
    'description: >-',
    ...bookDescription.match(/.{1,80}(\s|$)/g).map(l => `  ${l.trimEnd()}`),
    'authors:',
    `  - name: ${yamlValue(defaultAuthor)}`,
    `date: '${IMPORT_DATE}'`,
    `coverImage: ${yamlValue(coverImageRef)}`,
    "coverImageAlt: ''",
    `license: ${yamlValue(license)}`,
    `courses:`,
    `  - ${yamlValue(courseName)}`,
    'published: false',
    `theme: ${theme}`,
    'tags:',
    ...bookTags.map(t => `  - ${t}`),
    'outline:',
    bookOutlineYaml,
    '---',
  ].join('\n') + '\n'

  const bookOutputPath = path.join(WORKSPACE, 'content', 'books', bookSlug, 'index.md')
  writeFile(bookOutputPath, bookFm + '\n' + bookBody.trim() + '\n', dryRun)
  console.log(`  → content/books/${bookSlug}/index.md`)

  // ─── Summary report ───────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════')
  console.log(` Import complete! (${dryRun ? 'DRY RUN' : 'live'})`)
  console.log('══════════════════════════════════════════════')
  console.log(`  Articles:  ${stats.articles}`)
  console.log(`  Projects:  ${stats.projects}`)
  console.log(`  Lessons:   ${lessonsWritten}`)
  console.log(`  Assets:    ${assetCount}`)
  console.log(`  Cover:     ${coverCopied ? `public/${coverTarget}` : '⚠ not found'}`)
  console.log(`  Book:      content/books/${bookSlug}/index.md`)
  if (stats.errors.length > 0) {
    console.log('\n  ⚠  Missing source files:')
    for (const err of stats.errors) console.log(`    - ${err}`)
  }
  console.log('')
}

main().catch(err => {
  console.error('\n✗ Import failed:', err.message)
  console.error(err.stack)
  process.exit(1)
})
