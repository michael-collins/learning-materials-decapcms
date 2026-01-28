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
  contentType: 'exercises' | 'tutorials' | 'articles' | 'projects' | 'lectures' | 'lessons',
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
      hasVersion: latestContent?.version,
      version: latestContent?.version,
      hasPublishEmbed: latestContent?.publishEmbed,
      _path: latestContent?._path
    })
    
    if (latestContent) {
      const latestVersion: ContentVersion = {
        version: latestContent.version,
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
        allContent.forEach((item: any) => {
          // Use the slug and id fields which are properly available
          const itemSlug = item.slug || ''
          // Extract filename from id: e.g., "exercises/exercises/3d-viewer-test/v1.0.0.md" -> "v1.0.0.md"
          const fileName = item.id?.split('/').pop() || ''
          const fileNameWithoutExt = fileName.replace('.md', '')
          
          console.log(`[useContentVersions] Checking item: slug=${itemSlug}, fileName=${fileName}, baseSlug=${baseSlug}`)
          
          // Only process items that are in the same slug folder and are version files
          if (itemSlug === baseSlug && fileNameWithoutExt.match(/^v\d+\.\d+\.\d+$/)) {
            console.log(`[useContentVersions] ✓ Found version file: ${fileNameWithoutExt}, versionStatus=${item.versionStatus}`)
            if (item.version && item.publishEmbed && item.versionStatus === 'archived') {
              console.log(`[useContentVersions] ✓ Adding archived version: ${item.version}`)
              versions.value.push({
                version: item.version,
                versionStatus: item.versionStatus || 'archived',
                publishedAt: item.date
              })
            } else {
              console.log(`[useContentVersions] ✗ Skipping - version=${!!item.version}, publishEmbed=${!!item.publishEmbed}, versionStatus=${item.versionStatus}`)
            }
          } else {
            if (itemSlug !== baseSlug) {
              console.log(`[useContentVersions] ✗ Slug mismatch: ${itemSlug} !== ${baseSlug}`)
            }
            if (!fileNameWithoutExt.match(/^v\d+\.\d+\.\d+$/)) {
              console.log(`[useContentVersions] ✗ Not a version file: ${fileNameWithoutExt}`)
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
