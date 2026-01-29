import type { ParsedContent } from '@nuxt/content'

export interface VersionedContent extends ParsedContent {
  version?: string
  versionStatus?: 'latest' | 'archived' | 'deprecated'
  changelog?: string
  breakingChanges?: string[]
  publishEmbed?: boolean
}

/**
 * Resolve content version based on version parameter
 * Supports: latest, major version (e.g., '1'), exact version (e.g., '1.2.0')
 */
export async function resolveContentVersion(
  type: string, 
  slug: string, 
  versionParam?: string
): Promise<VersionedContent | null> {
  const queryContent = useAsyncData ? (await import('#imports')).queryContent : null
  if (!queryContent) {
    throw new Error('queryContent not available')
  }

  // Latest version (default behavior)
  if (!versionParam || versionParam === 'latest') {
    // First, try to get the main file (e.g., animation-basics.md)
    try {
      const mainContent = await queryContent<VersionedContent>(`${type}/${slug}`)
        .findOne()
      
      if (mainContent && mainContent.publishEmbed !== false) {
        return mainContent
      }
    } catch (e) {
      // Main file not found, continue to versioned files
    }

    // If no main file, get the latest versioned file
    const versionedFiles = await queryContent<VersionedContent>(`${type}`)
      .where({ 
        _path: { $regex: `/${type}/${slug}/v\\d+\\.\\d+\\.\\d+$` }
      })
      .sort({ version: -1 })
      .findOne()

    return versionedFiles
  }

  // Major version (e.g., '1' gets latest 1.x.x)
  if (/^\d+$/.test(versionParam)) {
    const majorVersion = parseInt(versionParam)
    
    const versionedFiles = await queryContent<VersionedContent>(`${type}`)
      .where({ 
        _path: { $regex: `/${type}/${slug}/v${majorVersion}\\.\\d+\\.\\d+$` }
      })
      .sort({ version: -1 })
      .findOne()

    return versionedFiles
  }

  // Exact version (e.g., '1.2.0' or 'v1.2.0')
  const versionStr = versionParam.startsWith('v') ? versionParam : `v${versionParam}`
  
  const versionedFile = await queryContent<VersionedContent>(`${type}`)
    .where({ 
      _path: { $regex: `/${type}/${slug}/${versionStr}$` }
    })
    .findOne()

  return versionedFile
}

/**
 * Get all available versions for a content piece
 */
export async function getAvailableVersions(
  type: string,
  slug: string
): Promise<VersionedContent[]> {
  const queryContent = (await import('#imports')).queryContent
  
  const versions = await queryContent<VersionedContent>(`${type}`)
    .where({ 
      _path: { $regex: `/${type}/v\\d+\\.\\d+\\.\\d+$` },
      publishEmbed: true 
    })
    .sort({ version: -1 })
    .find()

  return versions
}

/**
 * Get latest version number for a content piece
 */
export async function getLatestVersionNumber(
  type: string,
  slug: string
): Promise<string | null> {
  const queryContent = (await import('#imports')).queryContent
  
  // Check main file first
  try {
    const mainContent = await queryContent<VersionedContent>(`${type}/${slug}`)
      .where({ _path: { $eq: `/content/${type}/${slug}` } })
      .findOne()
    
    if (mainContent?.version) {
      return mainContent.version
    }
  } catch (e) {
    // Continue to versioned files
  }

  // Check versioned files
  const latestVersion = await queryContent<VersionedContent>(`${type}`)
    .where({ 
      _path: { $regex: `/${type}/v\\d+\\.\\d+\\.\\d+$` },
      publishEmbed: true 
    })
    .sort({ version: -1 })
    .select(['version'])
    .findOne()

  return latestVersion?.version || null
}

/**
 * Parse semantic version string
 */
export function parseVersion(version: string): { major: number; minor: number; patch: number } | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/)
  if (!match) return null
  
  return {
    major: parseInt(match[1]),
    minor: parseInt(match[2]),
    patch: parseInt(match[3])
  }
}

/**
 * Compare two semantic versions
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const parsed1 = parseVersion(v1)
  const parsed2 = parseVersion(v2)
  
  if (!parsed1 || !parsed2) return 0
  
  if (parsed1.major !== parsed2.major) {
    return parsed1.major > parsed2.major ? 1 : -1
  }
  if (parsed1.minor !== parsed2.minor) {
    return parsed1.minor > parsed2.minor ? 1 : -1
  }
  if (parsed1.patch !== parsed2.patch) {
    return parsed1.patch > parsed2.patch ? 1 : -1
  }
  
  return 0
}
