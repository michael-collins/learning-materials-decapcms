/**
 * CMS config.yml parser
 *
 * Reads the existing config.yml and transforms it into typed
 * collection/field definitions used by the custom CMS UI.
 */
import { parse as parseYaml } from 'yaml'
import type {
  CmsConfig,
  CmsCollectionDef,
  CmsFieldDef,
  CmsCollection,
} from './config-types'

// ─── Parse raw YAML ─────────────────────────────────────────────

/**
 * Parse a CMS config from a raw YAML string.
 * Can be used client-side when the config is fetched via API.
 */
export function parseCmsConfigYaml(yamlContent: string): CmsConfig {
  const parsed = parseYaml(yamlContent) as CmsConfig

  if (!parsed || !parsed.backend || !parsed.collections) {
    throw new Error('Invalid CMS config: missing required fields (backend, collections)')
  }

  return parsed
}

// ─── Resolve collections for CMS UI ─────────────────────────────

/**
 * Enhance raw CMS collections with computed metadata
 * useful for the CMS UI (URLs, content paths, etc.)
 */
export function resolveCollections(config: CmsConfig): CmsCollection[] {
  return config.collections.map((col) => resolveCollection(col))
}

function resolveCollection(col: CmsCollectionDef): CmsCollection {
  const isFolderCollection = !!col.folder
  const isFileCollection = !!col.files && col.files.length > 0

  // Derive the content path for Nuxt Content queries
  // e.g., folder: "content/articles" → contentPath: "articles"
  const contentPath = col.folder
    ? col.folder.replace(/^content\//, '')
    : col.name

  return {
    ...col,
    isFolderCollection,
    isFileCollection,
    contentPath,
    cmsUrl: `/cms/${col.name}`,
  }
}

// ─── Field utilities ────────────────────────────────────────────

/**
 * Get frontmatter fields (everything except the body/markdown field)
 */
export function getFrontmatterFields(fields: CmsFieldDef[]): CmsFieldDef[] {
  return fields.filter((f) => f.widget !== 'markdown' && f.name !== 'body')
}

/**
 * Get the body field (markdown widget named 'body')
 */
export function getBodyField(fields: CmsFieldDef[]): CmsFieldDef | undefined {
  return fields.find((f) => f.widget === 'markdown' || f.name === 'body')
}

/**
 * Get visible fields (not hidden widgets)
 */
export function getVisibleFields(fields: CmsFieldDef[]): CmsFieldDef[] {
  return fields.filter((f) => f.widget !== 'hidden')
}

/**
 * Get all widget types used across all collections
 */
export function getUsedWidgetTypes(config: CmsConfig): Set<string> {
  const types = new Set<string>()

  function walkFields(fields: CmsFieldDef[]) {
    for (const field of fields) {
      types.add(field.widget)
      if (field.fields) walkFields(field.fields)
      if (field.field) types.add(field.field.widget)
      if (field.types) {
        for (const type of field.types) {
          if (type.fields) walkFields(type.fields)
        }
      }
    }
  }

  for (const col of config.collections) {
    if (col.fields) walkFields(col.fields)
    if (col.files) {
      for (const file of col.files) {
        if (file.fields) walkFields(file.fields)
      }
    }
  }

  return types
}

/**
 * Find a collection by name
 */
export function findCollection(
  config: CmsConfig,
  name: string
): CmsCollectionDef | undefined {
  return config.collections.find((c) => c.name === name)
}

/**
 * Get the slug pattern for a collection.
 * Returns the slug template string (e.g., '{{slug}}')
 */
export function getSlugPattern(col: CmsCollectionDef): string {
  return col.slug || '{{slug}}'
}

/**
 * Get the file path pattern for a collection.
 * Returns the path template (e.g., '{{slug}}/index')
 */
export function getPathPattern(col: CmsCollectionDef): string | undefined {
  return col.path
}

/**
 * Get the identifier field name for a collection.
 * Defaults to 'title' if not specified.
 */
export function getIdentifierField(col: CmsCollectionDef): string {
  return col.identifier_field || 'title'
}

// ─── Collection grouping for navigation ─────────────────────────

export interface CollectionGroup {
  label: string
  collections: CmsCollection[]
}

/**
 * Group collections into logical categories for sidebar nav.
 * Uses a predefined grouping based on the OER content model.
 */
export function groupCollections(collections: CmsCollection[]): CollectionGroup[] {
  const groups: CollectionGroup[] = []

  const contentTypes = ['articles', 'tutorials', 'lectures', 'exercises', 'projects']
  const curriculum = ['lessons', 'specializations', 'pathways']
  const assessment = ['rubrics']
  const other = ['docs', 'resources']

  const contentGroup = collections.filter((c) => contentTypes.includes(c.name))
  const curriculumGroup = collections.filter((c) => curriculum.includes(c.name))
  const assessmentGroup = collections.filter((c) => assessment.includes(c.name))
  const otherGroup = collections.filter((c) => other.includes(c.name))
  const ungrouped = collections.filter(
    (c) =>
      !contentTypes.includes(c.name) &&
      !curriculum.includes(c.name) &&
      !assessment.includes(c.name) &&
      !other.includes(c.name)
  )

  if (contentGroup.length) groups.push({ label: 'Content', collections: contentGroup })
  if (curriculumGroup.length) groups.push({ label: 'Curriculum', collections: curriculumGroup })
  if (assessmentGroup.length) groups.push({ label: 'Assessment', collections: assessmentGroup })
  if (otherGroup.length) groups.push({ label: 'Other', collections: otherGroup })
  if (ungrouped.length) groups.push({ label: 'Uncategorized', collections: ungrouped })

  return groups
}
