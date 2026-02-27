/**
 * Server-only CMS config parser.
 *
 * This file uses Node.js `fs` and `path` modules and must
 * only be imported from server-side code (server/, api/).
 *
 * Two variants:
 * - parseCmsConfigFromFile() — synchronous, local filesystem (dev only)
 * - getCmsConfig()           — async, tries filesystem first then falls
 *                               back to runtimeConfig.cmsConfigYaml
 *                               (works on Netlify production)
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { CmsConfig } from '~/lib/cms/config-types'
import { parseCmsConfigYaml } from '~/lib/cms/config-parser'

const DEFAULT_CONFIG_PATH = 'cms/config.yml'

/**
 * Parse a CMS config.yml file and return the typed config.
 * Works on the server side (Node.js) — reads from filesystem.
 *
 * NOTE: This only works in development or build-time. On Netlify
 * production, the filesystem may not have cms/config.yml. Use
 * getCmsConfig() instead for production-safe access.
 */
export function parseCmsConfigFromFile(configPath?: string): CmsConfig {
  const resolvedPath = resolve(process.cwd(), configPath || DEFAULT_CONFIG_PATH)
  const raw = readFileSync(resolvedPath, 'utf-8')
  return parseCmsConfigYaml(raw)
}

/** In-memory cache for the parsed config */
let _configCache: CmsConfig | null = null

/**
 * Get CMS config — production-safe (async).
 *
 * Resolution order:
 * 1. In-memory cache (fastest, survives across requests in same process)
 * 2. Local filesystem (works in dev / build-time)
 * 3. runtimeConfig.cmsConfigYaml (inlined at build-time, works on Netlify)
 *
 * Throws if config cannot be loaded from any source.
 */
export async function getCmsConfig(configPath?: string): Promise<CmsConfig> {
  if (_configCache) return _configCache

  // Try local filesystem first (development mode)
  const resolvedPath = resolve(process.cwd(), configPath || DEFAULT_CONFIG_PATH)
  if (existsSync(resolvedPath)) {
    try {
      const raw = readFileSync(resolvedPath, 'utf-8')
      _configCache = parseCmsConfigYaml(raw)
      return _configCache
    } catch {
      // Fall through to runtimeConfig
    }
  }

  // Fall back to runtimeConfig (production / Netlify)
  // The YAML string is inlined at build time in nuxt.config.ts
  try {
    const runtimeConfig = useRuntimeConfig()
    const yamlStr = runtimeConfig.cmsConfigYaml as string
    if (yamlStr) {
      _configCache = parseCmsConfigYaml(yamlStr)
      return _configCache
    }
  } catch {
    // runtimeConfig not available
  }

  throw new Error(
    'CMS config not found. Checked filesystem and runtimeConfig.'
  )
}
