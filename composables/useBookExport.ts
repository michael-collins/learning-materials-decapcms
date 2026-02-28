/**
 * useBookExport — Client-side book-to-ZIP exporter.
 *
 * Fetches all chapter content via queryCollection, converts the Nuxt Content
 * AST to HTML, wraps each page in a standalone HTML document with embedded
 * CSS (including the book's theme variables), then packages everything into
 * a ZIP for download via JSZip.
 */
import JSZip from 'jszip'
import {
  flattenOutline,
  getNavigableChapters,
  parseContentRef,
  type OutlineNode,
  type FlatChapter,
} from '~/composables/useBookOutline'

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
/*  AST → HTML renderer                                                */
/* ------------------------------------------------------------------ */

interface ASTNode {
  type: string
  tag?: string
  value?: string
  props?: Record<string, any>
  children?: ASTNode[]
}

function astToHtml(nodes: ASTNode[] | undefined): string {
  if (!nodes?.length) return ''
  return nodes.map(renderNode).join('')
}

function renderNode(node: ASTNode): string {
  if (node.type === 'text') return escapeHtml(node.value || '')

  // Handle code blocks (type === 'element', tag === 'pre' with child <code>)
  const tag = node.tag || 'div'
  const attrs = propsToAttrs(node.props)
  const inner = astToHtml(node.children)

  // Self-closing tags
  const voidTags = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'source'])
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
      const bookBodyHtml = book.body ? astToHtml((book.body as any)?.children) : ''
      const tocHtml = navigable.length
        ? `<h2>Table of Contents</h2>\n<ol>\n${navigable.map((ch) =>
            `  <li><a href="${slugifyPath(ch.fullPath)}.html">${escapeHtml(ch.title)}</a></li>`
          ).join('\n')}\n</ol>`
        : ''
      const descHtml = (book as any).description
        ? `<p style="font-size:1.1rem;color:var(--color-muted-foreground);margin-bottom:1.5rem">${escapeHtml((book as any).description)}</p>`
        : ''

      const indexBody = [descHtml, bookBodyHtml, tocHtml].filter(Boolean).join('\n')
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
      for (let i = 0; i < navigable.length; i++) {
        const ch = navigable[i]
        progress.value = `Exporting ${i + 1}/${navigable.length}: ${ch.title}`

        let bodyHtml = ''
        const ref = ch.content ? parseContentRef(ch.content) : null

        if (ref) {
          try {
            const item = await queryCollection(ref.collection as any)
              .path(`/${ref.collection}/${ref.slug}`)
              .first()
            if (item?.body) {
              bodyHtml = astToHtml((item.body as any)?.children)
            }
          } catch {
            bodyHtml = `<p><em>Content not available for export.</em></p>`
          }
        }

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

      // 5. Generate zip and trigger download
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
      exporting.value = false
    }
  }

  return { exportBook, exporting, progress }
}
