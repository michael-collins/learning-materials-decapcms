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

/**
 * Render a parsed MDC block to HTML for the preview panel.
 * Mirrors the actual content components in components/content/.
 * All user-supplied values are escaped / validated before interpolation.
 */
function renderMdcBlock(parsed: MdcParsed): string {
  const { componentType, props: p } = parsed
  const wrapper = (inner: string, label: string) =>
    `<div class="mdc-preview-block my-4 rounded-lg border overflow-hidden">
      <div class="bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground border-b">${esc(label)}</div>
      <div>${inner}</div>
    </div>`

  switch (componentType) {
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
      if (raw.startsWith('http')) {
        const safe = safeEmbedUrl(raw, ['docs.google.com', 'google.com'])
        if (!safe) return wrapper(invalidMsg(`URL is not a valid Google Slides link: <code>${esc(raw)}</code>`), '📊 Google Slides')
        const docIdMatch = raw.match(/\/d\/([a-zA-Z0-9_-]+)/)
        const docId = docIdMatch ? docIdMatch[1] : null
        if (!docId) return wrapper(invalidMsg(`Could not extract presentation ID from URL: <code>${esc(raw)}</code>`), '📊 Google Slides')
        embedUrl = `https://docs.google.com/presentation/d/${encodeURIComponent(docId!)}/embed?start=false&loop=false&delayms=3000`
      } else if (/^[a-zA-Z0-9_-]+$/.test(raw)) {
        embedUrl = `https://docs.google.com/presentation/d/${encodeURIComponent(raw)}/embed?start=false&loop=false&delayms=3000`
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

  // First pass: extract and replace MDC blocks with placeholders
  const MDC_BLOCK_REGEX = /::([\w-]+)\{([^}]*)\}\s*\n?::/g
  const mdcBlocks: string[] = []
  let bodyWithPlaceholders = props.body.replace(MDC_BLOCK_REGEX, (_, compType, attrStr) => {
    const parsed: MdcParsed = { componentType: compType, props: parseMdcProps(attrStr) }
    const idx = mdcBlocks.length
    mdcBlocks.push(renderMdcBlock(parsed))
    return `\n<!--MDC_PLACEHOLDER_${idx}-->\n`
  })

  // Standard markdown → HTML
  let html = bodyWithPlaceholders
    // Code blocks (fenced)
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    // Headers
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-md max-w-full" />')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr />')
    // Paragraphs (remaining lines)
    .replace(/\n\n/g, '</p><p>')

  // Wrap in paragraph if not already block-level
  if (!html.startsWith('<')) {
    html = `<p>${html}</p>`
  }

  // Restore MDC blocks from placeholders
  mdcBlocks.forEach((blockHtml, idx) => {
    html = html.replace(`<!--MDC_PLACEHOLDER_${idx}-->`, blockHtml)
  })

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
