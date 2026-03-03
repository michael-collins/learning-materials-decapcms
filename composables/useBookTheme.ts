/**
 * useBookTheme — Theme system for book layouts.
 *
 * Each theme defines CSS custom-property overrides for both light and dark
 * modes, using oklch() values that match the site's Tailwind v4 token format
 * (--color-*). The composable reads the current color mode via useTheme()
 * and returns the correct variable set reactively.
 *
 * Available themes:
 *   - default: Current site styling (no overrides, uses built-in Twitter theme)
   *   - lambda:  Blue-accented tech aesthetic inspired by lambda.ai
 *   - minimal: Clean serif reading experience with warm tones
 */

import { useTheme } from '~/composables/useTheme'

export type BookTheme = 'default' | 'lambda' | 'minimal'

export interface ThemeConfig {
  /** Human-readable label */
  label: string
  /** Extra CSS class(es) applied to the book layout root (non-color related) */
  rootClass: string
  /** CSS custom property overrides for light mode */
  light: Record<string, string>
  /** CSS custom property overrides for dark mode */
  dark: Record<string, string>
  /** Sidebar-specific overrides */
  sidebar: { class: string }
  /** Content area overrides */
  content: {
    /** Non-color utility classes for the content wrapper */
    class: string
    /** Tailwind Typography prose classes (should include dark: variants) */
    proseClass: string
  }
  /** Header overrides */
  header: { class: string }
}

/* ------------------------------------------------------------------ */
/*  Theme definitions                                                  */
/* ------------------------------------------------------------------ */

const themes: Record<BookTheme, ThemeConfig> = {
  /* ── Default ─────────────────────────────────────────────────────── */
  default: {
    label: 'Default',
    rootClass: '',
    light: {},
    dark: {},
    sidebar: { class: '' },
    content: { class: '', proseClass: 'prose dark:prose-invert prose-headings:text-foreground prose-headings:font-bold prose-headings:tracking-tight prose-h2:text-3xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-foreground prose-p:text-base prose-p:leading-7 prose-li:text-foreground prose-li:text-base prose-code:text-foreground prose-code:text-sm prose-code:bg-muted/50 dark:prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:border prose-code:border-border/50 prose-pre:bg-muted dark:prose-pre:bg-[#0a0a0a] prose-pre:text-foreground prose-pre:border prose-pre:border-border/50 prose-a:text-primary prose-a:font-medium prose-a:no-underline prose-strong:text-foreground prose-blockquote:text-foreground prose-blockquote:border-l-primary' },
    header: { class: '' },
  },

  /* ── Lambda (clean tech — blue accent) ──────────────────────────── */
  lambda: {
    label: 'Lambda',
    rootClass: 'theme-lambda',
    light: {
      '--color-background':           'oklch(1 0 0)',           // pure white
      '--color-foreground':           'oklch(0.10 0.02 250)',   // near-black
      '--color-card':                 'oklch(0.97 0.003 250)',
      '--color-card-foreground':      'oklch(0.10 0.02 250)',
      '--color-popover':              'oklch(1 0 0)',
      '--color-popover-foreground':   'oklch(0.10 0.02 250)',
      '--color-primary':              'oklch(0.50 0.28 250)',   // deep electric blue
      '--color-primary-foreground':   'oklch(1 0 0)',
      '--color-secondary':            'oklch(0.10 0.02 250)',   // near-black
      '--color-secondary-foreground': 'oklch(1 0 0)',           // white
      '--color-muted':                'oklch(0.95 0.005 250)',
      '--color-muted-foreground':     'oklch(0.40 0.02 250)',
      '--color-accent':               'oklch(0.10 0.02 250)',   // full reverse hover bg
      '--color-accent-foreground':    'oklch(1 0 0)',           // full reverse hover text
      '--color-destructive':          'oklch(0.62 0.24 26)',
      '--color-destructive-foreground':'oklch(1 0 0)',
      '--color-border':               'oklch(0.82 0.04 250)',   // blue-tinted border
      '--color-input':                'oklch(0.92 0.01 250)',
      '--color-ring':                 'oklch(0.50 0.28 250)',
    },
    dark: {
      '--color-background':           'oklch(0 0 0)',           // pure black
      '--color-foreground':           'oklch(0.95 0 0)',        // near-white
      '--color-card':                 'oklch(0.06 0.005 250)',  // barely off-black
      '--color-card-foreground':      'oklch(0.95 0 0)',
      '--color-popover':              'oklch(0.06 0.005 250)',
      '--color-popover-foreground':   'oklch(0.95 0 0)',
      '--color-primary':              'oklch(0.65 0.28 250)',   // bright electric blue
      '--color-primary-foreground':   'oklch(0 0 0)',
      '--color-secondary':            'oklch(0.95 0 0)',        // near-white
      '--color-secondary-foreground': 'oklch(0 0 0)',           // black
      '--color-muted':                'oklch(0.12 0.005 250)',
      '--color-muted-foreground':     'oklch(0.55 0.02 250)',
      '--color-accent':               'oklch(0.95 0 0)',        // full reverse hover bg
      '--color-accent-foreground':    'oklch(0 0 0)',           // full reverse hover text
      '--color-destructive':          'oklch(0.62 0.24 26)',
      '--color-destructive-foreground':'oklch(1 0 0)',
      '--color-border':               'oklch(0.25 0.06 250)',   // thin blue-tinted border
      '--color-input':                'oklch(0.15 0.02 250)',
      '--color-ring':                 'oklch(0.65 0.28 250)',
    },
    sidebar: { class: 'border-r-[1px]' },
    content: {
      class: '',
      proseClass: 'prose dark:prose-invert prose-headings:text-foreground prose-headings:font-bold prose-headings:tracking-tight prose-h2:text-3xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-foreground prose-p:text-base prose-p:leading-7 prose-li:text-foreground prose-li:text-base prose-code:text-foreground prose-code:text-sm prose-code:bg-muted/50 dark:prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:border prose-code:border-border/50 prose-pre:bg-muted dark:prose-pre:bg-[#0a0a0a] prose-pre:text-foreground prose-pre:border prose-pre:border-border/50 prose-a:text-primary prose-a:font-medium prose-a:no-underline prose-strong:text-foreground prose-blockquote:text-foreground prose-blockquote:border-l-primary',
    },
    header: { class: '' },
  },

  /* ── Minimal (warm serif) ────────────────────────────────────────── */
  minimal: {
    label: 'Minimal',
    rootClass: 'theme-minimal',
    light: {
      '--color-background':           'oklch(0.985 0.006 85)',
      '--color-foreground':           'oklch(0.22 0.02 55)',
      '--color-card':                 'oklch(0.98 0.006 85)',
      '--color-card-foreground':      'oklch(0.22 0.02 55)',
      '--color-popover':              'oklch(1 0 0)',
      '--color-popover-foreground':   'oklch(0.22 0.02 55)',
      '--color-primary':              'oklch(0.60 0.17 50)',    // warm orange-brown
      '--color-primary-foreground':   'oklch(1 0 0)',
      '--color-secondary':            'oklch(0.94 0.01 85)',
      '--color-secondary-foreground': 'oklch(0.35 0.03 55)',
      '--color-muted':                'oklch(0.94 0.008 85)',
      '--color-muted-foreground':     'oklch(0.50 0.02 55)',
      '--color-accent':               'oklch(0.95 0.012 85)',
      '--color-accent-foreground':    'oklch(0.60 0.17 50)',
      '--color-destructive':          'oklch(0.62 0.24 26)',
      '--color-destructive-foreground':'oklch(1 0 0)',
      '--color-border':               'oklch(0.91 0.01 85)',
      '--color-input':                'oklch(0.93 0.008 85)',
      '--color-ring':                 'oklch(0.60 0.17 50)',
    },
    dark: {
      '--color-background':           'oklch(0.15 0.006 55)',
      '--color-foreground':           'oklch(0.90 0.01 85)',
      '--color-card':                 'oklch(0.19 0.008 55)',
      '--color-card-foreground':      'oklch(0.90 0.01 85)',
      '--color-popover':              'oklch(0.19 0.008 55)',
      '--color-popover-foreground':   'oklch(0.90 0.01 85)',
      '--color-primary':              'oklch(0.68 0.15 55)',    // lighter warm orange
      '--color-primary-foreground':   'oklch(1 0 0)',
      '--color-secondary':            'oklch(0.22 0.012 55)',
      '--color-secondary-foreground': 'oklch(0.80 0.01 85)',
      '--color-muted':                'oklch(0.20 0.008 55)',
      '--color-muted-foreground':     'oklch(0.55 0.02 55)',
      '--color-accent':               'oklch(0.22 0.015 55)',
      '--color-accent-foreground':    'oklch(0.68 0.15 55)',
      '--color-destructive':          'oklch(0.62 0.24 26)',
      '--color-destructive-foreground':'oklch(1 0 0)',
      '--color-border':               'oklch(0.28 0.01 55)',
      '--color-input':                'oklch(0.30 0.01 55)',
      '--color-ring':                 'oklch(0.68 0.15 55)',
    },
    sidebar: { class: '' },
    content: {
      class: 'font-serif',
      proseClass: 'prose prose-stone dark:prose-invert prose-headings:font-sans prose-headings:text-foreground prose-headings:font-bold prose-headings:tracking-tight prose-h2:text-3xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-foreground prose-p:text-base prose-p:leading-7 prose-li:text-foreground prose-li:text-base prose-code:text-foreground prose-code:text-sm prose-code:bg-muted/50 dark:prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:border prose-code:border-border/50 prose-pre:bg-muted dark:prose-pre:bg-[#0a0a0a] prose-pre:text-foreground prose-pre:border prose-pre:border-border/50 prose-a:text-primary prose-a:font-medium prose-a:no-underline prose-strong:text-foreground prose-blockquote:text-foreground prose-blockquote:border-l-primary',
    },
    header: { class: '' },
  },
}

/* ------------------------------------------------------------------ */
/*  Composable                                                         */
/* ------------------------------------------------------------------ */

/** Export the raw themes map for direct color lookup without composable context */
export { themes }

export type BookThemeOverrides = {
  light?: Record<string, string>
  dark?: Record<string, string>
}

/**
 * Get the theme configuration for a book.
 * Reactive to the current color mode — returns the correct CSS variable
 * overrides for light or dark automatically.
 *
 * @param themeOverrides  Per-book overrides from frontmatter. Keys are the
 *   short variable name without the `--color-` prefix (e.g. `primary`,
 *   `background`). Values are any valid CSS color (typically oklch()).
 */
export function useBookTheme(
  themeName?: MaybeRef<string | null | undefined>,
  themeOverrides?: MaybeRef<BookThemeOverrides | null | undefined>,
) {
  const { isDark } = useTheme()

  const name = computed<BookTheme>(() => {
    const raw = toValue(themeName)
    return (raw && raw in themes ? raw : 'default') as BookTheme
  })

  const config = computed(() => themes[name.value])

  /** Inline style string with the active CSS variable overrides */
  const cssVarStyle = computed(() => {
    const baseVars = isDark.value ? config.value.dark : config.value.light
    const overrides = toValue(themeOverrides)
    const overrideMap = overrides
      ? (isDark.value ? overrides.dark : overrides.light) ?? {}
      : {}
    // Prepend --color- to short override keys, then merge on top of base vars
    const overrideVars = Object.fromEntries(
      Object.entries(overrideMap).map(([k, v]) => [`--color-${k}`, v])
    )
    const merged = { ...baseVars, ...overrideVars }
    const entries = Object.entries(merged)
    if (!entries.length) return ''
    return entries.map(([k, v]) => `${k}: ${v}`).join('; ')
  })

  return {
    name,
    config,
    isDark,
    cssVarStyle,
    themes,
  }
}
