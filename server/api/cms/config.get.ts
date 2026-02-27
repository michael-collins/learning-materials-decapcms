/**
 * GET /api/cms/config
 *
 * Returns the parsed CMS configuration.
 * Cached per request — the config.yml is read once and reused.
 */
import { resolveCollections, groupCollections } from '~/lib/cms/config-parser'
import { getCmsConfig } from '~/server/utils/config-parser-server'

let _cachedConfig: any = null

async function buildResponse() {
  const config = await getCmsConfig()
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

export default defineEventHandler(async () => {
  // Cache the parsed config in memory (invalidated on server restart)
  if (!_cachedConfig) {
    _cachedConfig = await buildResponse()
  }
  return _cachedConfig
})
