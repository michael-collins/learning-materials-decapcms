#!/usr/bin/env node
/**
 * VitePress DMD-100 Book → OER Platform Import Script
 *
 * Imports the dmd-program/dmd-100-book repository into the OER platform's
 * collection system (books, articles, exercises, projects).
 *
 * Usage:
 *   node scripts/import-vitepress-book.mjs
 *   node scripts/import-vitepress-book.mjs --repo-dir /path/to/dmd-100-book
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const WORKSPACE = path.resolve(__dirname, '..')

// ═══════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════

const REPO_URL = 'https://github.com/dmd-program/dmd-100-book.git'
const BOOK_SLUG = 'dmd-100-digital-multimedia-design'
const PREFIX = 'dmd100'
const DEFAULT_AUTHOR = 'Michael Collins'
const DEFAULT_LICENSE = 'CC BY 4.0'
const IMPORT_DATE = new Date().toISOString().split('T')[0]
const ASSET_TARGET_DIR = `uploads/${PREFIX}` // relative to public/

// ═══════════════════════════════════════════════════════════════════
// String Helpers
// ═══════════════════════════════════════════════════════════════════

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Convert a VitePress sidebar link to an OER content slug */
function vitepressLinkToSlug(link) {
  if (link === '/') return `${PREFIX}-index`
  if (link === '/LICENSE') return `${PREFIX}-license`

  const cleaned = link
    .replace(/^\//, '')
    .replace(/^lessons\//, '')     // 'lessons/' is redundant (lesson-N already present)
    .replace(/\/projects\//, '/')  // 'projects/' is redundant with collection type
    .replace(/\/practice\//, '/')  // 'practice/' is redundant with collection type

  return `${PREFIX}-${slugify(cleaned)}`
}

/** Convert a VitePress sidebar link to a short outline path slug */
function linkToOutlinePath(link) {
  if (link === '/') return 'home'
  const segments = link.replace(/^\//, '').split('/')
  return slugify(segments[segments.length - 1])
}

/** Convert a VitePress sidebar link to the source .md file path */
function linkToSourcePath(link) {
  if (link === '/') return 'docs/index.md'
  return `docs${link}.md`
}

/** Safely format a string for YAML output */
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

// ═══════════════════════════════════════════════════════════════════
// Content Classification
// ═══════════════════════════════════════════════════════════════════

/**
 * Classify a VitePress link into an OER collection type with tags.
 * @param {string} link - VitePress sidebar link (e.g. '/lessons/lesson-1/topics/what_is_design')
 * @param {{ lesson?: string }} context - Contextual info from sidebar walk
 */
function classifyLink(link, context = {}) {
  const tags = ['dmd-100']
  let type = 'article'

  if (context.lesson) tags.push(context.lesson)

  const p = link.replace(/^\//, '')
  const parts = p.split('/')

  // introduction/* → article
  if (parts[0] === 'introduction') {
    tags.push('introduction')
    return { type, tags }
  }

  // toolkit/*
  if (parts[0] === 'toolkit') {
    tags.push('toolkit')
    return { type, tags }
  }

  // topics/* (root-level)
  if (parts[0] === 'topics') {
    tags.push('topic')
    return { type, tags }
  }

  // / (home) or /LICENSE
  if (link === '/') { tags.push('home'); return { type, tags } }
  if (link === '/LICENSE') { tags.push('license'); return { type, tags } }

  // lessons/* paths
  if (parts[0] === 'lessons') {
    // Lesson intro pages: /lessons/introduction-*
    if (parts.length === 2 && !parts[1].startsWith('lesson-')) {
      tags.push('lesson-introduction')
      return { type, tags }
    }

    // /lessons/what-is-design/* (discussion)
    if (parts[1] === 'what-is-design') {
      if (!context.lesson) tags.push('lesson-1')
      tags.push('discussion')
      return { type, tags }
    }

    // /lessons/lesson-N/subdir/...
    if (parts[1]?.startsWith('lesson-')) {
      if (!context.lesson) tags.push(parts[1])
      const subDir = parts[2]

      if (subDir === 'practice') {
        tags.push('activity')
        return { type: 'exercise', tags }
      }
      if (subDir === 'projects') {
        // Add project name as tag (e.g. 'ritual', 'narrative', 'open-design')
        if (parts[3]) tags.push(slugify(parts[3]))
        tags.push('project')
        return { type: 'project', tags }
      }

      const categoryTag = {
        topics: 'topic',
        readings: 'reading',
        listening: 'listening',
        watching: 'watching',
      }[subDir]
      if (categoryTag) tags.push(categoryTag)
      return { type, tags }
    }
  }

  return { type, tags }
}

// ═══════════════════════════════════════════════════════════════════
// Sidebar Parser
// ═══════════════════════════════════════════════════════════════════

/**
 * Extract the sidebar array from the VitePress config.mjs file text.
 * Uses bracket matching to find the sidebar array literal, then evaluates it.
 */
function extractSidebarFromConfig(configText) {
  const start = configText.indexOf('sidebar: [')
  if (start === -1) throw new Error('Could not find sidebar in config')

  const arrayStart = configText.indexOf('[', start)
  let depth = 0
  let inString = false
  let stringChar = null
  let escaped = false
  let arrayEnd = -1

  for (let i = arrayStart; i < configText.length; i++) {
    const ch = configText[i]
    if (escaped) { escaped = false; continue }
    if (ch === '\\') { escaped = true; continue }
    if (inString) { if (ch === stringChar) inString = false; continue }
    if (ch === "'" || ch === '"' || ch === '`') { inString = true; stringChar = ch; continue }
    // Skip // comments
    if (ch === '/' && configText[i + 1] === '/') {
      while (i < configText.length && configText[i] !== '\n') i++
      continue
    }
    if (ch === '[') depth++
    else if (ch === ']') { depth--; if (depth === 0) { arrayEnd = i; break } }
  }

  if (arrayEnd === -1) throw new Error('Could not find end of sidebar array')

  let arrayText = configText.substring(arrayStart, arrayEnd + 1)
  // Strip full-line comments (which would be invalid inside a JS array literal)
  arrayText = arrayText.split('\n').filter(l => !l.trim().startsWith('//')).join('\n')

  try {
    return new Function('return ' + arrayText)()
  } catch (e) {
    throw new Error(`Failed to evaluate sidebar JS: ${e.message}`)
  }
}

// ═══════════════════════════════════════════════════════════════════
// Sidebar Walk → Link Map
// ═══════════════════════════════════════════════════════════════════

/**
 * Recursively walk the sidebar tree, collecting every link into linkMap
 * with classification, slug, tags, source path, and display text.
 */
function walkSidebar(items, context, linkMap) {
  for (const item of items) {
    const ctx = { ...context }

    // Detect lesson group (e.g. "Lesson 2: Visual and interaction design")
    const lessonMatch = item.text.match(/^Lesson (\d+):/)
    if (lessonMatch) ctx.lesson = `lesson-${lessonMatch[1]}`

    if (item.link) {
      const classification = classifyLink(item.link, ctx)
      linkMap[item.link] = {
        type: classification.type,
        slug: vitepressLinkToSlug(item.link),
        tags: classification.tags,
        sourcePath: linkToSourcePath(item.link),
        sidebarText: item.text,
      }
    }

    if (item.items) walkSidebar(item.items, ctx, linkMap)
  }
}

// ═══════════════════════════════════════════════════════════════════
// Markdown Transformations
// ═══════════════════════════════════════════════════════════════════

/**
 * Extract the first h1 heading as title and remove it from the body.
 * Falls back to h2 as title source (but keeps h2 in body).
 */
function extractAndRemoveTitle(content) {
  const lines = content.split('\n')
  let title = null
  let titleLine = -1

  // Find first # heading
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^# (.+)/)
    if (m) { title = m[1].trim(); titleLine = i; break }
  }

  // Fallback: use ## heading as title source (don't remove from body)
  if (!title) {
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^## (.+)/)
      if (m) { title = m[1].trim(); break }
    }
  }

  // Remove the h1 line (and trailing blank line)
  if (titleLine >= 0) {
    lines.splice(titleLine, 1)
    if (titleLine < lines.length && lines[titleLine]?.trim() === '') {
      lines.splice(titleLine, 1)
    }
  }

  return { title, body: lines.join('\n').trim() }
}

/** Extract a short description from the first real paragraph of body text */
function extractDescription(bodyText) {
  const paragraphs = bodyText.split('\n\n')
  for (const p of paragraphs) {
    const t = p.trim()
    if (!t) continue
    if (t.startsWith('#')) continue    // headings
    if (t.startsWith('!')) continue    // images
    if (t.startsWith('---')) continue  // hr
    if (t.startsWith('|')) continue    // tables
    if (t.startsWith('- ') || t.startsWith('* ') || /^\d+\./.test(t)) continue // lists

    let desc = t
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // strip links to text
      .replace(/[*_`]/g, '')                      // strip formatting
      .replace(/\n/g, ' ')                        // join lines
      .replace(/\s+/g, ' ')
      .trim()

    if (desc.length > 200) desc = desc.substring(0, 197) + '...'
    return desc
  }
  return 'Imported from DMD 100: Digital Multimedia Design Foundations'
}

/** Rewrite image paths: /assets/X → /uploads/dmd100/X */
function rewriteImagePaths(content) {
  return content.replace(
    /(?<!\w)\/assets\//g,
    `/${ASSET_TARGET_DIR}/`
  )
}

/**
 * Rewrite internal VitePress links to OER content paths.
 * [text](/lessons/lesson-1/topics/what_is_design) → [text](/articles/dmd100-lesson-1-topics-what-is-design)
 */
function rewriteInternalLinks(content, linkMap) {
  return content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, href) => {
    // Skip external, anchor-only, mailto links
    if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) {
      return match
    }
    // Only process absolute VitePress-style paths
    if (!href.startsWith('/')) return match

    const cleanHref = href.split('#')[0]
    const anchor = href.includes('#') ? '#' + href.split('#')[1] : ''
    const mapped = linkMap[cleanHref]
    if (mapped) {
      return `[${text}](/${mapped.type}s/${mapped.slug}${anchor})`
    }
    return match
  })
}

// ═══════════════════════════════════════════════════════════════════
// Source Frontmatter Parsing
// ═════════════════════════════════════════════════════════════════

/**
 * Parse YAML frontmatter from a VitePress source file.
 * Returns { author: string|null, body: string (content after frontmatter) }.
 * Only handles simple key:value fields (no nesting). YAML comments are stripped.
 */
function parseSourceFrontmatter(raw) {
  if (!raw.startsWith('---')) return { author: null, body: raw }

  const endIdx = raw.indexOf('---', 3)
  if (endIdx === -1) return { author: null, body: raw }

  const yamlBlock = raw.slice(3, endIdx)
  const body = raw.slice(endIdx + 3).replace(/^\n/, '')

  // Extract author: value (simple string, skip YAML comments)
  let author = null
  for (const line of yamlBlock.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('#')) continue // YAML comment
    const m = trimmed.match(/^author:\s*(.+)$/)
    if (m) { author = m[1].trim().replace(/^['"]|['"]$/g, ''); break }
  }

  return { author, body }
}

// ═════════════════════════════════════════════════════════════════
// Frontmatter Generation
// ═════════════════════════════════════════════════════════════════

function generateArticleFrontmatter(title, description, authorName, tags) {
  return [
    '---',
    `title: ${yamlValue(title)}`,
    "description: ''",
    'authors:',
    `  - name: ${yamlValue(authorName)}`,
    `date: '${IMPORT_DATE}'`,
    `license: ${DEFAULT_LICENSE}`,
    'course: dmd100',
    'tags:',
    ...tags.map(t => `  - ${t}`),
    'published: true',
    '---',
  ].join('\n') + '\n'
}

function generateExerciseFrontmatter(title, tags, authorName) {
  return [
    '---',
    `title: ${yamlValue(title)}`,
    'authors:',
    `  - name: ${yamlValue(authorName)}`,
    `date: '${IMPORT_DATE}'`,
    `license: ${DEFAULT_LICENSE}`,
    'difficulty: beginner',
    'course: dmd100',
    'tags:',
    ...tags.map(t => `  - ${t}`),
    'published: true',
    '---',
  ].join('\n') + '\n'
}

function generateProjectFrontmatter(title, tags, authorName) {
  return [
    '---',
    `title: ${yamlValue(title)}`,
    'authors:',
    `  - name: ${yamlValue(authorName)}`,
    `date: '${IMPORT_DATE}'`,
    `license: ${DEFAULT_LICENSE}`,
    'difficulty: intermediate',
    'course: dmd100',
    'tags:',
    ...tags.map(t => `  - ${t}`),
    'published: true',
    '---',
  ].join('\n') + '\n'
}

/**
 * Generate frontmatter for a DMD 100 lesson content file.
 * @param {string} title - Lesson title (without "Lesson N: " prefix)
 * @param {number} order - Lesson number (1-based)
 * @param {string[]} tags - Tags array
 * @param {string} authorName - Author name
 * @param {string} outlineYaml - Pre-formatted YAML for the outline field (each line indented 2 spaces)
 */
function generateLessonFrontmatter(title, order, tags, authorName, outlineYaml) {
  const lines = [
    '---',
    `title: ${yamlValue(title)}`,
    "description: ''",
    'authors:',
    `  - name: ${yamlValue(authorName)}`,
    `date: '${IMPORT_DATE}'`,
    `license: ${DEFAULT_LICENSE}`,
    'course: dmd100',
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
// Outline Generation
// ═══════════════════════════════════════════════════════════════════

/**
 * Derive a short path slug from a sidebar item.
 * Uses the last segment of the link, or slugifies the display text.
 */
function outlinePath(item) {
  if (item.link) return linkToOutlinePath(item.link)
  // For group items, strip "Lesson N: " prefix
  let text = item.text
    .replace(/^Lesson \d+:\s*/i, '')
  return slugify(text).substring(0, 40)
}

/**
 * Recursively convert VitePress sidebar items to OER outline YAML string.
 * @param {number} dashIndent - number of spaces before the `-` for this level
 * @param {Object} lessonMap - Optional mapping from article content refs (e.g.
 *   "articles/dmd100-introduction-what-is-design") to lesson content refs
 *   (e.g. "lessons/dmd100-lesson-1-what-is-design"). When a match is found the
 *   lesson ref is written instead of the article ref.
 */
function outlineItemsToYaml(items, linkMap, dashIndent, lessonMap = {}) {
  const propIndent = dashIndent + 2
  let yaml = ''

  for (const item of items) {
    const p = outlinePath(item)

    yaml += ' '.repeat(dashIndent) + `- title: ${yamlValue(item.text)}\n`
    yaml += ' '.repeat(propIndent) + `path: ${p}\n`

    // If this item has a link, reference the imported content.
    // Skip the home link — its content is the book body.
    // Apply lessonMap substitution so lesson intro articles become lesson refs.
    if (item.link && item.link !== '/' && linkMap[item.link]) {
      const m = linkMap[item.link]
      const defaultRef = `${m.type}s/${m.slug}`
      const contentRef = lessonMap[defaultRef] || defaultRef
      yaml += ' '.repeat(propIndent) + `content: ${contentRef}\n`
    }

    if (item.items && item.items.length > 0) {
      yaml += ' '.repeat(propIndent) + 'items:\n'
      yaml += outlineItemsToYaml(item.items, linkMap, dashIndent + 4, lessonMap)
    }
  }

  return yaml
}

/** Generate the full book index.md with frontmatter + outline + body.
 *  The body comes from the VitePress home page (docs/index.md).
 *  @param {Object} lessonMap - Maps article content refs to lesson content refs
 *    (built during lesson-generation step). Passed to outlineItemsToYaml so
 *    lesson-level outline nodes reference lesson content types instead of articles.
 */
function generateBookIndexMd(sidebar, linkMap, repoDir, lessonMap = {}) {
  let fm = ''
  fm += '---\n'
  fm += "title: 'DMD 100: Digital Multimedia Design Foundations'\n"
  fm += 'description: >-\n'
  fm += '  DMD 100 introduces design process and thinking skills to support and\n'
  fm += '  facilitate creative and reasoned approaches to ambiguous and ill-defined\n'
  fm += '  problem spaces. It is the first of three spine courses in the Bachelor of\n'
  fm += '  Design in Digital Multimedia Design program at Penn State University.\n'
  fm += 'authors:\n'
  fm += `  - name: ${DEFAULT_AUTHOR}\n`
  fm += `date: '${IMPORT_DATE}'\n`
  fm += "coverImage: ''\n"
  fm += "coverImageAlt: ''\n"
  fm += `license: ${DEFAULT_LICENSE}\n`
  fm += 'course: dmd100\n'
  fm += 'published: true\n'
  fm += 'theme: lambda\n'
  fm += 'tags:\n  - design\n  - digital-multimedia\n  - foundations\n  - dmd-100\n'
  fm += 'outline:\n'
  fm += outlineItemsToYaml(sidebar, linkMap, 2, lessonMap)
  fm += '---\n'

  // Use the VitePress home page (docs/index.md) as the book body
  const homeFile = path.join(repoDir, 'docs', 'index.md')
  let body = ''
  if (fs.existsSync(homeFile)) {
    const raw = fs.readFileSync(homeFile, 'utf-8')
    const { title: _title, body: bodyNoTitle } = extractAndRemoveTitle(raw)
    body = rewriteImagePaths(bodyNoTitle)
    body = rewriteInternalLinks(body, linkMap)
  }
  return fm + '\n' + body.trim() + '\n'
}

// ═══════════════════════════════════════════════════════════════════
// File System Helpers
// ═══════════════════════════════════════════════════════════════════

/** Recursively find all .md files under a directory */
function findAllMdFiles(dir) {
  const results = []
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      results.push(...findAllMdFiles(full))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(full)
    }
  }
  return results
}

/** Recursively copy a directory's files into a flat target directory */
function copyAssetsRecursive(srcDir, destDir) {
  let count = 0
  if (!fs.existsSync(srcDir)) return count
  fs.mkdirSync(destDir, { recursive: true })
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name)
    if (entry.isDirectory()) {
      // Flatten: copy sub-directory contents into the same target dir
      count += copyAssetsRecursive(srcPath, destDir)
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, path.join(destDir, entry.name))
      count++
    }
  }
  return count
}

/** Write a file, creating its directory if needed */
function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content)
}

// ═══════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2)
  let repoDir = null

  // Accept --repo-dir /path/to/clone
  const idx = args.indexOf('--repo-dir')
  if (idx !== -1 && args[idx + 1]) {
    repoDir = path.resolve(args[idx + 1])
  }

  // Clone if no repo-dir provided
  if (!repoDir) {
    repoDir = '/tmp/dmd-100-book'
    if (fs.existsSync(path.join(repoDir, '.git'))) {
      console.log(`Using existing clone at ${repoDir}`)
      try { execSync('git pull', { cwd: repoDir, stdio: 'pipe' }) }
      catch { console.log('  (pull failed, using as-is)') }
    } else {
      console.log(`Cloning ${REPO_URL} …`)
      execSync(`rm -rf ${repoDir}`)
      execSync(`git clone --depth 1 ${REPO_URL} ${repoDir}`, { stdio: 'inherit' })
    }
  }

  console.log(`\n  Source: ${repoDir}`)
  console.log(`  Target: ${WORKSPACE}\n`)

  // ─── Step 1: Parse sidebar ─────────────────────────────────────
  console.log('Step 1: Parsing VitePress sidebar config…')
  const configPath = path.join(repoDir, 'docs', '.vitepress', 'config.mjs')
  const configText = fs.readFileSync(configPath, 'utf-8')
  const sidebar = extractSidebarFromConfig(configText)
  console.log(`  ${sidebar.length} top-level sections`)

  // ─── Step 2: Build link map ────────────────────────────────────
  console.log('Step 2: Building link map…')
  const linkMap = {}
  walkSidebar(sidebar, {}, linkMap)
  const sidebarLinkCount = Object.keys(linkMap).length
  console.log(`  ${sidebarLinkCount} pages in sidebar`)

  // Check for orphan .md files NOT referenced by sidebar
  const docsDir = path.join(repoDir, 'docs')
  const allMdFiles = findAllMdFiles(docsDir)
  const knownSourcePaths = new Set(Object.values(linkMap).map(m => m.sourcePath))
  const skipFiles = new Set(['docs/oer-schema-test.md'])
  const skipPrefixes = ['docs/.vitepress/', 'docs/assets/']
  let orphanCount = 0

  for (const absPath of allMdFiles) {
    const rel = 'docs/' + path.relative(docsDir, absPath).replace(/\\/g, '/')
    if (knownSourcePaths.has(rel) || skipFiles.has(rel)) continue
    if (skipPrefixes.some(pfx => rel.startsWith(pfx))) continue

    const fakeLink = '/' + rel.replace(/^docs\//, '').replace(/\.md$/, '')
    const classification = classifyLink(fakeLink, {})
    linkMap[fakeLink] = {
      type: classification.type,
      slug: vitepressLinkToSlug(fakeLink),
      tags: classification.tags,
      sourcePath: rel,
      sidebarText: null,
      orphan: true,
    }
    orphanCount++
  }
  if (orphanCount) console.log(`  ${orphanCount} orphan files added`)

  // ─── Step 3: Process markdown files ────────────────────────────
  console.log('Step 3: Importing content…')
  const stats = { articles: 0, exercises: 0, projects: 0, skipped: 0, errors: [] }

  for (const [link, mapping] of Object.entries(linkMap)) {
    // Skip the home page — its content is used as the book body
    if (link === '/') {
      stats.skipped++
      continue
    }
    const sourceFile = path.join(repoDir, mapping.sourcePath)
    if (!fs.existsSync(sourceFile)) {
      console.log(`  ⚠  Missing: ${mapping.sourcePath}`)
      stats.errors.push(`Missing: ${mapping.sourcePath}`)
      stats.skipped++
      continue
    }

    const raw = fs.readFileSync(sourceFile, 'utf-8')
    // Extract any source-file frontmatter (e.g. author override), then strip it
    const { author: sourceAuthor, body: rawNoFm } = parseSourceFrontmatter(raw)
    const pageAuthor = sourceAuthor || DEFAULT_AUTHOR
    const { title: extractedTitle, body: bodyNoTitle } = extractAndRemoveTitle(rawNoFm)
    const title = extractedTitle || mapping.sidebarText || mapping.slug

    // Transform body
    let body = rewriteImagePaths(bodyNoTitle)
    body = rewriteInternalLinks(body, linkMap)

    // Generate frontmatter based on collection type
    let frontmatter
    const collectionKey = `${mapping.type}s` // 'articles' | 'exercises' | 'projects'

    if (mapping.type === 'article') {
      const desc = extractDescription(body)
      frontmatter = generateArticleFrontmatter(title, desc, pageAuthor, mapping.tags)
    } else if (mapping.type === 'exercise') {
      frontmatter = generateExerciseFrontmatter(title, mapping.tags, pageAuthor)
    } else {
      frontmatter = generateProjectFrontmatter(title, mapping.tags, pageAuthor)
    }

    const outputFile = path.join(WORKSPACE, 'content', collectionKey, mapping.slug, 'index.md')
    writeFile(outputFile, frontmatter + '\n' + body + '\n')
    stats[collectionKey]++
  }

  console.log(`  ${stats.articles} articles, ${stats.exercises} exercises, ${stats.projects} projects`)
  if (stats.skipped) console.log(`  ${stats.skipped} skipped`)

  // ─── Step 4: Copy assets ───────────────────────────────────────
  console.log('Step 4: Copying assets…')
  const targetAssetsDir = path.join(WORKSPACE, 'public', ASSET_TARGET_DIR)
  let assetCount = 0
  assetCount += copyAssetsRecursive(path.join(repoDir, 'docs', 'assets'), targetAssetsDir)

  // Also copy image files from docs/public/ (static assets)
  const publicDir = path.join(repoDir, 'docs', 'public')
  if (fs.existsSync(publicDir)) {
    assetCount += copyAssetsRecursive(publicDir, targetAssetsDir)
  }
  console.log(`  ${assetCount} files → public/${ASSET_TARGET_DIR}/`)

  // ─── Step 5: Generate lesson content files ────────────────────
  console.log('Step 5: Generating lesson content files…')
  /**
   * lessonMap: maps the intro-article content ref (written in the book outline)
   * to the lesson content ref so the book outline can reference lessons.
   * e.g. "articles/dmd100-introduction-what-is-design" → "lessons/dmd100-lesson-1-what-is-design"
   */
  const lessonMap = {}
  let lessonCount = 0

  for (const sidebarItem of sidebar) {
    // Identify lesson groups: top-level sidebar items with "Lesson N: Title" text
    const lessonMatch = sidebarItem.text?.match(/^Lesson (\d+):\s*(.+)$/)
    if (!lessonMatch) continue

    const lessonNumber = parseInt(lessonMatch[1], 10)
    const lessonTitle = lessonMatch[2].trim()
    const lessonSlug = `${PREFIX}-lesson-${lessonNumber}-${slugify(lessonTitle)}`
    const lessonTags = ['dmd-100', `lesson-${lessonNumber}`]

    // Build the lesson's outline YAML from its sidebar sub-items (categories like Topics, Readings, etc.)
    // Do NOT pass lessonMap here — the lesson's internal content refs should stay as articles/projects
    const lessonOutlineYaml = (sidebarItem.items && sidebarItem.items.length)
      ? outlineItemsToYaml(sidebarItem.items, linkMap, 2).trimEnd()
      : ''

    // Get lesson body from the intro source file (the lesson's linked page, if present)
    let lessonBody = ''
    if (sidebarItem.link && sidebarItem.link !== '/' && linkMap[sidebarItem.link]) {
      const introMapping = linkMap[sidebarItem.link]
      const sourceFile = path.join(repoDir, introMapping.sourcePath)
      if (fs.existsSync(sourceFile)) {
        const raw = fs.readFileSync(sourceFile, 'utf-8')
        const { body: rawNoFm } = parseSourceFrontmatter(raw)
        const { body: bodyNoTitle } = extractAndRemoveTitle(rawNoFm)
        lessonBody = rewriteImagePaths(bodyNoTitle)
        lessonBody = rewriteInternalLinks(lessonBody, linkMap)
      }
      // Register the intro article content ref → lesson content ref mapping
      const introContentRef = `${introMapping.type}s/${introMapping.slug}`
      lessonMap[introContentRef] = `lessons/${lessonSlug}`
    }

    // Write the lesson content file
    const lessonFm = generateLessonFrontmatter(lessonTitle, lessonNumber, lessonTags, DEFAULT_AUTHOR, lessonOutlineYaml)
    const lessonFile = path.join(WORKSPACE, 'content', 'lessons', lessonSlug, 'index.md')
    writeFile(lessonFile, lessonFm + '\n' + lessonBody.trim() + '\n')
    console.log(`  → content/lessons/${lessonSlug}/index.md`)
    lessonCount++
  }
  console.log(`  ${lessonCount} lesson files generated`)

  // ─── Step 6: Generate book index.md ────────────────────────────
  console.log('Step 6: Generating book with outline…')
  const bookDir = path.join(WORKSPACE, 'content', 'books', BOOK_SLUG)
  // Pass lessonMap so lesson-level outline entries reference lesson content types
  const bookContent = generateBookIndexMd(sidebar, linkMap, repoDir, lessonMap)
  writeFile(path.join(bookDir, 'index.md'), bookContent)
  console.log(`  → content/books/${BOOK_SLUG}/index.md`)

  // ─── Report ────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════')
  console.log(' Import complete!')
  console.log('══════════════════════════════════════════════')
  console.log(`  Articles:  ${stats.articles}`)
  console.log(`  Exercises: ${stats.exercises}`)
  console.log(`  Projects:  ${stats.projects}`)
  console.log(`  Lessons:   ${lessonCount}`)
  console.log(`  Assets:    ${assetCount}`)
  console.log(`  Book:      content/books/${BOOK_SLUG}/index.md`)
  if (stats.errors.length > 0) {
    console.log('\n  ⚠  Errors:')
    for (const err of stats.errors) console.log(`    - ${err}`)
  }
  console.log('')
}

main().catch(err => {
  console.error('\n✗ Import failed:', err)
  process.exit(1)
})
