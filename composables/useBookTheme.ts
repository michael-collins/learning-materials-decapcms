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

  /* ── Lambda (purple tech) ────────────────────────────────────────── */
  lambda: {
    label: 'Lambda',
    rootClass: 'theme-lambda',
    light: {
      '--color-background':           'oklch(0.985 0.007 290)',
      '--color-foreground':           'oklch(0.18 0.02 290)',
      '--color-card':                 'oklch(0.97 0.01 290)',
      '--color-card-foreground':      'oklch(0.18 0.02 290)',
      '--color-popover':              'oklch(1 0 0)',
      '--color-popover-foreground':   'oklch(0.18 0.02 290)',
      '--color-primary':              'oklch(0.53 0.26 293)',   // violet-600
      '--color-primary-foreground':   'oklch(1 0 0)',
      '--color-secondary':            'oklch(0.94 0.02 290)',
      '--color-secondary-foreground': 'oklch(0.30 0.05 290)',
      '--color-muted':                'oklch(0.94 0.012 290)',
      '--color-muted-foreground':     'oklch(0.45 0.03 290)',
      '--color-accent':               'oklch(0.95 0.02 290)',
      '--color-accent-foreground':    'oklch(0.53 0.26 293)',
      '--color-destructive':          'oklch(0.62 0.24 26)',
      '--color-destructive-foreground':'oklch(1 0 0)',
      '--color-border':               'oklch(0.91 0.015 290)',
      '--color-input':                'oklch(0.93 0.01 290)',
      '--color-ring':                 'oklch(0.53 0.26 293)',
    },
    dark: {
      '--color-background':           'oklch(0.13 0.005 290)',
      '--color-foreground':           'oklch(0.93 0.005 290)',
      '--color-card':                 'oklch(0.17 0.008 290)',
      '--color-card-foreground':      'oklch(0.93 0.005 290)',
      '--color-popover':              'oklch(0.17 0.008 290)',
      '--color-popover-foreground':   'oklch(0.93 0.005 290)',
      '--color-primary':              'oklch(0.58 0.24 293)',   // slightly lighter violet
      '--color-primary-foreground':   'oklch(1 0 0)',
      '--color-secondary':            'oklch(0.22 0.03 290)',
      '--color-secondary-foreground': 'oklch(0.80 0.03 290)',
      '--color-muted':                'oklch(0.20 0.005 290)',
      '--color-muted-foreground':     'oklch(0.55 0.02 290)',
      '--color-accent':               'oklch(0.22 0.04 290)',
      '--color-accent-foreground':    'oklch(0.58 0.24 293)',
      '--color-destructive':          'oklch(0.62 0.24 26)',
      '--color-destructive-foreground':'oklch(1 0 0)',
      '--color-border':               'oklch(0.28 0.015 290)',
      '--color-input':                'oklch(0.30 0.02 290)',
      '--color-ring':                 'oklch(0.58 0.24 293)',
    },
    sidebar: { class: '' },
    content: {
      class: '',
      proseClass: 'prose dark:prose-invert prose-a:text-primary prose-code:text-primary/80',
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
