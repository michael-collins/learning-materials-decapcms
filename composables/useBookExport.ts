/**
 * useBookExport — Client-side book export in multiple formats.
 *
 * Formats:
 *  - **HTML ZIP** — standalone website with sidebar, theme, prev/next navigation
 *  - **PDF**      — print-optimized combined HTML opened via window.print()
 *  - **Word**     — .docx document using the `docx` library
 *  - **Common Cartridge** — IMS CC 1.3 package for LMS import
 *
 * All formats fetch chapter content via queryCollection, convert the Nuxt
 * Content AST to HTML (or docx paragraphs), and package for download.
 */
import JSZip from 'jszip'
import { Document, Paragraph, TextRun, HeadingLevel, Packer, Table, TableRow, TableCell, WidthType } from 'docx'
import { toHast } from 'minimark/hast'
import {
  flattenOutline,
  getNavigableChapters,
  parseContentRef,
  type FlatChapter,
} from '~/composables/useBookOutline'
import type { OutlineNode } from '~/composables/useOutlineBuilder'

/* ------------------------------------------------------------------ */
/*  Theme CSS for standalone pages                                     */
/* ------------------------------------------------------------------ */

/** Default site tokens (light) — mirrors tailwind.css @theme block */
const BASE_LIGHT_VARS: Record<string, string> = {
  '--color-background':           'oklch(1.0000 0 0)',
  '--color-foreground':           'oklch(0.1884 0.0128 248.5103)',
  '--color-card':                 'oklch(0.9784 0.0011 197.1387)',
  '--color-card-foreground':      'oklch(0.1884 0.0128 248.5103)',
  '--color-primary':              'oklch(0.6723 0.1606 244.9955)',
  '--color-primary-foreground':   'oklch(1.0000 0 0)',
  '--color-muted':                'oklch(0.9222 0.0013 286.3737)',
  '--color-muted-foreground':     'oklch(0.1884 0.0128 248.5103)',
  '--color-border':               'oklch(0.9317 0.0118 231.6594)',
}

const BASE_DARK_VARS: Record<string, string> = {
  '--color-background':           'oklch(0 0 0)',
  '--color-foreground':           'oklch(0.9328 0.0025 228.7857)',
  '--color-card':                 'oklch(0.2097 0.0080 274.5332)',
  '--color-card-foreground':      'oklch(0.8853 0 0)',
  '--color-primary':              'oklch(0.6692 0.1607 245.0110)',
  '--color-primary-foreground':   'oklch(1.0000 0 0)',
  '--color-muted':                'oklch(0.2090 0 0)',
  '--color-muted-foreground':     'oklch(0.5637 0.0078 247.9662)',
  '--color-border':               'oklch(0.2674 0.0047 248.0045)',
}

/** Book-theme overrides — kept in sync with useBookTheme.ts */
const THEME_OVERRIDES: Record<string, { light: Record<string, string>; dark: Record<string, string> }> = {
  lambda: {
    light: {
      '--color-background':     'oklch(0.985 0.007 290)',
      '--color-foreground':     'oklch(0.18 0.02 290)',
      '--color-primary':        'oklch(0.53 0.26 293)',
      '--color-border':         'oklch(0.91 0.015 290)',
    },
    dark: {
      '--color-background':     'oklch(0.13 0.005 290)',
      '--color-foreground':     'oklch(0.93 0.005 290)',
      '--color-primary':        'oklch(0.58 0.24 293)',
      '--color-border':         'oklch(0.28 0.015 290)',
    },
  },
  minimal: {
    light: {
      '--color-background':     'oklch(0.985 0.006 85)',
      '--color-foreground':     'oklch(0.22 0.02 55)',
      '--color-primary':        'oklch(0.60 0.17 50)',
      '--color-border':         'oklch(0.91 0.01 85)',
    },
    dark: {
      '--color-background':     'oklch(0.15 0.006 55)',
      '--color-foreground':     'oklch(0.90 0.01 85)',
      '--color-primary':        'oklch(0.68 0.15 55)',
      '--color-border':         'oklch(0.28 0.01 55)',
    },
  },
}

function buildCssVars(theme: string, mode: 'light' | 'dark'): string {
  const base = mode === 'dark' ? BASE_DARK_VARS : BASE_LIGHT_VARS
  const overrides = THEME_OVERRIDES[theme]?.[mode] ?? {}
  const merged = { ...base, ...overrides }
  return Object.entries(merged).map(([k, v]) => `  ${k}: ${v};`).join('\n')
}

/* ------------------------------------------------------------------ */
/*  Body decompression (Nuxt Content v3 minimark format)               */
/* ------------------------------------------------------------------ */

/**
 * Nuxt Content v3 stores markdown body in a compressed "minimark" format.
 * ContentRenderer decompresses it internally, but for our custom export
 * renderer we need to convert it to HAST (HTML AST) first.
 */
function getBodyChildren(body: any): ASTNode[] | undefined {
  if (!body) return undefined
  // minimark / minimal compressed format
  if (body.type === 'minimark' || body.type === 'minimal') {
    const hast = toHast({ type: 'minimark', value: body.value })
    return hast?.children as ASTNode[] | undefined
  }
  // Standard HAST root format
  if (body.type === 'root' && body.children) {
    return body.children as ASTNode[]
  }
  // Direct children array
  if (body.children) {
    return body.children as ASTNode[]
  }
  return undefined
}

/* ------------------------------------------------------------------ */
/*  AST → HTML renderer                                                */
/* ------------------------------------------------------------------ */

interface ASTNode {
  type: string
  tag?: string
  value?: string
  props?: Record<string, any>
  children?: ASTNode[]
}

/* ------------------------------------------------------------------ */
/*  Rubric data for exports (mirrors useRubrics.ts)                    */
/* ------------------------------------------------------------------ */

interface ExportRubricCriterion { name: string; description: string }
interface ExportRubric { name: string; description: string; assessmentType: string; criteria: ExportRubricCriterion[] }

const EXPORT_RUBRICS: Record<string, ExportRubric> = {
  exercise: {
    name: 'Exercise',
    assessmentType: 'formative',
    description: 'An exercise assessment type is formative and tends to focus on evaluating mastery of a narrow set of competencies and capabilities, defined in the learning objectives.',
    criteria: [
      { name: 'Steps completed', description: 'This criteria assesses whether you completed all parts of a given set of instructions.' },
      { name: 'Attention to detail', description: 'This criteria measures ability to use proper naming conventions and formats, meet submission deadlines, check to see that others are able to access submitted materials, and fulfills other specified requirements.' },
      { name: 'On time', description: 'This criterion checks to see if the assigned task was submitted on time. This indirectly assesses time management.' },
    ],
  },
  project: {
    name: 'Project',
    assessmentType: 'summative',
    description: 'A project assessment type is summative and tends to focus on evaluating mastery of a large scope of competencies and capabilities, defined in the learning objectives.',
    criteria: [
      { name: 'Concept development', description: 'This criterion attempts to measure your ability to respond to project themes and learning objectives through creative thinking processes, account for technical and causal relationships through systems thinking, and show awareness of cultural contexts and philosophical or ideological mappings through critical thinking.' },
      { name: 'Technical mastery', description: 'This grading criterion measures your ability to quickly gain and apply necessary technical understanding. Working with new digital formats, following technical instructions, using digital and analog tools, and applying formal elements and principles of design can all be considered aspects of technical mastery.' },
      { name: 'Steps completed', description: 'This criteria assesses whether you completed all parts of a given set of instructions.' },
    ],
  },
  task: {
    name: 'Task',
    assessmentType: 'formative',
    description: 'This formative assessment measures completeness of a given task. It is typically in the context of a larger assessment goal.',
    criteria: [
      { name: 'On time', description: 'This criterion checks to see if the assigned task was submitted on time. This indirectly assesses time management.' },
      { name: 'Steps completed', description: 'This criteria assesses whether you completed all parts of a given set of instructions.' },
    ],
  },
  'written-statement': {
    name: 'Written Statement',
    assessmentType: 'summative',
    description: 'This assessment measures your ability to communicate your ideas and scope of work fully and professionally.',
    criteria: [
      { name: 'Articulation', description: 'This measures the ability to synthesize and articulate ideas through a written statement, and to meet the minimum statement requirements.' },
      { name: 'Writing quality', description: 'Language should be clear, understandable, free of hyperbole and generalizations, show specific examples, and reference or cite sources where necessary.' },
      { name: 'Spelling and grammar', description: 'Generally free of spelling mistakes, grammar issues, and missing or incomplete sentences.' },
      { name: 'On time', description: 'This criterion checks to see if the assigned task was submitted on time. This indirectly assesses time management.' },
    ],
  },
}

/**
 * The site origin is captured once at export time so that relative paths
 * like `/uploads/foo.jpg` can be resolved to absolute URLs in the
 * exported HTML.  Uses the Nuxt runtime config `siteUrl` (set correctly
 * on Netlify via SITE_URL env var), falling back to window.location.origin.
 */
let _siteOrigin = ''
function getSiteOrigin(): string {
  if (!_siteOrigin && typeof window !== 'undefined') {
    try {
      const cfg = useRuntimeConfig()
      const configured = cfg?.public?.siteUrl as string | undefined
      if (configured && configured !== 'http://localhost:3000') {
        _siteOrigin = configured.replace(/\/+$/, '')
      }
    } catch {
      // useRuntimeConfig may not be available outside a Nuxt context
    }
    if (!_siteOrigin) {
      _siteOrigin = window.location.origin
    }
  }
  return _siteOrigin
}

/** Resolve a path like `/uploads/foo.jpg` to an absolute URL */
function resolveAssetUrl(src: string): string {
  if (!src) return src
  // Already absolute
  if (/^https?:\/\//.test(src)) return src
  // Relative to site root
  const origin = getSiteOrigin()
  if (origin && src.startsWith('/')) return `${origin}${src}`
  return src
}

/**
 * When _bundleMode is true, `/uploads/foo.jpg` is converted to a relative
 * path (`uploads/foo.jpg`) and the path is recorded in _collectedUploads
 * so the caller can fetch and bundle the actual file.
 */
let _bundleMode = false
const _collectedUploads = new Set<string>()

function resolveAssetUrlForBundle(src: string): string {
  if (!src) return src
  if (/^https?:\/\//.test(src)) return src
  if (src.startsWith('/uploads/')) {
    _collectedUploads.add(src)
    // Return a relative path (strip leading slash)
    return _bundleMode ? src.slice(1) : resolveAssetUrl(src)
  }
  if (src.startsWith('/')) {
    return _bundleMode ? src.slice(1) : resolveAssetUrl(src)
  }
  return src
}

function astToHtml(nodes: ASTNode[] | undefined): string {
  if (!nodes?.length) return ''
  return nodes.map(renderNode).join('')
}

function renderNode(node: ASTNode): string {
  if (node.type === 'text') return escapeHtml(node.value || '')

  const tag = node.tag || 'div'
  const p = node.props || {}

  // ── Custom MDC component rendering ────────────────────────────────

  // YouTube video embed
  if (tag === 'youtube-video-component') {
    const id = p.id || ''
    if (!id) return ''
    const title = p.title || 'YouTube Video'
    const caption = p.caption || ''
    return `<div class="embed-wrap">
  <div class="embed-responsive"><iframe src="https://www.youtube.com/embed/${escapeAttr(id)}" title="${escapeAttr(title)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
  ${caption ? `<p class="embed-caption">${escapeHtml(caption)}</p>` : ''}
</div>`
  }

  // Video component (supports YouTube, Vimeo, Dailymotion, etc.)
  if (tag === 'video-component') {
    const src = p.src || ''
    if (!src) return ''
    const title = p.title || 'Video'
    const caption = p.caption || ''
    const credit = p.credit || ''
    let embedUrl = src

    // YouTube URL conversion
    const ytMatch = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/)
    if (ytMatch) {
      embedUrl = `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`
    } else if (/^[a-zA-Z0-9_-]{11}$/.test(src)) {
      embedUrl = `https://www.youtube-nocookie.com/embed/${src}`
    }
    // Vimeo URL conversion
    const vimeoMatch = src.match(/vimeo\.com\/(\d+)/)
    if (vimeoMatch) {
      embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`
    }

    return `<div class="embed-wrap">
  <div class="embed-responsive"><iframe src="${escapeAttr(embedUrl)}" title="${escapeAttr(title)}" frameborder="0" allowfullscreen></iframe></div>
  ${caption || credit ? `<p class="embed-caption">${escapeHtml(caption)}${credit ? ` <span class="credit">— ${escapeHtml(credit)}</span>` : ''}</p>` : ''}
</div>`
  }

  // Iframe component
  if (tag === 'iframe-component') {
    const src = p.src || ''
    if (!src) return ''
    const title = p.title || 'Embedded content'
    const caption = p.caption || ''
    const credit = p.credit || ''
    let embedUrl = src

    // Auto-convert YouTube/Vimeo watch URLs to embed
    const ytMatch = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
    if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`
    const vimeoMatch = src.match(/vimeo\.com\/(\d+)/)
    if (vimeoMatch) embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`

    return `<div class="embed-wrap">
  <div class="embed-responsive"><iframe src="${escapeAttr(embedUrl)}" title="${escapeAttr(title)}" frameborder="0" allowfullscreen></iframe></div>
  ${caption || credit ? `<p class="embed-caption">${escapeHtml(caption)}${credit ? ` <span class="credit">— ${escapeHtml(credit)}</span>` : ''}</p>` : ''}
</div>`
  }

  // Google Slides embed
  if (tag === 'google-slides-component') {
    const id = p.id || ''
    if (!id) return ''
    const title = p.title || 'Presentation'
    const caption = p.caption || ''
    const credit = p.credit || ''
    // Support both full URL and just the ID
    const embedUrl = id.startsWith('http')
      ? id.replace(/\/pub\b/, '/embed')
      : `https://docs.google.com/presentation/d/e/${id}/embed?start=false&loop=false&delayms=3000`
    return `<div class="embed-wrap">
  <div class="embed-responsive embed-slides"><iframe src="${escapeAttr(embedUrl)}" title="${escapeAttr(title)}" frameborder="0" allowfullscreen></iframe></div>
  ${caption || credit ? `<p class="embed-caption">${escapeHtml(caption)}${credit ? ` <span class="credit">— ${escapeHtml(credit)}</span>` : ''}</p>` : ''}
</div>`
  }

  // Sketchfab 3D model embed
  if (tag === 'sketchfab-component') {
    const src = p.src || ''
    if (!src) return ''
    const title = p.title || 'Sketchfab Model'
    const caption = p.caption || ''
    // Convert URL to embed format
    const embedUrl = src.includes('/embed') ? src : src.replace(/\/3d-models\//, '/models/') + '/embed'
    return `<div class="embed-wrap">
  <div class="embed-responsive"><iframe src="${escapeAttr(embedUrl)}" title="${escapeAttr(title)}" frameborder="0" allowfullscreen allow="autoplay; fullscreen; xr-spatial-tracking"></iframe></div>
  ${caption ? `<p class="embed-caption">${escapeHtml(caption)}</p>` : ''}
</div>`
  }

  // 3D Viewer (model-viewer) — link to the file since model-viewer needs JS
  if (tag === 'threed-viewer-component') {
    const src = resolveAssetUrlForBundle(p.src || '')
    const title = p.title || '3D Model'
    const caption = p.caption || ''
    return `<div class="embed-wrap">
  <div class="threed-placeholder">
    <p>🧊 <strong>${escapeHtml(title)}</strong></p>
    <p><a href="${escapeAttr(src)}" target="_blank" rel="noopener noreferrer">View / Download 3D Model</a></p>
  </div>
  ${caption ? `<p class="embed-caption">${escapeHtml(caption)}</p>` : ''}
</div>`
  }

  // Code embed component (CodePen, JSFiddle, etc.)
  if (tag === 'code-embed-component') {
    const provider = p.provider || ''
    const src = p.src || ''
    const title = p.title || 'Code Example'
    const height = p.height || '400'
    const caption = p.caption || ''
    // Build embed URL based on provider
    let embedUrl = src
    if (provider === 'codepen' && !src.includes('/embed')) {
      embedUrl = src.replace(/\/pen\//, '/embed/')
    }
    return `<div class="embed-wrap">
  <iframe src="${escapeAttr(embedUrl)}" title="${escapeAttr(title)}" style="width:100%;height:${escapeAttr(height)}px;border:1px solid var(--color-border, #e2e8f0);border-radius:0.5rem" loading="lazy" sandbox="allow-scripts allow-same-origin"></iframe>
  ${caption ? `<p class="embed-caption">${escapeHtml(caption)}</p>` : ''}
</div>`
  }

  // Image component
  if (tag === 'image-component') {
    const src = resolveAssetUrlForBundle(p.src || '')
    const alt = p.alt || ''
    const caption = p.caption || ''
    const credit = p.credit || ''
    return `<figure class="image-figure">
  <img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" loading="lazy" />
  ${caption || credit ? `<figcaption>${escapeHtml(caption)}${credit ? ` <span class="credit">— ${escapeHtml(credit)}</span>` : ''}</figcaption>` : ''}
</figure>`
  }

  // Callout / admonition
  if (tag === 'callout') {
    const type = p.type || 'info'
    const title = p.title || ''
    const inner = astToHtml(node.children)
    const icons: Record<string, string> = { info: 'ℹ️', tip: '💡', warning: '⚠️', danger: '🚫', definition: '📖', objective: '🎯' }
    const icon = icons[type] || 'ℹ️'
    return `<div class="callout callout-${escapeAttr(type)}">
  ${title ? `<p class="callout-title">${icon} <strong>${escapeHtml(title)}</strong></p>` : ''}
  ${inner}
</div>`
  }

  // Rubric component — render the full rubric table
  if (tag === 'rubric-component') {
    const rubricId = p.id || ''
    const rubric = EXPORT_RUBRICS[rubricId]
    if (!rubric) {
      return `<div class="callout callout-info"><p class="callout-title">📋 <strong>Rubric</strong></p><p>Rubric "${escapeHtml(rubricId)}" not found.</p></div>`
    }
    const rows = rubric.criteria
      .map(
        (c) =>
          `        <tr><td class="rubric-criterion">${escapeHtml(c.name)}</td><td>${escapeHtml(c.description)}</td></tr>`
      )
      .join('\n')
    return `<div class="rubric-table-wrap">
  <h3 class="rubric-heading">${escapeHtml(rubric.name)} Rubric</h3>
  ${rubric.description ? `<p class="rubric-description">${escapeHtml(rubric.description)}</p>` : ''}
  <table class="rubric-table">
    <thead>
      <tr><th>Criterion</th><th>Description</th></tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
</div>`
  }

  // ── Standard HTML elements ────────────────────────────────────────

  // Resolve src attributes for standard img tags
  if (tag === 'img') {
    const resolved = { ...p }
    if (resolved.src) resolved.src = resolveAssetUrlForBundle(resolved.src)
    const attrs = propsToAttrs(resolved)
    return `<img${attrs} />`
  }

  const attrs = propsToAttrs(p)
  const inner = astToHtml(node.children)

  // Self-closing tags
  const voidTags = new Set(['br', 'hr', 'input', 'meta', 'link', 'source'])
  if (voidTags.has(tag)) {
    return `<${tag}${attrs} />`
  }

  return `<${tag}${attrs}>${inner}</${tag}>`
}

function propsToAttrs(props?: Record<string, any>): string {
  if (!props) return ''
  return Object.entries(props)
    .filter(([k]) => k !== '__ignoreMap')
    .map(([k, v]) => {
      if (v === true) return ` ${k}`
      if (v === false || v == null) return ''
      if (k === 'style' && typeof v === 'object') {
        const css = Object.entries(v).map(([p, val]) => `${p}:${val}`).join(';')
        return ` style="${escapeAttr(css)}"`
      }
      if (k === 'class' && Array.isArray(v)) return ` class="${escapeAttr(v.join(' '))}"`
      return ` ${k}="${escapeAttr(String(v))}"`
    })
    .join('')
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/* ------------------------------------------------------------------ */
/*  Frontmatter → HTML helpers                                         */
/* ------------------------------------------------------------------ */

function formatDate(d: string): string {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return d
  }
}

function getLicenseUrl(license: string): string {
  if (!license) return ''
  const l = license.toLowerCase().trim()
  if (l.startsWith('cc')) {
    const parts = l.replace(/^cc\s*/i, '').trim().split(/\s+/)
    const code = parts[0]?.toLowerCase()
    const version = parts[1] || '4.0'
    if (code) return `https://creativecommons.org/licenses/${code}/${version}/`
  }
  return ''
}

/**
 * Build the frontmatter metadata HTML for a chapter page.
 * Mirrors what pages/books/[book]/[...path].vue renders.
 */
function buildChapterMetaHtml(item: any, bookLicense?: string, bookAuthor?: string): string {
  const parts: string[] = []

  // Header image
  const image = resolveAssetUrlForBundle(item?.image || '')
  const imageAlt = item?.imageAlt || ''
  if (image) {
    parts.push(`<img src="${escapeAttr(image)}" alt="${escapeAttr(imageAlt)}" class="header-image" />`)
  }

  // Metadata row: date, difficulty, tags
  const metaItems: string[] = []

  const date = item?.date || ''
  if (date) {
    metaItems.push(`<span class="meta-date">${escapeHtml(formatDate(date))}</span>`)
  }

  const difficulty = item?.difficulty || ''
  if (difficulty) {
    metaItems.push(`<span class="badge badge-difficulty">${escapeHtml(difficulty)}</span>`)
  }

  const tags: string[] = Array.isArray(item?.tags) ? item.tags : []
  if (tags.length) {
    metaItems.push(
      `<span class="tags">${tags.map((t: string) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</span>`
    )
  }

  if (metaItems.length) {
    parts.push(`<div class="meta-row">${metaItems.join('')}</div>`)
  }

  // Attachments
  const rawAttachments = item?.attachments
  const attachments: Array<{ title?: string; url?: string; file?: string }> = Array.isArray(rawAttachments)
    ? rawAttachments
    : typeof rawAttachments === 'string'
      ? (() => { try { return JSON.parse(rawAttachments) } catch { return [] } })()
      : []

  if (attachments.length) {
    const links = attachments.map((a) => {
      const rawHref = a.url || a.file || '#'
      const href = resolveAssetUrlForBundle(rawHref)
      const title = a.title || a.url || a.file || 'Attachment'
      const isExternal = !!a.url
      return `<a href="${escapeAttr(href)}" class="attachment-link"${isExternal ? ' target="_blank" rel="noopener noreferrer"' : ' download'}>${escapeHtml(title)}${isExternal ? ' ↗' : ' ↓'}</a>`
    }).join('\n          ')
    parts.push(`<div class="attachments">${links}</div>`)
  }

  // Description
  const description = item?.description || ''
  if (description) {
    parts.push(`<p class="chapter-description">${escapeHtml(description)}</p>`)
  }

  return parts.join('\n')
}

/**
 * Build the license footer HTML for a chapter page.
 */
function buildLicenseFooterHtml(item: any, bookLicense?: string, bookAuthor?: string): string {
  const license = item?.license || ''
  const author = item?.author || ''
  const authorUrl = item?.authorUrl || ''
  const aiLicense = item?.aiLicense || null

  const parts: string[] = []

  // AI license section
  if (aiLicense) {
    const level = typeof aiLicense === 'string' ? aiLicense : (aiLicense as any)?.level || ''
    if (level) {
      parts.push(`<div class="ai-license"><strong>AI Usage:</strong> ${escapeHtml(level)}</div>`)
    }
  }

  // Content license
  if (license || author || bookLicense) {
    let licenseHtml = 'This content is licensed under '
    const displayLicense = license || bookLicense || ''
    const dispAuthor = author || bookAuthor || ''
    const url = getLicenseUrl(displayLicense)

    if (displayLicense) {
      licenseHtml += url
        ? `<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(displayLicense)}</a>`
        : `<strong>${escapeHtml(displayLicense)}</strong>`
    }

    if (dispAuthor) {
      licenseHtml += ' by '
      licenseHtml += authorUrl
        ? `<a href="${escapeAttr(authorUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(dispAuthor)}</a>`
        : `<strong>${escapeHtml(dispAuthor)}</strong>`
    }

    licenseHtml += '.'
    parts.push(`<p>${licenseHtml}</p>`)
  }

  if (!parts.length) return ''
  return `<div class="license-footer">${parts.join('\n')}</div>`
}

/**
 * Build the book index page header HTML (cover image, author, license, learning objectives).
 */
function buildBookIndexHtml(book: any): string {
  const parts: string[] = []

  // Cover image
  if (book.coverImage) {
    const coverSrc = resolveAssetUrlForBundle(book.coverImage)
    parts.push(`<div class="cover-image-wrap"><img src="${escapeAttr(coverSrc)}" alt="${escapeAttr(book.coverImageAlt || book.title)}" class="cover-image" /></div>`)
  }

  // Author, license, chapter count row
  const metaItems: string[] = []
  if (book.author) {
    metaItems.push(`<span class="meta-author">By ${escapeHtml(book.author)}</span>`)
  }
  if (book.license) {
    metaItems.push(`<span class="badge badge-license">${escapeHtml(book.license)}</span>`)
  }
  if (metaItems.length) {
    parts.push(`<div class="meta-row">${metaItems.join('')}</div>`)
  }

  // Learning objectives
  const objectives: string[] = Array.isArray(book.learningObjectives) ? book.learningObjectives : []
  if (objectives.length) {
    const lis = objectives.map((o: string) => `  <li>${escapeHtml(o)}</li>`).join('\n')
    parts.push(`<div class="learning-objectives"><h2>Learning Objectives</h2>\n<ul>\n${lis}\n</ul></div>`)
  }

  return parts.join('\n')
}

/* ------------------------------------------------------------------ */
/*  HTML page template                                                 */
/* ------------------------------------------------------------------ */

function htmlPage(opts: {
  title: string
  bookTitle: string
  theme: string
  serif?: boolean
  bodyHtml: string
  sidebarHtml: string
  prevLink?: string
  nextLink?: string
  prevTitle?: string
  nextTitle?: string
}) {
  const lightVars = buildCssVars(opts.theme, 'light')
  const darkVars = buildCssVars(opts.theme, 'dark')
  const fontFamily = opts.serif
    ? `font-family: Georgia, 'Times New Roman', serif;`
    : `font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;`

  const prevHtml = opts.prevLink
    ? `<a href="${opts.prevLink}" class="nav-link prev">&larr; ${escapeHtml(opts.prevTitle || 'Previous')}</a>`
    : '<span></span>'
  const nextHtml = opts.nextLink
    ? `<a href="${opts.nextLink}" class="nav-link next">${escapeHtml(opts.nextTitle || 'Next')} &rarr;</a>`
    : '<span></span>'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(opts.title)} — ${escapeHtml(opts.bookTitle)}</title>
  <style>
    :root {
${lightVars}
    }
    @media (prefers-color-scheme: dark) {
      :root {
${darkVars}
      }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      ${fontFamily}
      background: var(--color-background);
      color: var(--color-foreground);
      line-height: 1.7;
      -webkit-font-smoothing: antialiased;
    }
    .layout { display: flex; min-height: 100vh; }
    .sidebar {
      width: 260px;
      flex-shrink: 0;
      border-right: 1px solid var(--color-border);
      background: var(--color-card, var(--color-background));
      padding: 1.5rem 0;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
    }
    .sidebar h2 {
      font-size: 0.9rem;
      font-weight: 600;
      padding: 0 1.25rem;
      margin-bottom: 1rem;
      color: var(--color-foreground);
    }
    .sidebar a {
      display: block;
      padding: 0.35rem 1.25rem;
      font-size: 0.85rem;
      color: var(--color-muted-foreground, var(--color-foreground));
      text-decoration: none;
      border-left: 2px solid transparent;
      transition: color 0.15s, border-color 0.15s, background 0.15s;
    }
    .sidebar a:hover,
    .sidebar a.active {
      color: var(--color-primary);
      background: color-mix(in oklch, var(--color-primary) 6%, transparent);
      border-left-color: var(--color-primary);
    }
    .sidebar .section-heading {
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.75rem 1.25rem 0.25rem;
      color: var(--color-muted-foreground, var(--color-foreground));
      border-left: none;
    }
    .sidebar .section-heading:hover { background: none; border-left: none; }
    .sidebar .depth-1 { padding-left: 2rem; }
    .sidebar .depth-2 { padding-left: 2.75rem; }
    .sidebar .depth-3 { padding-left: 3.5rem; }
    .content-area { flex: 1; min-width: 0; }
    .content {
      max-width: 48rem;
      margin: 0 auto;
      padding: 2.5rem 2rem;
    }
    .content h1 { font-size: 2rem; font-weight: 700; margin-bottom: 1.5rem; line-height: 1.25; }
    .content h2 { font-size: 1.5rem; font-weight: 600; margin: 2rem 0 1rem; line-height: 1.3; }
    .content h3 { font-size: 1.25rem; font-weight: 600; margin: 1.5rem 0 0.75rem; line-height: 1.3; }
    .content p { margin: 0.75rem 0; }
    .content a { color: var(--color-primary); text-decoration: underline; text-underline-offset: 2px; }
    .content ul, .content ol { margin: 0.75rem 0; padding-left: 1.75rem; }
    .content li { margin: 0.25rem 0; }
    .content pre {
      background: color-mix(in oklch, var(--color-foreground) 5%, var(--color-background));
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1rem;
      overflow-x: auto;
      font-size: 0.875rem;
      line-height: 1.6;
      margin: 1rem 0;
    }
    .content code {
      font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
      font-size: 0.9em;
    }
    .content :not(pre) > code {
      background: color-mix(in oklch, var(--color-foreground) 6%, var(--color-background));
      padding: 0.15em 0.35em;
      border-radius: 0.25rem;
    }
    .content img { max-width: 100%; height: auto; border-radius: 0.5rem; margin: 1rem 0; }
    .content blockquote {
      border-left: 3px solid var(--color-primary);
      padding: 0.5rem 1rem;
      margin: 1rem 0;
      color: var(--color-muted-foreground, var(--color-foreground));
    }
    .content table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.9rem; }
    .content th, .content td { padding: 0.5rem 0.75rem; border: 1px solid var(--color-border); text-align: left; }
    .content th { font-weight: 600; background: color-mix(in oklch, var(--color-foreground) 3%, var(--color-background)); }
    .page-nav {
      display: flex;
      justify-content: space-between;
      border-top: 1px solid var(--color-border);
      padding: 1.5rem 0;
      margin-top: 3rem;
    }
    .nav-link {
      font-size: 0.9rem;
      color: var(--color-primary);
      text-decoration: none;
      padding: 0.5rem 1rem;
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      transition: background 0.15s;
    }
    .nav-link:hover {
      background: color-mix(in oklch, var(--color-primary) 8%, transparent);
    }

    /* Frontmatter elements */
    .header-image {
      width: 100%;
      max-height: 400px;
      object-fit: cover;
      border-radius: 0.5rem;
      margin-bottom: 1.5rem;
    }
    .cover-image-wrap {
      border-radius: 0.5rem;
      overflow: hidden;
      border: 1px solid var(--color-border);
      aspect-ratio: 21/9;
      margin-bottom: 1.5rem;
      background: color-mix(in oklch, var(--color-foreground) 3%, var(--color-background));
    }
    .cover-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .meta-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.85rem;
      color: var(--color-muted-foreground, var(--color-foreground));
      margin-bottom: 1rem;
    }
    .meta-author { font-weight: 500; }
    .meta-date {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.8rem;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 0.15rem 0.6rem;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge-difficulty {
      background: color-mix(in oklch, var(--color-primary) 12%, transparent);
      border: 1px solid color-mix(in oklch, var(--color-primary) 20%, transparent);
      color: var(--color-primary);
    }
    .badge-license {
      background: color-mix(in oklch, var(--color-foreground) 6%, var(--color-background));
      font-weight: 500;
    }
    .tags { display: inline-flex; flex-wrap: wrap; gap: 0.35rem; }
    .tag {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      background: color-mix(in oklch, var(--color-foreground) 6%, var(--color-background));
      border: 1px solid var(--color-border);
      padding: 0.1rem 0.5rem;
      font-size: 0.7rem;
      font-weight: 500;
    }
    .chapter-description {
      font-size: 1.1rem;
      color: var(--color-muted-foreground, var(--color-foreground));
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }
    .attachments {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }
    .attachment-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 0.85rem;
      border-radius: 0.5rem;
      border: 1px solid var(--color-border);
      background: var(--color-card, var(--color-background));
      font-size: 0.85rem;
      color: var(--color-foreground);
      text-decoration: none;
      transition: background 0.15s;
    }
    .attachment-link:hover {
      background: color-mix(in oklch, var(--color-foreground) 4%, var(--color-background));
    }
    .license-footer {
      margin-top: 2.5rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--color-border);
      font-size: 0.78rem;
      color: var(--color-muted-foreground, var(--color-foreground));
    }
    .license-footer a {
      color: var(--color-primary);
      font-weight: 500;
      text-decoration: none;
    }
    .license-footer a:hover { text-decoration: underline; }
    .ai-license {
      margin-bottom: 0.5rem;
      padding: 0.5rem 0.75rem;
      border-radius: 0.375rem;
      background: color-mix(in oklch, var(--color-foreground) 3%, var(--color-background));
      font-size: 0.8rem;
    }
    .learning-objectives {
      border-radius: 0.5rem;
      border: 1px solid var(--color-border);
      padding: 1.25rem;
      margin: 1.5rem 0;
    }
    .learning-objectives h2 {
      font-size: 1.1rem;
      font-weight: 600;
      margin: 0 0 0.75rem 0;
    }
    .learning-objectives ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .learning-objectives li {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      font-size: 0.9rem;
      color: var(--color-muted-foreground, var(--color-foreground));
      margin-bottom: 0.4rem;
    }
    .learning-objectives li::before {
      content: '';
      display: inline-block;
      width: 0.4rem;
      height: 0.4rem;
      border-radius: 50%;
      background: var(--color-primary);
      margin-top: 0.55rem;
      flex-shrink: 0;
    }
    .content hr {
      border: none;
      border-top: 1px solid var(--color-border);
      margin: 1.5rem 0;
    }

    /* Embed / iframe responsive wrappers */
    .embed-wrap { margin: 1.5rem 0; }
    .embed-responsive {
      position: relative;
      padding-bottom: 56.25%;
      height: 0;
      overflow: hidden;
      border-radius: 0.5rem;
    }
    .embed-responsive iframe {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      border: none;
    }
    .embed-slides { padding-bottom: 60%; }
    .embed-caption {
      margin-top: 0.5rem;
      font-size: 0.85rem;
      color: var(--color-muted-foreground, #64748b);
      text-align: center;
    }
    .embed-caption .credit { font-style: italic; }

    /* Image figures */
    .image-figure {
      margin: 1.5rem 0;
      text-align: center;
    }
    .image-figure img {
      max-width: 100%;
      height: auto;
      border-radius: 0.5rem;
    }
    .image-figure figcaption {
      margin-top: 0.5rem;
      font-size: 0.85rem;
      color: var(--color-muted-foreground, #64748b);
    }
    .image-figure figcaption .credit { font-style: italic; }

    /* Callouts / admonitions */
    .callout {
      margin: 1.5rem 0;
      padding: 1rem 1.25rem;
      border-left: 4px solid var(--color-primary, #3b82f6);
      border-radius: 0.5rem;
      background: var(--color-muted, #f1f5f9);
    }
    .callout-title {
      margin: 0 0 0.5rem;
      font-size: 0.95rem;
    }
    .callout p { margin: 0.25rem 0; }
    .callout-warning { border-left-color: #f59e0b; background: #fefce8; }
    .callout-danger  { border-left-color: #ef4444; background: #fef2f2; }
    .callout-tip     { border-left-color: #10b981; background: #ecfdf5; }
    .callout-definition { border-left-color: #8b5cf6; background: #f5f3ff; }
    .callout-objective  { border-left-color: #06b6d4; background: #ecfeff; }

    /* 3D model placeholder */
    .threed-placeholder {
      padding: 2rem;
      text-align: center;
      background: var(--color-muted, #f1f5f9);
      border-radius: 0.75rem;
      border: 2px dashed var(--color-border, #e2e8f0);
    }
    .threed-placeholder a {
      color: var(--color-primary, #3b82f6);
      font-weight: 600;
    }

    /* Rubric tables */
    .rubric-table-wrap {
      margin: 1.5rem 0;
      padding: 1.25rem;
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: 0.5rem;
    }
    .rubric-heading {
      text-transform: uppercase;
      font-size: 1.1rem;
      font-weight: 600;
      margin: 0 0 0.25rem;
    }
    .rubric-description {
      font-size: 0.9rem;
      color: var(--color-muted-foreground, #64748b);
      margin: 0.25rem 0 1rem;
    }
    .rubric-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    .rubric-table th,
    .rubric-table td {
      padding: 0.6rem 0.75rem;
      border: 1px solid var(--color-border, #e2e8f0);
      text-align: left;
    }
    .rubric-table th {
      font-weight: 600;
      background: var(--color-muted, #f8fafc);
    }
    .rubric-criterion {
      font-weight: 500;
      white-space: nowrap;
    }

    @media (max-width: 768px) {
      .sidebar { display: none; }
      .content { padding: 1.5rem 1rem; }
    }
  </style>
</head>
<body>
  <div class="layout">
    <nav class="sidebar">
      <h2>${escapeHtml(opts.bookTitle)}</h2>
${opts.sidebarHtml}
    </nav>
    <div class="content-area">
      <div class="content">
        <h1>${escapeHtml(opts.title)}</h1>
${opts.bodyHtml}
        <div class="page-nav">
          ${prevHtml}
          ${nextHtml}
        </div>
      </div>
    </div>
  </div>
</body>
</html>`
}

/* ------------------------------------------------------------------ */
/*  Sidebar HTML builder                                               */
/* ------------------------------------------------------------------ */

function buildSidebarHtml(
  flat: FlatChapter[],
  activePath?: string
): string {
  return flat
    .map((ch) => {
      if (ch.isSection && !ch.content) {
        return `      <div class="section-heading depth-${ch.depth}">${escapeHtml(ch.title)}</div>`
      }
      const href = ch.content ? `${slugifyPath(ch.fullPath)}.html` : '#'
      const cls = [
        ch.depth > 0 ? `depth-${ch.depth}` : '',
        ch.fullPath === activePath ? 'active' : '',
      ].filter(Boolean).join(' ')
      return `      <a href="${href}"${cls ? ` class="${cls}"` : ''}>${escapeHtml(ch.title)}</a>`
    })
    .join('\n')
}

function slugifyPath(p: string): string {
  return p.replace(/\//g, '-')
}

/* ------------------------------------------------------------------ */
/*  Composable                                                         */
/* ------------------------------------------------------------------ */

export function useBookExport() {
  const exporting = ref(false)
  const progress = ref('')

  async function exportBook(bookSlug: string) {
    exporting.value = true
    progress.value = 'Loading book…'

    // Enable bundle mode so media paths are relative and tracked
    _bundleMode = true
    _collectedUploads.clear()

    try {
      // 1. Fetch the book metadata
      const book = await queryCollection('books').path(`/books/${bookSlug}`).first()
      if (!book) throw new Error(`Book "${bookSlug}" not found`)

      const theme = (book as any).theme || 'default'
      const isSerif = theme === 'minimal'
      const outline: OutlineNode[] = (book as any).outline || []

      // 2. Flatten outline
      const flat = flattenOutline(outline)
      const navigable = getNavigableChapters(flat)
      const sidebarHtml = buildSidebarHtml(flat)

      const zip = new JSZip()

      // 3. Generate index.html (book landing)
      const bookHeaderHtml = buildBookIndexHtml(book)
      const bookBodyHtml = book.body ? astToHtml(getBodyChildren(book.body)) : ''
      const descHtml = (book as any).description
        ? `<p class="chapter-description">${escapeHtml((book as any).description)}</p>`
        : ''
      const tocHtml = navigable.length
        ? `<h2>Table of Contents</h2>\n<ol>\n${navigable.map((ch) =>
            `  <li><a href="${slugifyPath(ch.fullPath)}.html">${escapeHtml(ch.title)}</a></li>`
          ).join('\n')}\n</ol>`
        : ''

      const indexBody = [bookHeaderHtml, descHtml, bookBodyHtml, tocHtml].filter(Boolean).join('\n')
      zip.file(
        'index.html',
        htmlPage({
          title: book.title,
          bookTitle: book.title,
          theme,
          serif: isSerif,
          bodyHtml: indexBody,
          sidebarHtml: buildSidebarHtml(flat, ''),
          nextLink: navigable[0] ? `${slugifyPath(navigable[0].fullPath)}.html` : undefined,
          nextTitle: navigable[0]?.title,
        })
      )

      // 4. Generate each chapter page
      const bookLicense = (book as any).license || ''
      const bookAuthor = (book as any).author || ''

      for (let i = 0; i < navigable.length; i++) {
        const ch = navigable[i]
        progress.value = `Exporting ${i + 1}/${navigable.length}: ${ch.title}`

        let contentBodyHtml = ''
        let metaHtml = ''
        let footerHtml = ''
        const ref = ch.content ? parseContentRef(ch.content) : null

        if (ref) {
          try {
            const item = await queryCollection(ref.collection as any)
              .path(`/${ref.collection}/${ref.slug}`)
              .first()
            if (item?.body) {
              contentBodyHtml = astToHtml(getBodyChildren(item.body))
            }
            metaHtml = buildChapterMetaHtml(item, bookLicense, bookAuthor)
            footerHtml = buildLicenseFooterHtml(item, bookLicense, bookAuthor)
          } catch {
            contentBodyHtml = `<p><em>Content not available for export.</em></p>`
          }
        }

        const bodyHtml = [metaHtml, contentBodyHtml, footerHtml].filter(Boolean).join('\n')

        const prev = i > 0 ? navigable[i - 1] : null
        const next = i < navigable.length - 1 ? navigable[i + 1] : null

        zip.file(
          `${slugifyPath(ch.fullPath)}.html`,
          htmlPage({
            title: ch.title,
            bookTitle: book.title,
            theme,
            serif: isSerif,
            bodyHtml,
            sidebarHtml: buildSidebarHtml(flat, ch.fullPath),
            prevLink: prev ? `${slugifyPath(prev.fullPath)}.html` : 'index.html',
            prevTitle: prev?.title || book.title,
            nextLink: next ? `${slugifyPath(next.fullPath)}.html` : undefined,
            nextTitle: next?.title,
          })
        )
      }

      // 5. Fetch and bundle media files referenced in the HTML
      const uploadPaths = [..._collectedUploads]
      _bundleMode = false
      _collectedUploads.clear()

      if (uploadPaths.length > 0) {
        progress.value = `Fetching ${uploadPaths.length} media files…`
        for (let i = 0; i < uploadPaths.length; i += 6) {
          const batch = uploadPaths.slice(i, i + 6)
          const results = await Promise.allSettled(
            batch.map(async (uploadPath) => {
              const resp = await fetch(uploadPath)
              if (!resp.ok) return null
              const arrayBuf = await resp.arrayBuffer()
              // Strip leading slash for ZIP path: /uploads/foo.jpg → uploads/foo.jpg
              return { path: uploadPath.replace(/^\//, ''), data: arrayBuf }
            })
          )
          for (const r of results) {
            if (r.status === 'fulfilled' && r.value) {
              zip.file(r.value.path, r.value.data)
            }
          }
          progress.value = `Fetching media… ${Math.min(i + 6, uploadPaths.length)}/${uploadPaths.length}`
        }
      }

      // 6. Generate zip and trigger download
      progress.value = 'Compressing…'
      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${bookSlug}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      progress.value = ''
    } catch (err: any) {
      console.error('Book export failed:', err)
      progress.value = `Error: ${err.message || 'Export failed'}`
      setTimeout(() => { progress.value = '' }, 4000)
    } finally {
      _bundleMode = false
      _collectedUploads.clear()
      exporting.value = false
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Shared: fetch book + resolve all chapter content                 */
  /* ---------------------------------------------------------------- */

  interface ResolvedChapter {
    chapter: FlatChapter
    bodyHtml: string
    bodyText: string
    description?: string
    /** Raw content item for frontmatter extraction */
    contentItem?: any
  }

  async function fetchBookData(bookSlug: string) {
    const book = await queryCollection('books').path(`/books/${bookSlug}`).first()
    if (!book) throw new Error(`Book "${bookSlug}" not found`)

    const outline: OutlineNode[] = (book as any).outline || []
    const flat = flattenOutline(outline)
    const navigable = getNavigableChapters(flat)

    return { book, outline, flat, navigable }
  }

  async function resolveChapters(
    navigable: FlatChapter[],
    onProgress?: (i: number, total: number, title: string) => void
  ): Promise<ResolvedChapter[]> {
    const resolved: ResolvedChapter[] = []

    for (let i = 0; i < navigable.length; i++) {
      const ch = navigable[i]
      onProgress?.(i, navigable.length, ch.title)

      let bodyHtml = ''
      let bodyText = ''
      let description: string | undefined
      let contentItem: any = null
      const ref = ch.content ? parseContentRef(ch.content) : null

      if (ref) {
        try {
          const item = await queryCollection(ref.collection as any)
            .path(`/${ref.collection}/${ref.slug}`)
            .first()
          contentItem = item
          if (item?.body) {
            const children = getBodyChildren(item.body)
            bodyHtml = astToHtml(children)
            bodyText = astToPlainText(children)
          }
          description = (item as any)?.description
        } catch {
          bodyHtml = '<p><em>Content not available for export.</em></p>'
          bodyText = 'Content not available for export.'
        }
      }

      resolved.push({ chapter: ch, bodyHtml, bodyText, description, contentItem })
    }

    return resolved
  }

  /* ---------------------------------------------------------------- */
  /*  PDF Export — print-optimized combined HTML via window.print()     */
  /* ---------------------------------------------------------------- */

  async function exportBookPdf(bookSlug: string) {
    exporting.value = true
    progress.value = 'Loading book…'

    try {
      const { book, flat, navigable } = await fetchBookData(bookSlug)
      const theme = (book as any).theme || 'default'
      const isSerif = theme === 'minimal'

      const chapters = await resolveChapters(navigable, (i, total, title) => {
        progress.value = `Loading ${i + 1}/${total}: ${title}`
      })

      progress.value = 'Generating PDF…'

      // Build Table of Contents
      const tocEntries = flat.map((ch) => {
        const indent = ch.depth * 24
        if (ch.isSection && !ch.content) {
          return `<div style="margin-left:${indent}px;font-weight:600;margin-top:0.6em;font-size:0.95rem">${escapeHtml(ch.title)}</div>`
        }
        return `<div style="margin-left:${indent}px;margin-top:0.25em"><a href="#ch-${slugifyPath(ch.fullPath)}" style="color:var(--color-primary);text-decoration:none">${escapeHtml(ch.title)}</a></div>`
      }).join('\n')

      // Build chapter HTML
      const bookLicense = (book as any).license || ''
      const bookAuthor = (book as any).author || ''

      const chaptersHtml = chapters.map(({ chapter, bodyHtml, contentItem }) => {
        const metaHtml = contentItem ? buildChapterMetaHtml(contentItem, bookLicense, bookAuthor) : ''
        const footerHtml = contentItem ? buildLicenseFooterHtml(contentItem, bookLicense, bookAuthor) : ''
        return `
        <div class="chapter" id="ch-${slugifyPath(chapter.fullPath)}">
          <h2 class="chapter-title">${escapeHtml(chapter.title)}</h2>
          ${metaHtml}
          ${bodyHtml}
          ${footerHtml}
        </div>
      `
      }).join('\n')

      const lightVars = buildCssVars(theme, 'light')
      const fontFamily = isSerif
        ? `font-family: Georgia, 'Times New Roman', serif;`
        : `font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;`

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(book.title)}</title>
  <style>
    :root { ${lightVars.split('\n').join(' ')} }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      ${fontFamily}
      color: #1a1a2e;
      background: #fff;
      line-height: 1.7;
      -webkit-font-smoothing: antialiased;
      padding: 2rem;
      max-width: 48rem;
      margin: 0 auto;
    }
    .book-header { margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 2px solid #e2e8f0; }
    .book-header h1 { font-size: 2.2rem; font-weight: 700; margin-bottom: 0.5rem; }
    .book-header .meta { font-size: 0.9rem; color: #64748b; }
    .book-header .description { font-size: 1.05rem; color: #475569; margin-top: 0.75rem; }
    .toc { margin: 2rem 0; padding: 1.5rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; }
    .toc h2 { font-size: 1.2rem; font-weight: 600; margin-bottom: 1rem; }
    .toc a { color: #2563eb; }
    .chapter { page-break-before: always; margin-top: 2rem; }
    .chapter:first-of-type { page-break-before: auto; }
    .chapter-title { font-size: 1.75rem; font-weight: 700; margin-bottom: 1.25rem; padding-bottom: 0.5rem; border-bottom: 1px solid #e2e8f0; }
    h3 { font-size: 1.35rem; font-weight: 600; margin: 1.5rem 0 0.75rem; }
    h4 { font-size: 1.15rem; font-weight: 600; margin: 1.25rem 0 0.5rem; }
    p { margin: 0.75rem 0; }
    a { color: #2563eb; text-decoration: underline; text-underline-offset: 2px; }
    ul, ol { margin: 0.75rem 0; padding-left: 1.75rem; }
    li { margin: 0.25rem 0; }
    pre {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 1rem;
      overflow-x: auto;
      font-size: 0.85rem;
      line-height: 1.5;
      margin: 1rem 0;
    }
    code { font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace; font-size: 0.9em; }
    :not(pre) > code { background: #f1f5f9; padding: 0.15em 0.35em; border-radius: 0.25rem; }
    img { max-width: 100%; height: auto; border-radius: 0.5rem; margin: 1rem 0; }
    blockquote { border-left: 3px solid #2563eb; padding: 0.5rem 1rem; margin: 1rem 0; color: #475569; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.9rem; }
    th, td { padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; text-align: left; }
    th { font-weight: 600; background: #f8fafc; }

    /* Frontmatter elements (PDF) */
    .header-image { width: 100%; max-height: 300px; object-fit: cover; border-radius: 0.5rem; margin-bottom: 1rem; }
    .meta-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.6rem; font-size: 0.8rem; color: #64748b; margin-bottom: 0.75rem; }
    .badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 0.1rem 0.5rem; font-size: 0.7rem; font-weight: 600; }
    .badge-difficulty { background: #eff6ff; border: 1px solid #bfdbfe; color: #2563eb; }
    .tags { display: inline-flex; flex-wrap: wrap; gap: 0.25rem; }
    .tag { display: inline-flex; border-radius: 999px; background: #f1f5f9; border: 1px solid #e2e8f0; padding: 0.06rem 0.4rem; font-size: 0.65rem; font-weight: 500; }
    .chapter-description { font-size: 1rem; color: #475569; line-height: 1.5; margin-bottom: 1rem; }
    .attachments { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 1rem; }
    .attachment-link { display: block; padding: 0.4rem 0.6rem; border-radius: 0.375rem; border: 1px solid #e2e8f0; font-size: 0.8rem; color: #1e293b; text-decoration: none; }
    .license-footer { margin-top: 1.5rem; padding-top: 0.75rem; border-top: 1px solid #e2e8f0; font-size: 0.75rem; color: #64748b; }
    .license-footer a { color: #2563eb; font-weight: 500; }
    .ai-license { margin-bottom: 0.4rem; padding: 0.35rem 0.5rem; border-radius: 0.25rem; background: #f8fafc; font-size: 0.75rem; }

    /* Embeds */
    .embed-wrap { margin: 1.5rem 0; }
    .embed-responsive { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 0.5rem; }
    .embed-responsive iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }
    .embed-slides { padding-bottom: 60%; }
    .embed-caption { margin-top: 0.5rem; font-size: 0.85rem; color: #64748b; text-align: center; }
    .embed-caption .credit { font-style: italic; }
    .image-figure { margin: 1.5rem 0; text-align: center; }
    .image-figure img { max-width: 100%; height: auto; border-radius: 0.5rem; }
    .image-figure figcaption { margin-top: 0.5rem; font-size: 0.85rem; color: #64748b; }
    .image-figure figcaption .credit { font-style: italic; }
    .callout { margin: 1.5rem 0; padding: 1rem 1.25rem; border-left: 4px solid #3b82f6; border-radius: 0.5rem; background: #f1f5f9; }
    .callout-title { margin: 0 0 0.5rem; font-size: 0.95rem; }
    .callout p { margin: 0.25rem 0; }
    .callout-warning { border-left-color: #f59e0b; background: #fefce8; }
    .callout-danger  { border-left-color: #ef4444; background: #fef2f2; }
    .callout-tip     { border-left-color: #10b981; background: #ecfdf5; }
    .callout-definition { border-left-color: #8b5cf6; background: #f5f3ff; }
    .callout-objective  { border-left-color: #06b6d4; background: #ecfeff; }
    .threed-placeholder { padding: 2rem; text-align: center; background: #f1f5f9; border-radius: 0.75rem; border: 2px dashed #e2e8f0; }
    .threed-placeholder a { color: #3b82f6; font-weight: 600; }

    /* Rubric tables */
    .rubric-table-wrap { margin: 1.5rem 0; padding: 1.25rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; }
    .rubric-heading { text-transform: uppercase; font-size: 1.1rem; font-weight: 600; margin: 0 0 0.25rem; }
    .rubric-description { font-size: 0.9rem; color: #64748b; margin: 0.25rem 0 1rem; }
    .rubric-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .rubric-table th, .rubric-table td { padding: 0.6rem 0.75rem; border: 1px solid #e2e8f0; text-align: left; }
    .rubric-table th { font-weight: 600; background: #f8fafc; }
    .rubric-criterion { font-weight: 500; white-space: nowrap; }

    @media print {
      body { padding: 0; max-width: none; }
      .chapter { page-break-before: always; }
      .chapter:first-of-type { page-break-before: auto; }
      .no-print { display: none; }
      a { color: inherit; text-decoration: none; }
      pre { white-space: pre-wrap; word-wrap: break-word; }
    }
  </style>
</head>
<body>
  <div class="book-header">
    <h1>${escapeHtml(book.title)}</h1>
    <div class="meta">
      ${(book as any).author ? `By ${escapeHtml((book as any).author)}` : ''}
      ${(book as any).license ? ` · ${escapeHtml((book as any).license)}` : ''}
    </div>
    ${(book as any).description ? `<div class="description">${escapeHtml((book as any).description)}</div>` : ''}
  </div>

  <div class="toc">
    <h2>Table of Contents</h2>
    ${tocEntries}
  </div>

  ${chaptersHtml}

  <div class="no-print" style="margin-top:2rem;padding:1rem;background:#f0f9ff;border-radius:0.5rem;text-align:center">
    <button onclick="window.print()" style="padding:0.6rem 2rem;background:#2563eb;color:#fff;border:none;border-radius:0.375rem;font-size:0.95rem;cursor:pointer">
      Save as PDF
    </button>
    <p style="margin-top:0.5rem;font-size:0.85rem;color:#64748b">Use your browser's print dialog to save as PDF. Set margins to "None" or "Minimum" for best results.</p>
  </div>
</body>
</html>`

      // Open in new window for print
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        throw new Error('Pop-up blocked. Please allow pop-ups for this site to export PDF.')
      }
      printWindow.document.write(html)
      printWindow.document.close()

      progress.value = ''
    } catch (err: any) {
      console.error('PDF export failed:', err)
      progress.value = `Error: ${err.message || 'PDF export failed'}`
      setTimeout(() => { progress.value = '' }, 4000)
    } finally {
      exporting.value = false
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Word (.docx) Export                                              */
  /* ---------------------------------------------------------------- */

  async function exportBookDocx(bookSlug: string) {
    exporting.value = true
    progress.value = 'Loading book…'

    try {
      const { book, flat, navigable } = await fetchBookData(bookSlug)

      const chapters = await resolveChapters(navigable, (i, total, title) => {
        progress.value = `Loading ${i + 1}/${total}: ${title}`
      })

      progress.value = 'Generating Word document…'

      const children: Paragraph[] = []

      // Title
      children.push(new Paragraph({
        text: book.title,
        heading: HeadingLevel.TITLE,
        spacing: { after: 200 },
      }))

      // Author & license
      const metaParts: string[] = []
      if ((book as any).author) metaParts.push(`By ${(book as any).author}`)
      if ((book as any).license) metaParts.push((book as any).license)
      if (metaParts.length) {
        children.push(new Paragraph({
          children: [new TextRun({ text: metaParts.join(' · '), italics: true, color: '666666' })],
          spacing: { after: 100 },
        }))
      }

      // Description
      if ((book as any).description) {
        children.push(new Paragraph({
          text: (book as any).description,
          spacing: { after: 400 },
        }))
      }

      // Table of Contents (simple text-based)
      children.push(new Paragraph({
        text: 'Table of Contents',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 },
      }))

      for (const ch of flat) {
        if (ch.isSection && !ch.content) {
          children.push(new Paragraph({
            children: [new TextRun({ text: ch.title, bold: true })],
            indent: { left: ch.depth * 360 },
            spacing: { after: 60 },
          }))
        } else if (ch.content) {
          children.push(new Paragraph({
            text: ch.title,
            indent: { left: ch.depth * 360 },
            spacing: { after: 40 },
          }))
        }
      }

      // Page break before content
      children.push(new Paragraph({
        text: '',
        pageBreakBefore: true,
      }))

      // Chapters
      const bookLicenseDocx = (book as any).license || ''
      const bookAuthorDocx = (book as any).author || ''

      for (const { chapter, bodyText, description, contentItem } of chapters) {
        // Chapter heading
        const headingLevel = chapter.depth === 0 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2
        children.push(new Paragraph({
          text: chapter.title,
          heading: headingLevel,
          pageBreakBefore: true,
          spacing: { after: 200 },
        }))

        // Metadata row: date, difficulty, tags
        const metaDocxParts: TextRun[] = []
        const chDate = contentItem?.date || ''
        const chDifficulty = contentItem?.difficulty || ''
        const chTags: string[] = Array.isArray(contentItem?.tags) ? contentItem.tags : []

        if (chDate) {
          metaDocxParts.push(new TextRun({ text: formatDate(chDate), italics: true, color: '666666', size: 18 }))
        }
        if (chDifficulty) {
          if (metaDocxParts.length) metaDocxParts.push(new TextRun({ text: '  ·  ', color: '999999', size: 18 }))
          metaDocxParts.push(new TextRun({ text: chDifficulty, bold: true, color: '2563eb', size: 18 }))
        }
        if (chTags.length) {
          if (metaDocxParts.length) metaDocxParts.push(new TextRun({ text: '  ·  ', color: '999999', size: 18 }))
          metaDocxParts.push(new TextRun({ text: chTags.join(', '), italics: true, color: '666666', size: 18 }))
        }
        if (metaDocxParts.length) {
          children.push(new Paragraph({ children: metaDocxParts, spacing: { after: 100 } }))
        }

        if (description) {
          children.push(new Paragraph({
            children: [new TextRun({ text: description, italics: true, color: '555555' })],
            spacing: { after: 200 },
          }))
        }

        // Attachments
        const rawAtt = contentItem?.attachments
        const attList: Array<{ title?: string; url?: string; file?: string }> = Array.isArray(rawAtt)
          ? rawAtt
          : typeof rawAtt === 'string'
            ? (() => { try { return JSON.parse(rawAtt) } catch { return [] } })()
            : []
        if (attList.length) {
          children.push(new Paragraph({
            children: [new TextRun({ text: 'Attachments:', bold: true, size: 20 })],
            spacing: { before: 100, after: 60 },
          }))
          for (const att of attList) {
            const label = att.title || att.url || att.file || 'Attachment'
            const href = att.url || att.file || ''
            children.push(new Paragraph({
              children: [new TextRun({ text: `${label}${href ? ` — ${href}` : ''}`, color: '2563eb', size: 20 })],
              bullet: { level: 0 },
              spacing: { after: 40 },
            }))
          }
        }

        // Body paragraphs from plain text conversion
        const lines = bodyText.split('\n')
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) {
            children.push(new Paragraph({ text: '' }))
            continue
          }

          if (trimmed.startsWith('# ')) {
            children.push(new Paragraph({
              children: parseInlineMarkdown(trimmed.slice(2)),
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 200, after: 120 },
            }))
          } else if (trimmed.startsWith('## ')) {
            children.push(new Paragraph({
              children: parseInlineMarkdown(trimmed.slice(3)),
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 120 },
            }))
          } else if (trimmed.startsWith('### ')) {
            children.push(new Paragraph({
              children: parseInlineMarkdown(trimmed.slice(4)),
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 120, after: 80 },
            }))
          } else if (trimmed.startsWith('#### ')) {
            children.push(new Paragraph({
              children: parseInlineMarkdown(trimmed.slice(5)),
              heading: HeadingLevel.HEADING_4,
              spacing: { before: 100, after: 60 },
            }))
          } else if (trimmed.match(/^[-*]\s/)) {
            children.push(new Paragraph({
              children: parseInlineMarkdown(trimmed.slice(2)),
              bullet: { level: 0 },
              spacing: { after: 60 },
            }))
          } else if (trimmed.match(/^\d+\.\s/)) {
            const text = trimmed.replace(/^\d+\.\s/, '')
            children.push(new Paragraph({
              children: parseInlineMarkdown(text),
              indent: { left: 360 },
              spacing: { after: 60 },
            }))
          } else if (trimmed === '---') {
            children.push(new Paragraph({
              text: '_______________________________________________',
              spacing: { before: 200, after: 200 },
            }))
          } else {
            children.push(new Paragraph({
              children: parseInlineMarkdown(trimmed),
              spacing: { after: 100 },
            }))
          }
        }

        // Rubric tables (from MDC ::rubric-component nodes in the AST)
        if (contentItem?.body) {
          const rubricIds = findRubricIds(getBodyChildren(contentItem.body))
          for (const rid of rubricIds) {
            const rubric = EXPORT_RUBRICS[rid]
            if (!rubric) continue
            children.push(new Paragraph({
              children: [new TextRun({ text: `${rubric.name} Rubric`, bold: true, size: 26 })],
              spacing: { before: 300, after: 80 },
            }))
            if (rubric.description) {
              children.push(new Paragraph({
                children: [new TextRun({ text: rubric.description, italics: true, color: '555555', size: 20 })],
                spacing: { after: 120 },
              }))
            }
            const headerRow = new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: 'Criterion', bold: true })] })],
                  width: { size: 25, type: WidthType.PERCENTAGE },
                }),
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: 'Description', bold: true })] })],
                  width: { size: 75, type: WidthType.PERCENTAGE },
                }),
              ],
            })
            const dataRows = rubric.criteria.map(
              (c) =>
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: c.name, bold: true })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: c.description })] })],
                    }),
                  ],
                })
            )
            children.push(new Table({
              rows: [headerRow, ...dataRows],
              width: { size: 100, type: WidthType.PERCENTAGE },
            }))
          }
        }

        // Chapter license footer
        const chLicense = contentItem?.license || bookLicenseDocx
        const chAuthor = contentItem?.author || bookAuthorDocx
        if (chLicense || chAuthor) {
          const licParts: TextRun[] = [
            new TextRun({ text: 'Licensed under ', italics: true, color: '999999', size: 18 }),
          ]
          if (chLicense) licParts.push(new TextRun({ text: chLicense, bold: true, italics: true, color: '999999', size: 18 }))
          if (chAuthor) {
            licParts.push(new TextRun({ text: ` by ${chAuthor}`, italics: true, color: '999999', size: 18 }))
          }
          children.push(new Paragraph({
            children: licParts,
            spacing: { before: 300, after: 100 },
            border: { top: { color: 'CCCCCC', size: 1, style: 'single', space: 8 } },
          }))
        }
      }

      // Footer
      children.push(new Paragraph({
        children: [new TextRun({
          text: `Generated on ${new Date().toLocaleDateString()}`,
          italics: true,
          color: '999999',
          size: 18,
        })],
        spacing: { before: 400 },
      }))

      const doc = new Document({
        styles: {
          default: {
            document: {
              run: { font: 'Helvetica' },
            },
          },
        },
        sections: [{ properties: {}, children }],
      })

      // Download
      const blob = await Packer.toBlob(doc)
      const docxBlob = new Blob([blob], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      triggerDownload(docxBlob, `${bookSlug}.docx`)

      progress.value = ''
    } catch (err: any) {
      console.error('Word export failed:', err)
      progress.value = `Error: ${err.message || 'Word export failed'}`
      setTimeout(() => { progress.value = '' }, 4000)
    } finally {
      exporting.value = false
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Common Cartridge (IMS CC 1.3) Export                             */
  /* ---------------------------------------------------------------- */

  async function exportBookCC(bookSlug: string) {
    exporting.value = true
    progress.value = 'Loading book…'

    try {
      const { book, flat, navigable } = await fetchBookData(bookSlug)

      const chapters = await resolveChapters(navigable, (i, total, title) => {
        progress.value = `Loading ${i + 1}/${total}: ${title}`
      })

      progress.value = 'Generating Common Cartridge…'

      const zip = new JSZip()

      // Build organization items (hierarchical) and resources
      const resourceEntries: string[] = []
      const chapterMap = new Map(chapters.map(c => [c.chapter.fullPath, c]))

      const bookLicenseCC = (book as any).license || ''
      const bookAuthorCC = (book as any).author || ''

      function buildOrgItems(nodes: OutlineNode[], parentPath: string = '', depth: number = 0): string {
        return nodes.map((node) => {
          const segment = node.path || slugifyCC(node.title)
          const fullPath = parentPath ? `${parentPath}/${segment}` : segment
          const hasChildren = node.items && node.items.length > 0
          const hasContent = !!node.content
          const ident = `item-${slugifyPath(fullPath)}`
          const resRef = hasContent ? ` identifierref="res-${slugifyPath(fullPath)}"` : ''

          let childItems = ''
          if (hasChildren) {
            childItems = buildOrgItems(node.items!, fullPath, depth + 1)
          }

          if (hasContent) {
            const resolved = chapterMap.get(fullPath)
            const filename = `content/${slugifyPath(fullPath)}.html`

            // Add resource entry
            resourceEntries.push(
              `    <resource identifier="res-${slugifyPath(fullPath)}" type="webcontent" href="${filename}">\n` +
              `      <file href="${filename}" />\n` +
              `    </resource>`
            )

            // Build full chapter HTML with metadata
            const metaHtml = resolved?.contentItem ? buildChapterMetaHtml(resolved.contentItem, bookLicenseCC, bookAuthorCC) : ''
            const footerHtml = resolved?.contentItem ? buildLicenseFooterHtml(resolved.contentItem, bookLicenseCC, bookAuthorCC) : ''
            const fullBodyHtml = [metaHtml, resolved?.bodyHtml || '<p>Content not available.</p>', footerHtml].filter(Boolean).join('\n')

            // Add HTML file to zip
            const contentHtml = ccHtmlPage(
              node.title,
              fullBodyHtml,
              resolved?.description
            )
            zip.file(filename, contentHtml)
          }

          return `${'      '.repeat(depth + 2)}<item identifier="${ident}"${resRef}>\n` +
                 `${'      '.repeat(depth + 3)}<title>${escapeXml(node.title)}</title>\n` +
                 childItems +
                 `${'      '.repeat(depth + 2)}</item>`
        }).join('\n')
      }

      const orgItems = buildOrgItems((book as any).outline || [])

      // Build manifest
      const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="manifest-${escapeXml(bookSlug)}"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:lom="http://ltsc.ieee.org/xsd/imscc/LOM"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 http://www.imsglobal.org/profile/cc/ccv1p3/ccv1p3_imscp_v1p2_v1p0.xsd">

  <metadata>
    <schema>IMS Common Cartridge</schema>
    <schemaversion>1.3.0</schemaversion>
    <lom:lom>
      <lom:general>
        <lom:title>
          <lom:string language="en-US">${escapeXml(book.title)}</lom:string>
        </lom:title>
        ${(book as any).description ? `<lom:description>\n          <lom:string language="en-US">${escapeXml((book as any).description)}</lom:string>\n        </lom:description>` : ''}
      </lom:general>
      ${(book as any).author ? `<lom:lifeCycle>\n        <lom:contribute>\n          <lom:role><lom:value>Author</lom:value></lom:role>\n          <lom:entity>${escapeXml((book as any).author)}</lom:entity>\n        </lom:contribute>\n      </lom:lifeCycle>` : ''}
      ${(book as any).license ? `<lom:rights>\n        <lom:description>\n          <lom:string language="en-US">${escapeXml((book as any).license)}</lom:string>\n        </lom:description>\n      </lom:rights>` : ''}
    </lom:lom>
  </metadata>

  <organizations default="org-${escapeXml(bookSlug)}">
    <organization identifier="org-${escapeXml(bookSlug)}">
      <title>${escapeXml(book.title)}</title>
${orgItems}
    </organization>
  </organizations>

  <resources>
${resourceEntries.join('\n')}
  </resources>
</manifest>`

      zip.file('imsmanifest.xml', manifest)

      // Generate and download
      progress.value = 'Compressing…'
      const blob = await zip.generateAsync({ type: 'blob' })
      triggerDownload(blob, `${bookSlug}.imscc`)

      progress.value = ''
    } catch (err: any) {
      console.error('Common Cartridge export failed:', err)
      progress.value = `Error: ${err.message || 'CC export failed'}`
      setTimeout(() => { progress.value = '' }, 4000)
    } finally {
      exporting.value = false
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Generate Book HTML files map (for GitHub Pages deploy)           */
  /* ---------------------------------------------------------------- */

  /**
   * Generates the same HTML files as the ZIP export,
   * but returns them as a Record<path, content> instead of downloading.
   * Media paths are converted to relative paths (e.g. `uploads/foo.jpg`)
   * and the list of referenced upload paths is returned so the caller
   * can fetch and bundle the actual binary files.
   */
  async function generateBookHtmlFiles(
    bookSlug: string,
    onProgress?: (msg: string) => void,
  ): Promise<{ files: Record<string, string>; uploadPaths: string[] }> {
    // Enable bundle mode — resolveAssetUrlForBundle will use relative paths
    // and collect all /uploads/... references
    _bundleMode = true
    _collectedUploads.clear()

    try {
      onProgress?.('Loading book…')

      const book = await queryCollection('books').path(`/books/${bookSlug}`).first()
      if (!book) throw new Error(`Book "${bookSlug}" not found`)

      const theme = (book as any).theme || 'default'
      const isSerif = theme === 'minimal'
      const outline: OutlineNode[] = (book as any).outline || []

      const flat = flattenOutline(outline)
      const navigable = getNavigableChapters(flat)

      const files: Record<string, string> = {}

      // Index page
      const bookHeaderHtml = buildBookIndexHtml(book)
      const bookBodyHtml = book.body ? astToHtml(getBodyChildren(book.body)) : ''
      const descHtml = (book as any).description
        ? `<p class="chapter-description">${escapeHtml((book as any).description)}</p>`
        : ''
      const tocHtml = navigable.length
        ? `<h2>Table of Contents</h2>\n<ol>\n${navigable.map((ch) =>
            `  <li><a href="${slugifyPath(ch.fullPath)}.html">${escapeHtml(ch.title)}</a></li>`
          ).join('\n')}\n</ol>`
        : ''

      const indexBody = [bookHeaderHtml, descHtml, bookBodyHtml, tocHtml].filter(Boolean).join('\n')
      files['index.html'] = htmlPage({
        title: book.title,
        bookTitle: book.title,
        theme,
        serif: isSerif,
        bodyHtml: indexBody,
        sidebarHtml: buildSidebarHtml(flat, ''),
        nextLink: navigable[0] ? `${slugifyPath(navigable[0].fullPath)}.html` : undefined,
        nextTitle: navigable[0]?.title,
      })

      // Chapter pages
      const bookLicense = (book as any).license || ''
      const bookAuthor = (book as any).author || ''

      for (let i = 0; i < navigable.length; i++) {
        const ch = navigable[i]
        onProgress?.(`Generating ${i + 1}/${navigable.length}: ${ch.title}`)

        let contentBodyHtml = ''
        let metaHtml = ''
        let footerHtml = ''
        const ref = ch.content ? parseContentRef(ch.content) : null

        if (ref) {
          try {
            const item = await queryCollection(ref.collection as any)
              .path(`/${ref.collection}/${ref.slug}`)
              .first()
            if (item?.body) {
              contentBodyHtml = astToHtml(getBodyChildren(item.body))
            }
            metaHtml = buildChapterMetaHtml(item, bookLicense, bookAuthor)
            footerHtml = buildLicenseFooterHtml(item, bookLicense, bookAuthor)
          } catch {
            contentBodyHtml = '<p><em>Content not available.</em></p>'
          }
        }

        const bodyHtml = [metaHtml, contentBodyHtml, footerHtml].filter(Boolean).join('\n')

        const prev = i > 0 ? navigable[i - 1] : null
        const next = i < navigable.length - 1 ? navigable[i + 1] : null

        files[`${slugifyPath(ch.fullPath)}.html`] = htmlPage({
          title: ch.title,
          bookTitle: book.title,
          theme,
          serif: isSerif,
          bodyHtml,
          sidebarHtml: buildSidebarHtml(flat, ch.fullPath),
          prevLink: prev ? `${slugifyPath(prev.fullPath)}.html` : 'index.html',
          prevTitle: prev?.title || book.title,
          nextLink: next ? `${slugifyPath(next.fullPath)}.html` : undefined,
          nextTitle: next?.title,
        })
      }

      // Add a .nojekyll file so GitHub Pages serves HTML correctly
      files['.nojekyll'] = ''

      const uploadPaths = [..._collectedUploads]

      return { files, uploadPaths }
    } finally {
      _bundleMode = false
      _collectedUploads.clear()
    }
  }

  return { exportBook, exportBookPdf, exportBookDocx, exportBookCC, generateBookHtmlFiles, exporting, progress }
}

/* ------------------------------------------------------------------ */
/*  Shared utility: trigger browser download                           */
/* ------------------------------------------------------------------ */

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 500)
}

/* ------------------------------------------------------------------ */
/*  AST → plain text (for Word export)                                 */
/* ------------------------------------------------------------------ */

function astToPlainText(nodes: ASTNode[] | undefined): string {
  if (!nodes?.length) return ''
  return nodes.map(nodeToText).join('')
}

function nodeToText(node: ASTNode): string {
  if (node.type === 'text') return node.value || ''

  const tag = node.tag || ''
  const p = node.props || {}
  const inner = astToPlainText(node.children)

  // Custom MDC components — generate meaningful plain text
  if (tag === 'rubric-component') {
    const rubric = EXPORT_RUBRICS[p.id || '']
    if (!rubric) return ''
    const lines = [`\n## ${rubric.name} Rubric\n`, rubric.description, '']
    for (const c of rubric.criteria) {
      lines.push(`- ${c.name}: ${c.description}`)
    }
    return lines.join('\n') + '\n'
  }
  if (tag === 'youtube-video-component') return `\n[YouTube Video: ${p.title || p.id || ''}]\n`
  if (tag === 'video-component') return `\n[Video: ${p.title || p.src || ''}]\n`
  if (tag === 'iframe-component') return `\n[Embedded Content: ${p.title || p.src || ''}]\n`
  if (tag === 'google-slides-component') return `\n[Google Slides: ${p.title || p.id || ''}]\n`
  if (tag === 'sketchfab-component') return `\n[Sketchfab 3D Model: ${p.title || p.src || ''}]\n`
  if (tag === 'threed-viewer-component') return `\n[3D Model: ${p.title || p.src || ''}]\n`
  if (tag === 'code-embed-component') return `\n[Code Example: ${p.title || p.src || ''}]\n`
  if (tag === 'image-component') return `\n[Image: ${p.alt || p.caption || p.src || ''}]\n`
  if (tag === 'callout') {
    const title = p.title || ''
    return `\n${title ? `${title}: ` : ''}${inner}\n`
  }

  // Block-level elements get newlines
  const blockTags = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'pre', 'tr'])

  if (tag === 'h1') return `# ${inner}\n`
  if (tag === 'h2') return `## ${inner}\n`
  if (tag === 'h3') return `### ${inner}\n`
  if (tag === 'h4') return `#### ${inner}\n`
  if (tag === 'li') return `- ${inner}\n`
  if (tag === 'hr') return '---\n'
  if (tag === 'br') return '\n'
  if (tag === 'strong' || tag === 'b') return `**${inner}**`
  if (tag === 'em' || tag === 'i') return `*${inner}*`
  if (tag === 'code' && !node.children?.some(c => c.tag === 'code')) return `\`${inner}\``

  if (blockTags.has(tag)) return `${inner}\n`

  return inner
}

/**
 * Recursively find all rubric-component IDs in an AST tree.
 * Used by the Word export to generate proper docx Table elements.
 */
function findRubricIds(nodes: ASTNode[] | undefined): string[] {
  if (!nodes?.length) return []
  const ids: string[] = []
  for (const node of nodes) {
    if (node.tag === 'rubric-component' && node.props?.id) {
      ids.push(node.props.id)
    }
    if (node.children?.length) {
      ids.push(...findRubricIds(node.children))
    }
  }
  return ids
}

/* ------------------------------------------------------------------ */
/*  Markdown inline formatting → TextRun[] (for Word export)           */
/* ------------------------------------------------------------------ */

function parseInlineMarkdown(text: string): TextRun[] {
  const runs: TextRun[] = []
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)

  for (const part of parts) {
    if (!part) continue
    if (part.startsWith('**') && part.endsWith('**')) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true }))
    } else if (part.startsWith('*') && part.endsWith('*')) {
      runs.push(new TextRun({ text: part.slice(1, -1), italics: true }))
    } else if (part.startsWith('`') && part.endsWith('`')) {
      runs.push(new TextRun({ text: part.slice(1, -1), font: 'Courier New', size: 20 }))
    } else {
      runs.push(new TextRun({ text: part }))
    }
  }

  return runs.length ? runs : [new TextRun({ text })]
}

/* ------------------------------------------------------------------ */
/*  Common Cartridge HTML page wrapper                                 */
/* ------------------------------------------------------------------ */

function ccHtmlPage(title: string, bodyHtml: string, description?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 20px; line-height: 1.6; color: #1a1a2e; }
    h1 { font-size: 1.8rem; font-weight: 700; margin-bottom: 1rem; }
    h2 { font-size: 1.4rem; font-weight: 600; margin: 1.5rem 0 0.75rem; }
    h3 { font-size: 1.15rem; font-weight: 600; margin: 1.25rem 0 0.5rem; }
    p { margin: 0.75rem 0; }
    ul, ol { margin: 0.75rem 0; padding-left: 1.75rem; }
    li { margin: 0.25rem 0; }
    pre { background: #f8fafc; border: 1px solid #e2e8f0; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; font-size: 0.9rem; }
    code { font-family: monospace; font-size: 0.9em; }
    :not(pre) > code { background: #f1f5f9; padding: 0.15em 0.35em; border-radius: 0.25rem; }
    img { max-width: 100%; height: auto; }
    blockquote { border-left: 3px solid #2563eb; padding: 0.5rem 1rem; margin: 1rem 0; color: #475569; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; text-align: left; }
    th { font-weight: 600; background: #f8fafc; }
    .description { font-size: 1rem; color: #475569; margin-bottom: 1.5rem; font-style: italic; }
    .header-image { width: 100%; max-height: 300px; object-fit: cover; border-radius: 0.5rem; margin-bottom: 1rem; }
    .meta-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: #64748b; margin-bottom: 0.75rem; }
    .badge { display: inline-flex; border-radius: 999px; padding: 0.1rem 0.5rem; font-size: 0.7rem; font-weight: 600; }
    .badge-difficulty { background: #eff6ff; border: 1px solid #bfdbfe; color: #2563eb; }
    .tags { display: inline-flex; flex-wrap: wrap; gap: 0.2rem; }
    .tag { display: inline-flex; border-radius: 999px; background: #f1f5f9; border: 1px solid #e2e8f0; padding: 0.06rem 0.4rem; font-size: 0.65rem; font-weight: 500; }
    .chapter-description { font-size: 1rem; color: #475569; line-height: 1.5; margin-bottom: 1rem; }
    .attachments { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 1rem; }
    .attachment-link { display: block; padding: 0.35rem 0.5rem; border: 1px solid #e2e8f0; border-radius: 0.25rem; font-size: 0.8rem; color: #1e293b; text-decoration: none; }
    .license-footer { margin-top: 1.5rem; padding-top: 0.75rem; border-top: 1px solid #e2e8f0; font-size: 0.75rem; color: #64748b; }
    .license-footer a { color: #2563eb; font-weight: 500; }
    .ai-license { margin-bottom: 0.4rem; padding: 0.3rem 0.5rem; border-radius: 0.25rem; background: #f8fafc; font-size: 0.75rem; }

    /* Embeds */
    .embed-wrap { margin: 1.5rem 0; }
    .embed-responsive { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 0.5rem; }
    .embed-responsive iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }
    .embed-slides { padding-bottom: 60%; }
    .embed-caption { margin-top: 0.5rem; font-size: 0.85rem; color: #64748b; text-align: center; }
    .embed-caption .credit { font-style: italic; }
    .image-figure { margin: 1.5rem 0; text-align: center; }
    .image-figure img { max-width: 100%; height: auto; border-radius: 0.5rem; }
    .image-figure figcaption { margin-top: 0.5rem; font-size: 0.85rem; color: #64748b; }
    .callout { margin: 1.5rem 0; padding: 1rem 1.25rem; border-left: 4px solid #3b82f6; border-radius: 0.5rem; background: #f1f5f9; }
    .callout-title { margin: 0 0 0.5rem; font-size: 0.95rem; }
    .callout p { margin: 0.25rem 0; }
    .callout-warning { border-left-color: #f59e0b; background: #fefce8; }
    .callout-danger  { border-left-color: #ef4444; background: #fef2f2; }
    .callout-tip     { border-left-color: #10b981; background: #ecfdf5; }
    .callout-definition { border-left-color: #8b5cf6; background: #f5f3ff; }
    .callout-objective  { border-left-color: #06b6d4; background: #ecfeff; }
    .threed-placeholder { padding: 2rem; text-align: center; background: #f1f5f9; border-radius: 0.75rem; border: 2px dashed #e2e8f0; }
    .threed-placeholder a { color: #3b82f6; font-weight: 600; }

    /* Rubric tables */
    .rubric-table-wrap { margin: 1.5rem 0; padding: 1.25rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; }
    .rubric-heading { text-transform: uppercase; font-size: 1.1rem; font-weight: 600; margin: 0 0 0.25rem; }
    .rubric-description { font-size: 0.9rem; color: #64748b; margin: 0.25rem 0 1rem; }
    .rubric-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .rubric-table th, .rubric-table td { padding: 0.6rem 0.75rem; border: 1px solid #e2e8f0; text-align: left; }
    .rubric-table th { font-weight: 600; background: #f8fafc; }
    .rubric-criterion { font-weight: 500; white-space: nowrap; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${description ? `<div class="description">${escapeHtml(description)}</div>` : ''}
  ${bodyHtml}
</body>
</html>`
}

/* ------------------------------------------------------------------ */
/*  Common Cartridge XML helper                                        */
/* ------------------------------------------------------------------ */

function escapeXml(s: string): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function slugifyCC(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
}