/**
 * GET /api/cms/config
 *
 * Returns the parsed Decap CMS configuration.
 * Cached per request — the config.yml is read once and reused.
 */
import { parseDecapConfigFromFile, resolveCollections, groupCollections } from '~/lib/cms/config-parser'

let _cachedConfig: ReturnType<typeof buildResponse> | null = null

function buildResponse() {
  const config = parseDecapConfigFromFile()
  const collections = resolveCollections(config)
  const groups = groupCollections(collections)

  return {
    backend: config.backend,
    localBackend: config.local_backend ?? false,
    publishMode: config.publish_mode ?? 'simple',
    mediaFolder: config.media_folder,
    publicFolder: config.public_folder,
    collections,
    groups,
  }
}

export default defineEventHandler(() => {
  // Cache the parsed config in memory (invalidated on server restart)
  if (!_cachedConfig) {
    _cachedConfig = buildResponse()
  }
  return _cachedConfig
})
