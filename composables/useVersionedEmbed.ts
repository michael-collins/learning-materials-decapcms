import { resolveContentVersion, getLatestVersionNumber } from '~/lib/version-resolver'
import type { VersionedContent } from '~/lib/version-resolver'

/**
 * Composable for versioned embed pages
 * Handles version resolution and provides upgrade notice logic
 */
export function useVersionedEmbed(contentType: string, slug: string) {
  const route = useRoute()
  const versionParam = route.query.version as string | undefined
  
  console.log('[useVersionedEmbed] Called with:', { contentType, slug, versionParam })
  
  // Resolve versioned content
  const { data: content } = useAsyncData(
    `${contentType}-${slug}-${versionParam || 'latest'}`,
    async () => {
      console.log('[useVersionedEmbed] Fetching content...')
      
      // If version parameter is provided, try to find versioned content
      if (versionParam && versionParam !== 'latest') {
        console.log('[useVersionedEmbed] Looking for versioned content at:', `/${contentType}/${slug}/v/${versionParam}`)
        
        // Try to find the versioned file in v/ subdirectory
        try {
          const versionedContent = await queryCollection(contentType)
            .path(`/${contentType}/${slug}/v/${versionParam}`)
            .first()
          
          if (versionedContent) {
            console.log('[useVersionedEmbed] Found versioned content')
            return versionedContent
          }
        } catch (e) {
          console.log('[useVersionedEmbed] Versioned content not found, error:', e)
        }
      }
      
      // Fallback to standard query for latest or if versioned not found
      console.log('[useVersionedEmbed] Trying standard query at path:', `/${contentType}/${slug}`)
      const result = await queryCollection(contentType).path(`/${contentType}/${slug}`).first()
      console.log('[useVersionedEmbed] Standard query result:', result ? 'found' : 'null')
      return result
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
