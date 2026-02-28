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
 *   - lambda:  Purple-accented tech aesthetic inspired by lambda.ai
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
    content: { class: '', proseClass: 'prose dark:prose-invert' },
    header: { class: '' },
  },

  /* ── Lambda (cyberpunk tech — inspired by lambda.ai) ──────────── */
  lambda: {
    label: 'Lambda',
    rootClass: 'theme-lambda',
    light: {
      '--color-background':           'oklch(1 0 0)',           // pure white
      '--color-foreground':           'oklch(0.10 0.02 290)',   // near-black
      '--color-card':                 'oklch(0.97 0.003 290)',
      '--color-card-foreground':      'oklch(0.10 0.02 290)',
      '--color-popover':              'oklch(1 0 0)',
      '--color-popover-foreground':   'oklch(0.10 0.02 290)',
      '--color-primary':              'oklch(0.50 0.28 293)',   // deep electric violet
      '--color-primary-foreground':   'oklch(1 0 0)',
      '--color-secondary':            'oklch(0.10 0.02 290)',   // near-black
      '--color-secondary-foreground': 'oklch(1 0 0)',           // white
      '--color-muted':                'oklch(0.95 0.005 290)',
      '--color-muted-foreground':     'oklch(0.40 0.02 290)',
      '--color-accent':               'oklch(0.10 0.02 290)',   // full reverse hover bg
      '--color-accent-foreground':    'oklch(1 0 0)',           // full reverse hover text
      '--color-destructive':          'oklch(0.62 0.24 26)',
      '--color-destructive-foreground':'oklch(1 0 0)',
      '--color-border':               'oklch(0.82 0.04 293)',   // violet-tinted border
      '--color-input':                'oklch(0.92 0.01 290)',
      '--color-ring':                 'oklch(0.50 0.28 293)',
    },
    dark: {
      '--color-background':           'oklch(0 0 0)',           // pure black
      '--color-foreground':           'oklch(0.95 0 0)',        // near-white
      '--color-card':                 'oklch(0.06 0.005 290)',  // barely off-black
      '--color-card-foreground':      'oklch(0.95 0 0)',
      '--color-popover':              'oklch(0.06 0.005 290)',
      '--color-popover-foreground':   'oklch(0.95 0 0)',
      '--color-primary':              'oklch(0.65 0.28 293)',   // bright electric violet
      '--color-primary-foreground':   'oklch(0 0 0)',
      '--color-secondary':            'oklch(0.95 0 0)',        // near-white
      '--color-secondary-foreground': 'oklch(0 0 0)',           // black
      '--color-muted':                'oklch(0.12 0.005 290)',
      '--color-muted-foreground':     'oklch(0.55 0.02 290)',
      '--color-accent':               'oklch(0.95 0 0)',        // full reverse hover bg
      '--color-accent-foreground':    'oklch(0 0 0)',           // full reverse hover text
      '--color-destructive':          'oklch(0.62 0.24 26)',
      '--color-destructive-foreground':'oklch(1 0 0)',
      '--color-border':               'oklch(0.25 0.06 293)',   // thin violet-tinted border
      '--color-input':                'oklch(0.15 0.02 290)',
      '--color-ring':                 'oklch(0.65 0.28 293)',
    },
    sidebar: { class: 'border-r-[1px]' },
    content: {
      class: '',
      proseClass: 'prose dark:prose-invert prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:text-primary/90 prose-code:font-mono prose-headings:tracking-tight',
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
      proseClass: 'prose prose-stone dark:prose-invert prose-headings:font-sans prose-a:text-primary',
    },
    header: { class: '' },
  },
}

/* ------------------------------------------------------------------ */
/*  Composable                                                         */
/* ------------------------------------------------------------------ */

/**
 * Get the theme configuration for a book.
 * Reactive to the current color mode — returns the correct CSS variable
 * overrides for light or dark automatically.
 */
export function useBookTheme(themeName?: MaybeRef<string | null | undefined>) {
  const { isDark } = useTheme()

  const name = computed<BookTheme>(() => {
    const raw = toValue(themeName)
    return (raw && raw in themes ? raw : 'default') as BookTheme
  })

  const config = computed(() => themes[name.value])

  /** Inline style string with the active CSS variable overrides */
  const cssVarStyle = computed(() => {
    const vars = isDark.value ? config.value.dark : config.value.light
    const entries = Object.entries(vars)
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
