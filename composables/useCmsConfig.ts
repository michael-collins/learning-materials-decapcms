/**
 * Composable for accessing the CMS configuration.
 *
 * Fetches the parsed Decap config from the server API and provides
 * reactive access to collections, groups, and config metadata.
 */
import type { CmsCollection } from '~/lib/cms/config-types'
import type { CollectionGroup } from '~/lib/cms/config-parser'

interface CmsConfigResponse {
  backend: {
    name: string
    repo: string
    branch: string
  }
  localBackend: boolean
  publishMode: string
  mediaFolder: string
  publicFolder: string
  collections: CmsCollection[]
  groups: CollectionGroup[]
}

export function useCmsConfig() {
  const { data: config, status, error, refresh } = useFetch<CmsConfigResponse>('/api/cms/config', {
    key: 'cms-config',
    // Cache across navigations
    getCachedData(key, nuxtApp) {
      return nuxtApp.payload.data[key] || nuxtApp.static.data[key]
    }
  })

  const collections = computed(() => config.value?.collections ?? [])
  const groups = computed(() => config.value?.groups ?? [])

  /**
   * Find a collection by name
   */
  function getCollection(name: string): CmsCollection | undefined {
    return collections.value.find((c) => c.name === name)
  }

  /**
   * Get the Nuxt Content path for a collection
   */
  function getContentPath(collectionName: string): string {
    const col = getCollection(collectionName)
    return col?.contentPath ?? collectionName
  }

  /**
   * Get the Decap admin URL for a collection (fallback editing)
   */
  function getDecapUrl(collectionName: string, slug?: string): string {
    if (slug) {
      return `/admin/#/collections/${collectionName}/entries/${slug}/index`
    }
    return `/admin/#/collections/${collectionName}`
  }

  return {
    config,
    status,
    error,
    refresh,
    collections,
    groups,
    getCollection,
    getContentPath,
    getDecapUrl,
  }
}
