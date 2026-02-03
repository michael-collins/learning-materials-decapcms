export interface ContentVersion {
  version: string
  versionStatus?: 'latest' | 'archived' | 'deprecated'
  publishedAt?: string
}

/**
 * Composable to fetch all available versions of a content item
 * Includes the latest version and all archived versions from the same slug folder
 */
export const useContentVersions = async (
  contentType: 'exercises' | 'tutorials' | 'articles' | 'projects' | 'lectures' | 'lessons' | 'specializations' | 'pathways',
  slug: string
) => {
  const versions = ref<ContentVersion[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  try {
    // Extract base slug (remove any /v*.*.* version path)
    const baseSlug = slug.split('/')[0]
    
    // Fetch the latest version - try both versioned folder (index.md) and flat file structures
    let latestContent = null
    
    // First try the versioned folder structure: /exercises/3d-viewer-test/index
    let contentPath = `/${contentType}/${baseSlug}/index`
    latestContent = await queryCollection(contentType).path(contentPath).first()
    
    // If not found, try flat file: /exercises/3d-viewer-test
    if (!latestContent) {
      contentPath = `/${contentType}/${baseSlug}`
      latestContent = await queryCollection(contentType).path(contentPath).first()
    }
    
    if (latestContent) {
      const latestVersion: ContentVersion = {
        version: latestContent.version || latestContent.meta?.version,
        versionStatus: 'latest',
        publishedAt: latestContent.date
      }
      versions.value.push(latestVersion)
    }

    // Fetch all archived versions from the same slug folder
    try {
      // Query all items in the collection
      const allContent = await queryCollection(contentType).all()
      
      if (allContent && Array.isArray(allContent)) {
        // Get the latest version number to avoid duplicates
        const latestVersionNumber = latestContent?.version || latestContent?.meta?.version
        
        allContent.forEach((item: any) => {
          // Use the slug and id fields which are properly available
          const itemSlug = item.slug || ''
          // Extract path from id: e.g., "exercises/exercises/3d-viewer-test/v/1.0.0.md" -> check if in v/ folder
          const idParts = item.id?.split('/') || []
          const fileName = idParts.pop() || ''
          const fileNameWithoutExt = fileName.replace('.md', '')
          const parentFolder = idParts[idParts.length - 1] || ''
          
          // Only process items that are in the same slug folder, in v/ subdirectory, and are version files
          if (itemSlug === baseSlug && parentFolder === 'v' && fileNameWithoutExt.match(/^\d+\.\d+\.\d+$/)) {
            // Get version from item.version or item.meta.version
            const itemVersion = item.version || item.meta?.version
            const itemPublishEmbed = item.publishEmbed || item.meta?.publishEmbed
            const itemVersionStatus = item.versionStatus || item.meta?.versionStatus
            
            // Skip if this archived version has the same version number as the latest
            if (itemVersion === latestVersionNumber) {
              return
            }
            
            if (itemVersion && itemPublishEmbed && itemVersionStatus === 'archived') {
              versions.value.push({
                version: itemVersion,
                versionStatus: itemVersionStatus || 'archived',
                publishedAt: item.date
              })
            }
          }
        })
      }
    } catch (e) {

      // Don't fail completely if archived versions can't be fetched
    }

    // Sort versions with 'latest' first, then semantic versions in descending order
    versions.value.sort((a, b) => {
      if (a.version === 'latest') return -1
      if (b.version === 'latest') return 1
      
      // Parse semantic versions for comparison
      const parseVersion = (v: string) => {
        const parts = v.split('.').map(Number)
        return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 }
      }
      
      const aV = parseVersion(a.version)
      const bV = parseVersion(b.version)
      
      if (aV.major !== bV.major) return bV.major - aV.major
      if (aV.minor !== bV.minor) return bV.minor - aV.minor
      return bV.patch - aV.patch
    })
  } catch (e) {
    error.value = 'Failed to load versions'
  } finally {
    loading.value = false
  }

  return {
    versions: computed(() => versions.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value)
  }
}
