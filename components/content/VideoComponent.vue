<script setup lang="ts">
/**
 * VideoComponent — Unified video embed for YouTube, Vimeo, Kaltura, Dailymotion, etc.
 * Accepts a URL (or bare YouTube ID) and auto-detects the provider to build the correct embed URL.
 */
interface Props {
  src: string
  title?: string
  caption?: string
  credit?: string
  creditUrl?: string
  align?: 'left' | 'center' | 'right' | 'full'
  size?: 'small' | 'medium' | 'large' | 'full'
  float?: 'left' | 'right' | 'none'
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Video',
})

const embedUrl = computed(() => {
  let url = props.src?.trim() || ''
  if (!url) return ''

  // Bare YouTube ID (11 chars)
  if (/^[\w-]{11}$/.test(url)) {
    return `https://www.youtube-nocookie.com/embed/${url}`
  }

  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')

    // YouTube
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      const v = parsed.searchParams.get('v')
      const list = parsed.searchParams.get('list')
      if (v) {
        // Single video — optionally also attach a playlist context
        const embedParams = new URLSearchParams({ v })
        if (list) embedParams.set('list', list)
        return `https://www.youtube-nocookie.com/embed/${v}?${embedParams.toString()}`
      }
      if (parsed.pathname.startsWith('/embed/')) return `https://www.youtube-nocookie.com${parsed.pathname}${parsed.search}`
      // Playlist-only URL (e.g. youtube.com/playlist?list=...)
      if (list) {
        return `https://www.youtube-nocookie.com/embed/videoseries?list=${list}`
      }
    }
    if (host === 'youtu.be') {
      const id = parsed.pathname.slice(1).split('/')[0]
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`
    }

    // Vimeo
    if (host === 'vimeo.com') {
      const vimeoId = parsed.pathname.match(/\/(\d+)/)?.[1]
      if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}`
    }
    if (host === 'player.vimeo.com') return url

    // Dailymotion
    if (host === 'dailymotion.com') {
      const dmId = parsed.pathname.match(/\/video\/([a-zA-Z0-9]+)/)?.[1]
      if (dmId) return `https://www.dailymotion.com/embed/video/${dmId}`
    }
    if (host === 'dai.ly') {
      const id = parsed.pathname.slice(1)
      if (id) return `https://www.dailymotion.com/embed/video/${id}`
    }

    // Kaltura — already an embed URL or media space URL
    if (host.includes('kaltura.com')) return url

    // Panopto
    if (host.includes('panopto.com')) return url

    // Wistia
    if (host === 'fast.wistia.net' || host.includes('wistia.com')) return url
  } catch {
    // Not a valid URL
  }

  // Fallback: return as-is (may be a direct embed URL already)
  return url
})
const { layoutClasses } = useMdcLayout(props)
</script>

<template>
  <div class="video-wrapper my-8" :class="layoutClasses">
    <div v-if="embedUrl" class="relative w-full overflow-hidden rounded-lg" style="padding-top: 56.25%;">
      <iframe
        :src="embedUrl"
        :title="title"
        class="absolute top-0 left-0 w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      />
    </div>
    <div v-else class="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive">
      Invalid or missing video URL
    </div>
    <MediaCaption
      v-if="embedUrl"
      :title="title"
      :caption="caption"
      :credit="credit"
      :credit-url="creditUrl"
      component-type="video"
    />
  </div>
</template>
