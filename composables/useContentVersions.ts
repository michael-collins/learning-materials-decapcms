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
    console.log(`[useContentVersions] Fetching versions for ${contentType}/${slug} (baseSlug: ${baseSlug})`)
    
    // Fetch the latest version - try both versioned folder (index.md) and flat file structures
    let latestContent = null
    
    // First try the versioned folder structure: /exercises/3d-viewer-test/index
    let contentPath = `/${contentType}/${baseSlug}/index`
    console.log(`[useContentVersions] Querying versioned content at path: ${contentPath}`)
    latestContent = await queryCollection(contentType).path(contentPath).first()
    
    // If not found, try flat file: /exercises/3d-viewer-test
    if (!latestContent) {
      contentPath = `/${contentType}/${baseSlug}`
      console.log(`[useContentVersions] Versioned path not found, trying flat file at: ${contentPath}`)
      latestContent = await queryCollection(contentType).path(contentPath).first()
    }
    
    console.log(`[useContentVersions] Latest content result:`, {
      found: !!latestContent,
      hasVersion: latestContent?.version || latestContent?.meta?.version,
      version: latestContent?.version || latestContent?.meta?.version,
      hasPublishEmbed: latestContent?.publishEmbed || latestContent?.meta?.publishEmbed,
      _path: latestContent?._path
    })
    
    if (latestContent) {
      const latestVersion: ContentVersion = {
        version: latestContent.version || latestContent.meta?.version || '1.0.0',
        versionStatus: 'latest',
        publishedAt: latestContent.date
      }
      versions.value.push(latestVersion)
      console.log(`[useContentVersions] Added latest version: ${latestVersion.version}`)
    }

    // Fetch all archived versions from the same slug folder
    try {
      console.log(`[useContentVersions] Searching for archived versions in ${contentType}/${baseSlug}`)
      
      // Query all items in the collection
      const allContent = await queryCollection(contentType).all()
      
      console.log(`[useContentVersions] Found ${allContent?.length || 0} total items in collection`)
      if (allContent?.length > 0) {
        console.log(`[useContentVersions] Sample item:`, allContent[0])
      }
      
      if (allContent && Array.isArray(allContent)) {
        // Get the latest version number to avoid duplicates
        const latestVersionNumber = latestContent?.version || latestContent?.meta?.version
        
        allContent.forEach((item: any) => {
          // Extract slug from id path: e.g., "exercises/exercises/3d-viewer-test/v/1.0.0.md"
          // Pattern: {type}/{type}/{slug}/v/{version}.md or {type}/{type}/{slug}/index.md
          const idParts = item.id?.split('/') || []
          const fileName = idParts.pop() || ''
          const fileNameWithoutExt = fileName.replace('.md', '')
          const parentFolder = idParts[idParts.length - 1] || ''
          
          // Extract slug from path - it's the part before /v/ or the filename
          // For "exercises/exercises/3d-viewer-test/v/1.0.0.md", slug is "3d-viewer-test"
          const itemSlug = parentFolder === 'v' ? idParts[idParts.length - 2] : ''
          
          // Only process items that are in the same slug folder, in v/ subdirectory, and are version files
          if (itemSlug === baseSlug && parentFolder === 'v' && fileNameWithoutExt.match(/^\d+\.\d+\.\d+$/)) {
            // Get version from item.version or item.meta.version
            const itemVersion = item.version || item.meta?.version
            const itemAllowEmbed = item.allowEmbed || item.meta?.allowEmbed
            const itemVersionStatus = item.versionStatus || item.meta?.versionStatus
            
            console.log(`[useContentVersions] Checking archived version ${fileNameWithoutExt}:`, {
              itemVersion,
              itemAllowEmbed,
              itemVersionStatus,
              latestVersionNumber,
              sameAsLatest: itemVersion === latestVersionNumber
            })
            
            // Skip if this archived version has the same version number as the latest
            if (itemVersion === latestVersionNumber) {
              console.log(`[useContentVersions] ✗ Skipping ${itemVersion}: same as latest`)
              return
            }
            
            if (itemVersion && itemAllowEmbed && itemVersionStatus === 'archived') {
              console.log(`[useContentVersions] ✓ Adding archived version: ${itemVersion}`)
              versions.value.push({
                version: itemVersion,
                versionStatus: itemVersionStatus || 'archived',
                publishedAt: item.date
              })
            } else {
              console.log(`[useContentVersions] ✗ Skipping ${itemVersion}: missing required fields`)
            }
          }
        })
      }
    } catch (e) {
      console.warn('[useContentVersions] Could not fetch archived versions:', e)
      // Don't fail completely if archived versions can't be fetched
    }

    // Sort versions with 'latest' first, then semantic versions in descending order
    versions.value.sort((a, b) => {
      if (a.version === 'latest') return -1
      if (b.version === 'latest') return 1
      
      // Parse semantic versions for comparison
      const parseVersion = (v: string) => {
        if (!v || typeof v !== 'string') return { major: 0, minor: 0, patch: 0 }
        const parts = v.split('.').map(Number)
        return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 }
      }
      
      const aV = parseVersion(a.version)
      const bV = parseVersion(b.version)
      
      if (aV.major !== bV.major) return bV.major - aV.major
      if (aV.minor !== bV.minor) return bV.minor - aV.minor
      return bV.patch - aV.patch
    })
    
    console.log(`[useContentVersions] Final versions:`, versions.value)
  } catch (e) {
    console.error('[useContentVersions] Error fetching versions:', e)
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
