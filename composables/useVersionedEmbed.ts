import { resolveContentVersion, getLatestVersionNumber } from '~/lib/version-resolver'
import type { VersionedContent } from '~/lib/version-resolver'

/**
 * Composable for versioned embed pages
 * Handles version resolution and provides upgrade notice logic
 */
export function useVersionedEmbed(contentType: string, slug: string) {
  const route = useRoute()
  const versionParam = route.query.version as string | undefined
  
  // Resolve versioned content
  const { data: content } = useAsyncData(
    `${contentType}-${slug}-${versionParam || 'latest'}`,
    async () => {
      // Try version-aware resolution first
      if (versionParam) {
        const versionedContent = await resolveContentVersion(contentType, slug, versionParam)
        if (versionedContent) return versionedContent
      }
      
      // Fallback to standard query
      return queryCollection(contentType).path(`/${contentType}/${slug}`).first()
    },
    {
      lazy: true
    }
  )
  
  // Get latest version for comparison
  const { data: latestVersion } = useAsyncData(
    `${contentType}-latest-version-${slug}`,
    () => getLatestVersionNumber(contentType, slug),
    {
      lazy: true
    }
  )
  
  const currentVersion = computed(() => content.value?.version)
  const isOutdated = computed(() => {
    if (!currentVersion.value || !latestVersion.value) return false
    return currentVersion.value !== latestVersion.value
  })
  
  return {
    content,
    versionParam,
    currentVersion,
    latestVersion,
    isOutdated
  }
}
