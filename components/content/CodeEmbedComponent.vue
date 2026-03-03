<script setup lang="ts">
/**
 * CodeEmbedComponent — Embeds code playgrounds from CodePen, JSFiddle, CodeSandbox,
 * StackBlitz, Replit, and Glitch.
 */
interface Props {
  provider: string
  src: string
  title?: string
  height?: string
  caption?: string
  credit?: string
  creditUrl?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Code Example',
  height: '400',
})

const embedUrl = computed(() => {
  const raw = props.src?.trim() || ''
  const prov = props.provider?.trim().toLowerCase() || ''
  if (!raw) return ''

  switch (prov) {
    case 'codepen': {
      if (raw.includes('codepen.io')) {
        try {
          const url = new URL(raw)
          const embedPath = url.pathname.replace(/\/pen\//, '/embed/')
          return `https://codepen.io${embedPath}?default-tab=result`
        } catch { return '' }
      }
      if (raw.includes('/')) {
        const [user, pen] = raw.split('/')
        return `https://codepen.io/${user}/embed/${pen}?default-tab=result`
      }
      return ''
    }

    case 'jsfiddle': {
      if (raw.includes('jsfiddle.net')) return raw.replace(/\/?$/, '/embedded/')
      return `https://jsfiddle.net/${raw}/embedded/`
    }

    case 'codesandbox': {
      if (raw.includes('codesandbox.io')) {
        try {
          const url = new URL(raw)
          const id = url.pathname.split('/s/')[1]?.split('/')[0]
          return id ? `https://codesandbox.io/embed/${id}` : ''
        } catch { return '' }
      }
      return `https://codesandbox.io/embed/${raw}`
    }

    case 'stackblitz': {
      if (raw.includes('stackblitz.com')) return raw.includes('/embed') ? raw : raw.replace(/\/?$/, '?embed=1')
      return `https://stackblitz.com/edit/${raw}?embed=1`
    }

    case 'replit': {
      if (raw.includes('replit.com') || raw.includes('repl.it')) return raw.includes('?embed=true') ? raw : raw.replace(/\/?$/, '?embed=true')
      return `https://replit.com/${raw}?embed=true`
    }

    case 'glitch': {
      if (raw.includes('glitch.com')) return raw.includes('/embed') ? raw : raw.replace(/\/?$/, '/embed')
      return `https://glitch.com/embed/#!/embed/${raw}`
    }

    default:
      // Try using raw as a direct URL
      try {
        new URL(raw)
        return raw
      } catch { return '' }
  }
})

const heightPx = computed(() => {
  const h = props.height?.replace(/px$/, '') || '400'
  return /^\d+$/.test(h) ? `${h}px` : h
})
</script>

<template>
  <div class="code-embed-wrapper my-8">
    <div v-if="embedUrl" class="rounded-lg overflow-hidden border border-border bg-muted/30" :style="{ height: heightPx }">
      <iframe
        :src="embedUrl"
        :title="title"
        class="w-full h-full border-0"
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
      />
    </div>
    <div v-else class="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive">
      Invalid or missing code embed URL
    </div>
    <MediaCaption
      v-if="embedUrl"
      :title="title"
      :caption="caption"
      :credit="credit"
      :credit-url="creditUrl"
      component-type="code-embed"
    />
  </div>
</template>

<style scoped>
.code-embed-wrapper {
  max-width: 100%;
}
</style>
