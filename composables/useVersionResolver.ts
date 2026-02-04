import type { ParsedContent } from '@nuxt/content'

export interface VersionedContent extends ParsedContent {
  version?: string
  versionStatus?: 'latest' | 'archived' | 'deprecated'
  changelog?: string
  breakingChanges?: string[]
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
  console.log('[version-resolver] resolveContentVersion called:', { type, slug, versionParam })

  // Latest version (default behavior)
  if (!versionParam || versionParam === 'latest') {
    // First, try to get the main file (e.g., animation-basics.md)
    try {
      const mainContent = await queryCollection(type).path(`/${type}/${slug}`).first()
      
      if (mainContent) {
        return mainContent
      }
    } catch (e) {
      // Main file not found, continue to versioned files
    }

    // If no main file, get the latest versioned file from v/ subdirectory
    const versionedFiles = await queryCollection(type)
      .where({ 
        _path: { $regex: `/${type}/${slug}/v/\\d+\\.\\d+\\.\\d+$` }
      })
      .sort({ version: -1 })
      .first()

    return versionedFiles
  }

  // Major version (e.g., '1' gets latest 1.x.x) from v/ subdirectory
  if (/^\d+$/.test(versionParam)) {
    const majorVersion = parseInt(versionParam)
    
    const versionedFiles = await queryCollection(type)
      .where({ 
        _path: { $regex: `/${type}/${slug}/v/${majorVersion}\\.\\d+\\.\\d+$` }
      })
      .sort({ version: -1 })
      .first()

    return versionedFiles
  }

  // Exact version (e.g., '1.2.0' or 'v1.2.0') from v/ subdirectory
  const versionStr = versionParam.startsWith('v') ? versionParam.substring(1) : versionParam
  
  const versionPath = `/${type}/${slug}/v/${versionStr}`
  console.log('[version-resolver] Looking for exact version with path:', { type, slug, versionParam, versionPath })
  
  try {
    const versionedFile = await queryCollection(type).path(versionPath).first()

    console.log('[version-resolver] Exact version result:', versionedFile ? `Found: ${versionedFile.title} (version: ${versionedFile.version})` : 'Not found')
    
    return versionedFile
  } catch (error) {
    console.error('[version-resolver] Error querying:', error)
    return null
  }
}

/**
 * Get all available versions for a content piece
 */
export async function getAvailableVersions(
  type: string,
  slug: string
): Promise<VersionedContent[]> {
  const versions = await queryCollection(type)
    .where({ 
      _path: { $regex: `/${type}/${slug}/v/\\d+\\.\\d+\\.\\d+$` }
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
  // Check main file first
  try {
    const mainContent = await queryCollection(type).path(`/${type}/${slug}`).first()
    
    if (mainContent?.version) {
      return mainContent.version
    }
  } catch (e) {
    // Continue to versioned files
  }

  // Check versioned files in v/ subdirectory
  const latestVersion = await queryCollection(type)
    .where({ 
      _path: { $regex: `/${type}/${slug}/v/\\d+\\.\\d+\\.\\d+$` }
    })
    .sort({ version: -1 })
    .first()

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
