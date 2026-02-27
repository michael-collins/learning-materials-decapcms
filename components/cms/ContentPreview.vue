<script setup lang="ts">
/**
 * ContentPreview — Live preview of content as it will appear on the published page.
 * Shows rendered frontmatter metadata + markdown body in a card layout.
 * Parses MDC component blocks and renders them as real embeds (YouTube iframes, Slides, etc.)
 */
import { Calendar, Tag, BookOpen, Shield, FileText } from 'lucide-vue-next'

const props = defineProps<{
  /** Reactive frontmatter data */
  frontmatter: Record<string, any>
  /** Raw markdown body content */
  body: string
  /** Collection name for context */
  collection?: string
}>()

// ─── MDC block rendering helpers ─────────────────────────
interface MdcParsed {
  componentType: string
  props: Record<string, string>
}

function parseMdcProps(attrStr: string): Record<string, string> {
  const result: Record<string, string> = {}
  const re = /(\w+)="([^"]*)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(attrStr)) !== null) result[m[1]!] = m[2]!
  return result
}

// ─── Sanitization helpers ────────────────────────────────
/** Escape HTML entities to prevent XSS in interpolated strings */
function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Extract a YouTube video ID from various URL formats or a bare ID */
function extractYouTubeId(input: string): string | null {
  if (!input) return null
  // Already a bare ID (11 alphanumeric + hyphen/underscore chars)
  if (/^[\w-]{11}$/.test(input)) return input
  try {
    const url = new URL(input)
    const host = url.hostname.replace(/^www\./, '')
    // youtube.com/watch?v=ID
    if ((host === 'youtube.com' || host === 'youtube-nocookie.com') && url.searchParams.get('v')) {
      return url.searchParams.get('v')
    }
    // youtube.com/embed/ID or youtube-nocookie.com/embed/ID
    const embedMatch = url.pathname.match(/\/embed\/([\w-]{11})/)
    if (embedMatch) return embedMatch[1]!
    // youtu.be/ID
    if (host === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0]
      if (id && /^[\w-]{11}$/.test(id)) return id
    }
  } catch { /* not a URL */ }
  return null
}

/** Validate and normalise a URL, returning null if invalid or not an allowed domain */
function safeEmbedUrl(input: string, allowedDomains: string[]): string | null {
  if (!input) return null
  try {
    const url = new URL(input)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    const host = url.hostname.replace(/^www\./, '')
    if (allowedDomains.some(d => host === d || host.endsWith(`.${d}`))) {
      return url.toString()
    }
  } catch { /* not a valid URL */ }
  return null
}

const invalidMsg = (text: string) =>
  `<div class="p-4 text-sm text-destructive flex items-center gap-2">
    <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
    ${text}
  </div>`

// ─── Preview-time reference tracker ──────────────────────
interface PreviewRef {
  num: number
  label: string
  text: string
  url?: string
  refId: string
  citeId: string
}

function createPreviewRefTracker() {
  const refs: PreviewRef[] = []
  const seen = new Map<string, PreviewRef>()

  function add(label: string, text?: string, url?: string): PreviewRef {
    const key = `${label}||${url || ''}`
    const existing = seen.get(key)
    if (existing) return existing
    const num = refs.length + 1
    const r: PreviewRef = { num, label, text: text || label, url, refId: `ref-${num}`, citeId: `cite-${num}` }
    seen.set(key, r)
    refs.push(r)
    return r
  }

  return { refs, add }
}

/** Build the caption / credit HTML rendered beneath a media embed in the preview */
function renderCaptionHtml(p: Record<string, string>, tracker: ReturnType<typeof createPreviewRefTracker>): string {
  const caption = p.caption?.trim()
  const credit = p.credit?.trim()
  if (!caption && !credit) return ''

  let inner = ''
  if (caption) inner += esc(caption)
  if (credit) {
    if (caption) inner += ' &mdash; '
    const ref = tracker.add(credit, credit, p.creditUrl?.trim() || undefined)
    const creditText = p.creditUrl
      ? `<a href="${esc(p.creditUrl)}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">${esc(credit)}</a>`
      : esc(credit)
    inner += `${creditText}<sup id="${ref.citeId}" class="ml-0.5"><a href="#${ref.refId}" class="inline-flex items-center justify-center rounded bg-primary/10 px-1 py-0.5 text-[0.65rem] font-semibold leading-none text-primary no-underline" title="${esc(credit)}">[${ref.num}]</a></sup>`
  }
  return `<figcaption class="mt-2 text-center text-sm text-muted-foreground">${inner}</figcaption>`
}

/** Render a references footer HTML block from collected references */
function renderReferencesFooterHtml(refs: PreviewRef[]): string {
  if (refs.length === 0) return ''
  const items = refs.map(r => {
    const srcLink = r.url
      ? `<a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-primary hover:underline text-xs"><svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>Source</a>`
      : ''
    const backLink = `<a href="#${r.citeId}" class="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground text-xs"><svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>Back to text</a>`
    return `<li id="${r.refId}" class="flex gap-3 rounded-md p-2 text-sm">
      <span class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">${r.num}</span>
      <div class="min-w-0 flex-1">
        <p class="text-foreground/90">${esc(r.text)}</p>
        <div class="mt-1 flex flex-wrap items-center gap-3">${srcLink}${backLink}</div>
      </div>
    </li>`
  }).join('')
  return `<section class="mt-12 border-t pt-8" role="doc-endnotes" aria-label="References">
    <h2 class="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tight">References <span class="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">${refs.length}</span></h2>
    <ol class="list-none space-y-3 pl-0">${items}</ol>
  </section>`
}

/**
 * Render a parsed MDC block to HTML for the preview panel.
 * Mirrors the actual content components in components/content/.
 * All user-supplied values are escaped / validated before interpolation.
 */
function renderMdcBlock(parsed: MdcParsed, refTracker: ReturnType<typeof createPreviewRefTracker>): string {
  const { componentType, props: p } = parsed
  const captionHtml = renderCaptionHtml(p, refTracker)
  const wrapper = (inner: string, label: string) =>
    `<div class="mdc-preview-block my-4 rounded-lg border overflow-hidden">
      <div class="bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground border-b">${esc(label)}</div>
      <div>${inner}</div>
      ${captionHtml}
    </div>`

  switch (componentType) {
    case 'image-component': {
      const src = esc((p.src || '').trim())
      const alt = esc(p.alt || '')
      if (!p.src?.trim()) return wrapper('<div class="p-4 text-sm text-muted-foreground italic">No image source specified</div>', '🖼 Image')
      return wrapper(
        `<img src="${src}" alt="${alt}" class="rounded-md max-w-full mx-auto" loading="lazy" />`,
        `🖼 ${alt || 'Image'}`
      )
    }

    case 'video-component':
    case 'youtube-video': {
      // Unified video component — accepts URL (YouTube, Vimeo, Kaltura, Dailymotion, etc.) or bare YouTube ID
      const raw = (p.src || p.id || '').trim()
      const title = esc(p.title || 'Video')
      if (!raw) return wrapper('<div class="p-4 text-sm text-muted-foreground italic">No video URL specified</div>', '▶ Video')

      // Allowed video provider domains
      const videoDomains = [
        'youtube.com', 'youtube-nocookie.com', 'youtu.be',
        'player.vimeo.com', 'vimeo.com',
        'dailymotion.com', 'dai.ly',
        'mediaspace.kaltura.com', 'cdnapisec.kaltura.com', 'kaltura.com',
        'panopto.com',
        'wistia.com', 'fast.wistia.net',
        'mediasite.com',
      ]

      let embedSrc: string | null = null

      // Try extracting bare YouTube ID (11 chars)
      const ytId = extractYouTubeId(raw)
      if (ytId) {
        embedSrc = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(ytId)}`
      } else {
        // Try as a URL — convert common watch formats to embed
        try {
          const urlObj = new URL(raw)
          const host = urlObj.hostname.replace(/^www\./, '')
          let converted = raw
          if ((host === 'youtube.com' || host === 'youtube-nocookie.com') && urlObj.searchParams.get('v')) {
            converted = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(urlObj.searchParams.get('v')!)}`
          } else if (host === 'youtu.be') {
            const vid = urlObj.pathname.slice(1).split('/')[0]
            if (vid) converted = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(vid)}`
          } else if (host === 'vimeo.com' && !host.startsWith('player.')) {
            const vMatch = urlObj.pathname.match(/\/(\d+)/)
            if (vMatch) converted = `https://player.vimeo.com/video/${vMatch[1]}`
          } else if (host === 'dailymotion.com') {
            const dmMatch = urlObj.pathname.match(/\/video\/([a-zA-Z0-9]+)/)
            if (dmMatch) converted = `https://www.dailymotion.com/embed/video/${dmMatch[1]}`
          }
          embedSrc = safeEmbedUrl(converted, videoDomains)
        } catch { /* not a valid URL */ }
      }

      if (!embedSrc) return wrapper(invalidMsg(`Invalid or unsupported video URL: <code>${esc(raw)}</code><br><span class="text-xs text-muted-foreground">Supported: YouTube, Vimeo, Kaltura, Dailymotion, Panopto, Wistia</span>`), '▶ Video')
      return wrapper(
        `<div class="relative w-full" style="padding-bottom:56.25%">
          <iframe src="${embedSrc}" title="${title}" class="absolute inset-0 w-full h-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen sandbox="allow-scripts allow-same-origin allow-popups"></iframe>
        </div>`,
        `▶ ${title}`
      )
    }

    case 'iframe-component': {
      // General-purpose iframe embed — any HTTPS URL
      const src = (p.src || '').trim()
      const title = esc(p.title || 'Embed')
      const height = /^\d+$/.test(p.height || '') ? p.height : '500'
      if (!src) return wrapper('<div class="p-4 text-sm text-muted-foreground italic">No URL specified</div>', '🌐 Embed')
      let safeSrc: string | null = null
      try {
        const urlObj = new URL(src)
        if (urlObj.protocol === 'https:' || urlObj.protocol === 'http:') safeSrc = urlObj.toString()
      } catch { /* invalid URL */ }
      if (!safeSrc) return wrapper(invalidMsg(`Invalid URL: <code>${esc(src)}</code>`), '🌐 Embed')
      return wrapper(
        `<div style="width:100%;height:${height}px">
          <iframe src="${safeSrc}" title="${title}" style="width:100%;height:100%" frameborder="0" allowfullscreen sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe>
        </div>`,
        `🌐 ${title}`
      )
    }

    case 'code-embed-component': {
      const provider = (p.provider || '').trim().toLowerCase()
      const raw = (p.src || '').trim()
      const title = esc(p.title || 'Code Example')
      const height = /^\d+$/.test(p.height || '') ? p.height : '400'
      if (!raw) return wrapper('<div class="p-4 text-sm text-muted-foreground italic">No code embed URL specified</div>', '💻 Code Embed')

      let embedSrc: string | null = null
      const providerDomains: Record<string, string[]> = {
        codepen: ['codepen.io'],
        jsfiddle: ['jsfiddle.net'],
        codesandbox: ['codesandbox.io'],
        stackblitz: ['stackblitz.com'],
        replit: ['replit.com', 'repl.it'],
        glitch: ['glitch.com'],
      }

      // Try to build embed URL based on provider
      if (provider === 'codepen') {
        // Accept: full URL or user/pen-id format
        if (raw.includes('codepen.io')) {
          try {
            const url = new URL(raw)
            // Convert /pen/ to /embed/
            const embedPath = url.pathname.replace(/\/pen\//, '/embed/')
            embedSrc = `https://codepen.io${embedPath}?default-tab=result`
          } catch { /* invalid URL */ }
        } else if (raw.includes('/')) {
          // Assume user/pen-id format
          embedSrc = `https://codepen.io/${encodeURIComponent(raw.split('/')[0]!)}/embed/${encodeURIComponent(raw.split('/')[1]!)}?default-tab=result`
        }
      } else if (provider === 'jsfiddle') {
        if (raw.includes('jsfiddle.net')) {
          embedSrc = raw.replace(/\/?$/, '/embedded/')
        } else {
          embedSrc = `https://jsfiddle.net/${encodeURIComponent(raw)}/embedded/`
        }
      } else if (provider === 'codesandbox') {
        if (raw.includes('codesandbox.io')) {
          try {
            const url = new URL(raw)
            const id = url.pathname.split('/s/')[1]?.split('/')[0]
            if (id) embedSrc = `https://codesandbox.io/embed/${id}`
          } catch { /* invalid URL */ }
        } else {
          embedSrc = `https://codesandbox.io/embed/${encodeURIComponent(raw)}`
        }
      } else if (provider === 'stackblitz') {
        if (raw.includes('stackblitz.com')) {
          embedSrc = raw.includes('/embed') ? raw : raw.replace(/\/?$/, '?embed=1')
        } else {
          embedSrc = `https://stackblitz.com/edit/${encodeURIComponent(raw)}?embed=1`
        }
      } else if (provider === 'replit') {
        if (raw.includes('replit.com') || raw.includes('repl.it')) {
          embedSrc = raw.includes('?embed=true') ? raw : raw.replace(/\/?$/, '?embed=true')
        } else {
          embedSrc = `https://replit.com/${encodeURIComponent(raw)}?embed=true`
        }
      } else if (provider === 'glitch') {
        if (raw.includes('glitch.com')) {
          embedSrc = raw.includes('/embed') ? raw : raw.replace(/\/?$/, '/embed')
        } else {
          embedSrc = `https://glitch.com/embed/#!/embed/${encodeURIComponent(raw)}`
        }
      } else {
        // Unknown provider, try as a direct URL if it's a known code platform
        const allCodeDomains = Object.values(providerDomains).flat()
        embedSrc = safeEmbedUrl(raw, allCodeDomains)
      }

      // Validate the final embed URL domain
      const allowedDomains = providerDomains[provider] || Object.values(providerDomains).flat()
      if (embedSrc) {
        const validated = safeEmbedUrl(embedSrc, allowedDomains)
        if (!validated) embedSrc = null
      }

      if (!embedSrc) return wrapper(invalidMsg(`Invalid ${provider || 'code'} embed: <code>${esc(raw)}</code><br><span class="text-xs text-muted-foreground">Supported: CodePen, JSFiddle, CodeSandbox, StackBlitz, Replit, Glitch</span>`), '💻 Code Embed')
      return wrapper(
        `<div style="width:100%;height:${height}px">
          <iframe src="${embedSrc}" title="${title}" style="width:100%;height:100%;border:0" loading="lazy" sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"></iframe>
        </div>`,
        `💻 ${title}${provider ? ` (${esc(provider)})` : ''}`
      )
    }

    case 'google-slides-component': {
      const raw = (p.id || '').trim()
      const title = esc(p.title || 'Google Slides')
      if (!raw) return wrapper('<div class="p-4 text-sm text-muted-foreground italic">No presentation ID specified</div>', '📊 Google Slides')
      let embedUrl: string | null = null
      let slideId = raw
      // Extract ID from full URL if provided
      if (slideId.includes('docs.google.com')) {
        const safe = safeEmbedUrl(raw, ['docs.google.com', 'google.com'])
        if (!safe) return wrapper(invalidMsg(`URL is not a valid Google Slides link: <code>${esc(raw)}</code>`), '📊 Google Slides')
        const docIdMatch = slideId.match(/\/d\/e?\/([a-zA-Z0-9_-]+)/)
        slideId = docIdMatch ? docIdMatch[1]! : ''
        if (!slideId) return wrapper(invalidMsg(`Could not extract presentation ID from URL: <code>${esc(raw)}</code>`), '📊 Google Slides')
      }
      // Published slides (2PACX-*) use /d/e/{id}/pubembed format
      // Regular slides use /d/{id}/embed format
      if (/^[a-zA-Z0-9_-]+$/.test(slideId)) {
        if (slideId.startsWith('2PACX')) {
          embedUrl = `https://docs.google.com/presentation/d/e/${encodeURIComponent(slideId)}/pubembed?start=false&loop=false&delayms=3000`
        } else {
          embedUrl = `https://docs.google.com/presentation/d/${encodeURIComponent(slideId)}/embed?start=false&loop=false&delayms=3000`
        }
      }
      if (!embedUrl) return wrapper(invalidMsg(`Invalid Google Slides ID: <code>${esc(raw)}</code>`), '📊 Google Slides')
      return wrapper(
        `<div class="relative w-full" style="padding-bottom:56.25%">
          <iframe src="${embedUrl}" title="${title}" class="absolute inset-0 w-full h-full" frameborder="0" allowfullscreen sandbox="allow-scripts allow-same-origin allow-popups"></iframe>
        </div>`,
        `📊 ${title}`
      )
    }

    case 'sketchfab-component': {
      let src = (p.src || '').trim()
      const title = esc(p.title || 'Sketchfab Model')
      const height = /^\d+$/.test(p.height || '') ? p.height : '480'
      if (!src) return wrapper('<div class="p-4 text-sm text-muted-foreground italic">No Sketchfab URL specified</div>', '🧊 Sketchfab Model')
      const sfMatch = src.match(/sketchfab\.com\/(?:3d-)?models\/(?:[^/]*-)?([a-f0-9]{32})/)
      if (sfMatch) {
        src = `https://sketchfab.com/models/${sfMatch[1]}/embed`
      }
      const safeSrc = safeEmbedUrl(src, ['sketchfab.com'])
      if (!safeSrc) return wrapper(invalidMsg(`Invalid Sketchfab URL: <code>${esc(p.src || '')}</code>`), '🧊 Sketchfab Model')
      return wrapper(
        `<iframe src="${safeSrc}" title="${title}" style="width:100%;height:${height}px" frameborder="0" allow="autoplay; fullscreen; xr-spatial-tracking" allowfullscreen sandbox="allow-scripts allow-same-origin allow-popups"></iframe>`,
        `🧊 ${title}`
      )
    }

    case 'threed-viewer-component': {
      const src = esc((p.src || '').trim())
      const title = esc(p.title || '3D Model')
      const height = /^\d+$/.test(p.height || '') ? p.height : '400'
      const autoRotate = p.autoRotate === 'true'
      if (!p.src?.trim()) return wrapper('<div class="p-4 text-sm text-muted-foreground italic">No 3D model file specified</div>', '📦 3D Model')
      const autoRotateAttr = autoRotate ? ' auto-rotate' : ''
      return wrapper(
        `<model-viewer
          src="${src}"
          alt="${title}"
          camera-controls
          ${autoRotateAttr}
          shadow-intensity="1"
          style="width:100%;height:${height}px;background-color:transparent;"
        ></model-viewer>`,
        `📦 ${title}`
      )
    }

    case 'rubric-component': {
      const id = esc((p.id || '').trim())
      return wrapper(
        `<div class="p-4 flex items-center gap-3">
          <div class="rounded-lg bg-amber-500/10 p-2">
            <svg class="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          </div>
          <div>
            <p class="text-sm font-medium">Assessment Rubric</p>
            <p class="text-xs text-muted-foreground">${id || 'No rubric selected'}</p>
          </div>
        </div>`,
        `📋 Rubric: ${id || 'unset'}`
      )
    }

    case 'cite-reference': {
      const label = esc(p.label || 'Citation')
      const text = p.text || p.label || 'Citation'
      const url = p.url?.trim()
      const ref = refTracker.add(label, text, url || undefined)
      return `<sup id="${ref.citeId}" class="cite-ref"><a href="#${ref.refId}" class="inline-flex items-center justify-center rounded bg-primary/10 px-1 py-0.5 text-[0.65rem] font-semibold leading-none text-primary no-underline" title="${esc(text)}">[${ref.num}]</a></sup>`
    }

    default:
      return wrapper(
        `<div class="p-4 text-sm text-muted-foreground italic">Unknown component: ${esc(componentType)}</div>`,
        `⚙ ${esc(componentType)}`
      )
  }
}

// ─── Markdown-to-HTML renderer with MDC support ─────────
const renderedBody = computed(() => {
  if (!props.body) return '<p class="text-muted-foreground italic">No content yet...</p>'

  const refTracker = createPreviewRefTracker()

  // First pass: extract and replace MDC blocks with placeholders
  const MDC_BLOCK_REGEX = /::([\w-]+)\{([^}]*)\}\s*\n?::/g
  const mdcBlocks: string[] = []
  let bodyWithPlaceholders = props.body.replace(MDC_BLOCK_REGEX, (_, compType, attrStr) => {
    const parsed: MdcParsed = { componentType: compType, props: parseMdcProps(attrStr) }
    const idx = mdcBlocks.length
    mdcBlocks.push(renderMdcBlock(parsed, refTracker))
    return `\n<!--MDC_PLACEHOLDER_${idx}-->\n`
  })

  // Standard markdown → HTML (inline formatting applied later, lists parsed line-by-line)

  // First, protect code blocks from any processing
  const codeBlocks: string[] = []
  let processed = bodyWithPlaceholders.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length
    codeBlocks.push(`<pre><code class="language-${lang}">${code}</code></pre>`)
    return `\n<!--CODE_BLOCK_${idx}-->\n`
  })

  // Apply inline formatting helpers
  function inlineFmt(line: string): string {
    return line
      // Images (before links so ![...](...) isn't caught by link regex)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-md max-w-full" />')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Bold+italic
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
  }

  // ─── Line-by-line list-aware parser ────────────────────
  const lines = processed.split('\n')
  const outputParts: string[] = []
  // Stack tracks open list tags: { tag: 'ul'|'ol', indent: number }
  const listStack: Array<{ tag: string; indent: number }> = []

  function closeListsToIndent(indent: number) {
    while (listStack.length > 0 && listStack[listStack.length - 1]!.indent >= indent) {
      const popped = listStack.pop()!
      outputParts.push(`</${popped.tag}>`)
    }
  }

  function closeAllLists() {
    closeListsToIndent(-1)
  }

  // Regex to detect list items:
  //   unordered: optional leading whitespace, then - or * followed by space
  //   ordered:   optional leading whitespace, then digits. followed by space
  const ulRegex = /^(\s*)([-*])\s+(.*)$/
  const olRegex = /^(\s*)(\d+)\.\s+(.*)$/

  let pendingParagraph: string[] = []

  function flushParagraph() {
    if (pendingParagraph.length > 0) {
      const text = pendingParagraph.join(' ').trim()
      if (text) outputParts.push(`<p>${inlineFmt(text)}</p>`)
      pendingParagraph = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!

    // Blank line — flush paragraph, but don't close lists yet
    // (lists are separated by blank lines in some markdown styles)
    if (line.trim() === '') {
      flushParagraph()
      // Check if the next non-blank line is still a list item
      let nextContentIdx = i + 1
      while (nextContentIdx < lines.length && lines[nextContentIdx]!.trim() === '') nextContentIdx++
      if (nextContentIdx < lines.length) {
        const nextLine = lines[nextContentIdx]!
        if (!ulRegex.test(nextLine) && !olRegex.test(nextLine)) {
          closeAllLists()
        }
      } else {
        closeAllLists()
      }
      continue
    }

    // MDC/code block placeholders — pass through as-is
    if (line.trim().startsWith('<!--MDC_PLACEHOLDER_') || line.trim().startsWith('<!--CODE_BLOCK_')) {
      flushParagraph()
      closeAllLists()
      outputParts.push(line)
      continue
    }

    // Headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headerMatch) {
      flushParagraph()
      closeAllLists()
      const level = headerMatch[1]!.length
      outputParts.push(`<h${level}>${inlineFmt(headerMatch[2]!)}</h${level}>`)
      continue
    }

    // Blockquotes
    const bqMatch = line.match(/^>\s?(.*)$/)
    if (bqMatch) {
      flushParagraph()
      closeAllLists()
      outputParts.push(`<blockquote>${inlineFmt(bqMatch[1]!)}</blockquote>`)
      continue
    }

    // Horizontal rules
    if (/^---+$/.test(line.trim())) {
      flushParagraph()
      closeAllLists()
      outputParts.push('<hr />')
      continue
    }

    // Unordered list item
    const ulMatch = line.match(ulRegex)
    if (ulMatch) {
      flushParagraph()
      const indent = ulMatch[1]!.length
      const content = ulMatch[3]!

      // Close deeper or same-level lists that were a different type
      while (listStack.length > 0) {
        const top = listStack[listStack.length - 1]!
        if (top.indent > indent) {
          outputParts.push(`</${listStack.pop()!.tag}>`)
        } else if (top.indent === indent && top.tag !== 'ul') {
          outputParts.push(`</${listStack.pop()!.tag}>`)
        } else {
          break
        }
      }

      // Open a new <ul> if needed
      if (listStack.length === 0 || listStack[listStack.length - 1]!.indent < indent) {
        outputParts.push('<ul>')
        listStack.push({ tag: 'ul', indent })
      }

      outputParts.push(`<li>${inlineFmt(content)}</li>`)
      continue
    }

    // Ordered list item
    const olMatch = line.match(olRegex)
    if (olMatch) {
      flushParagraph()
      const indent = olMatch[1]!.length
      const content = olMatch[3]!

      // Close deeper or same-level lists that were a different type
      while (listStack.length > 0) {
        const top = listStack[listStack.length - 1]!
        if (top.indent > indent) {
          outputParts.push(`</${listStack.pop()!.tag}>`)
        } else if (top.indent === indent && top.tag !== 'ol') {
          outputParts.push(`</${listStack.pop()!.tag}>`)
        } else {
          break
        }
      }

      // Open a new <ol> if needed
      if (listStack.length === 0 || listStack[listStack.length - 1]!.indent < indent) {
        outputParts.push('<ol>')
        listStack.push({ tag: 'ol', indent })
      }

      outputParts.push(`<li>${inlineFmt(content)}</li>`)
      continue
    }

    // Regular text line — accumulate into paragraph
    pendingParagraph.push(line)
  }

  // Flush any remaining state
  flushParagraph()
  closeAllLists()

  let html = outputParts.join('\n')

  // Restore code blocks
  codeBlocks.forEach((block, idx) => {
    html = html.replace(`<!--CODE_BLOCK_${idx}-->`, block)
  })

  // Restore MDC blocks from placeholders
  mdcBlocks.forEach((blockHtml, idx) => {
    html = html.replace(`<!--MDC_PLACEHOLDER_${idx}-->`, blockHtml)
  })

  // Append references footer if any references were collected
  html += renderReferencesFooterHtml(refTracker.refs)

  return html
})

const formattedDate = computed(() => {
  const d = props.frontmatter.date
  if (!d) return null
  try {
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return d
  }
})

const tags = computed(() => {
  const t = props.frontmatter.tags
  if (Array.isArray(t)) return t
  return []
})
</script>

<template>
  <div class="h-full overflow-auto">
    <div class="mx-auto max-w-2xl p-6">
      <!-- Page Header -->
      <article>
        <!-- Category / Collection badge -->
        <div v-if="collection" class="mb-3">
          <span class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <BookOpen class="h-3 w-3" />
            {{ collection }}
          </span>
        </div>

        <!-- Title -->
        <h1 class="text-3xl font-bold tracking-tight">
          {{ frontmatter.title || 'Untitled' }}
        </h1>

        <!-- Description -->
        <p v-if="frontmatter.description" class="mt-3 text-lg text-muted-foreground">
          {{ frontmatter.description }}
        </p>

        <!-- Meta row -->
        <div class="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span v-if="formattedDate" class="flex items-center gap-1.5">
            <Calendar class="h-3.5 w-3.5" />
            {{ formattedDate }}
          </span>
          <span v-if="frontmatter.difficulty" class="flex items-center gap-1.5">
            <FileText class="h-3.5 w-3.5" />
            {{ frontmatter.difficulty }}
          </span>
          <span v-if="frontmatter.license" class="flex items-center gap-1.5">
            <Shield class="h-3.5 w-3.5" />
            {{ frontmatter.license }}
          </span>
          <span v-if="frontmatter.version" class="flex items-center gap-1.5 rounded bg-muted px-2 py-0.5 font-mono text-xs">
            v{{ frontmatter.version }}
          </span>
        </div>

        <!-- Tags -->
        <div v-if="tags.length > 0" class="mt-3 flex flex-wrap gap-1.5">
          <span
            v-for="tag in tags"
            :key="tag"
            class="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
          >
            <Tag class="h-3 w-3" />
            {{ tag }}
          </span>
        </div>

        <!-- Featured Image -->
        <div v-if="frontmatter.image" class="mt-6">
          <img
            :src="frontmatter.image"
            :alt="frontmatter.imageAlt || frontmatter.title"
            class="w-full rounded-lg border object-cover"
          />
        </div>

        <!-- Divider -->
        <hr class="my-6 border-border" />

        <!-- Body Content -->
        <div
          class="prose prose-sm dark:prose-invert max-w-none"
          v-html="renderedBody"
        />
      </article>
    </div>
  </div>
</template>
