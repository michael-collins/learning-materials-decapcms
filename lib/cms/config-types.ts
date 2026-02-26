/**
 * TypeScript type definitions for CMS config.yml
 * These types map 1:1 to the CMS config specification.
 */

// ─── Widget Types ──────────────────────────────────────────────
export type CmsWidgetType =
  | 'string'
  | 'text'
  | 'markdown'
  | 'number'
  | 'boolean'
  | 'select'
  | 'datetime'
  | 'date'
  | 'image'
  | 'file'
  | 'list'
  | 'object'
  | 'relation'
  | 'hidden'
  | 'version_select'
  | 'color'
  | 'map'
  | 'code'

// ─── Field Definition ──────────────────────────────────────────
export interface CmsFieldDef {
  /** Display label in the editor */
  label: string
  /** Field key in frontmatter */
  name: string
  /** Widget type that determines the editor component */
  widget: CmsWidgetType
  /** Whether the field is required (defaults to true in the CMS) */
  required?: boolean
  /** Default value */
  default?: unknown
  /** Helper text shown below the field */
  hint?: string
  /** Validation pattern: [regex, errorMessage] */
  pattern?: [string, string]

  // ─── Select widget ─────────────────────────────────
  /** Options for select widget */
  options?: string[] | Array<{ label: string; value: string }>
  /** Allow multiple selections (select widget) */
  multiple?: boolean

  // ─── List widget ───────────────────────────────────
  /** Single field definition for simple lists (e.g., tags) */
  field?: CmsFieldDef
  /** Fixed field definitions per list item */
  fields?: CmsFieldDef[]
  /** Polymorphic type definitions for typed lists (e.g., prerequisites) */
  types?: CmsListTypeDef[]
  /** Allow adding new items to list */
  allow_add?: boolean

  // ─── Relation widget ──────────────────────────────
  /** Collection to reference */
  collection?: string
  /** Field to store as the value (supports template syntax e.g. {{slug}}) */
  value_field?: string
  /** Fields to search against */
  search_fields?: string[]
  /** Fields to display in the picker */
  display_fields?: string[]

  // ─── Version select widget ─────────────────────────
  /** Name of the sibling relation field to read the selected slug from */
  relation_field?: string

  // ─── Number widget ────────────────────────────────
  min?: number
  max?: number
  step?: number
  value_type?: 'int' | 'float'
}

// ─── Typed List Entry ──────────────────────────────────────────
export interface CmsListTypeDef {
  /** Display label for this type option */
  label: string
  /** Type identifier (used as discriminator) */
  name: string
  /** Widget type (usually 'object') */
  widget: string
  /** Fields for this type */
  fields: CmsFieldDef[]
}

// ─── View Filter ───────────────────────────────────────────────
export interface CmsViewFilter {
  label: string
  field: string
  pattern: string | boolean
}

// ─── Sort Config ───────────────────────────────────────────────
export interface CmsSortConfig {
  field: string
  direction: 'asc' | 'desc'
}

// ─── File Collection Entry ─────────────────────────────────────
export interface CmsFileEntry {
  name: string
  label: string
  file: string
  fields: CmsFieldDef[]
}

// ─── Collection Definition ─────────────────────────────────────
export interface CmsCollectionDef {
  /** Internal name used in routes */
  name: string
  /** Display label */
  label: string

  // ─── Folder collection ────────────────────────────
  /** Path to content folder (folder collections) */
  folder?: string
  /** Allow creating new documents */
  create?: boolean
  /** Filename template (e.g., {{slug}}) */
  slug?: string
  /** File path pattern (e.g., {{slug}}/index) */
  path?: string
  /** Field used to identify entries (defaults to 'title') */
  identifier_field?: string
  /** File extension (e.g., 'md') */
  extension?: string
  /** File format (e.g., 'frontmatter') */
  format?: string
  /** Fields for folder collections */
  fields?: CmsFieldDef[]

  // ─── File collection ──────────────────────────────
  /** File entries (file collections) */
  files?: CmsFileEntry[]

  // ─── Display & Filtering ──────────────────────────
  /** Predefined filter options */
  view_filters?: CmsViewFilter[]
  /** Fields that can be used for sorting */
  sortable_fields?: string[]
  /** Default sort */
  sort?: CmsSortConfig
}

// ─── Backend Configuration ─────────────────────────────────────
export interface CmsBackendConfig {
  /** Backend type (e.g., 'github', 'git-gateway') */
  name: string
  /** Repository in 'owner/repo' format */
  repo: string
  /** Default branch */
  branch: string
}

// ─── Top-Level Config ──────────────────────────────────────────
export interface CmsConfig {
  backend: CmsBackendConfig
  /** Enable local filesystem backend for development */
  local_backend?: boolean
  /** Publish mode (e.g., 'editorial_workflow') */
  publish_mode?: string
  /** Media file storage path in repo */
  media_folder: string
  /** Public URL prefix for media */
  public_folder: string
  /** Content collections */
  collections: CmsCollectionDef[]
  /** Editor config */
  editor?: {
    preview?: boolean
  }
}

// ─── Resolved Types (for CMS UI) ──────────────────────────────

/** A collection with computed metadata for the CMS UI */
export interface CmsCollection extends CmsCollectionDef {
  /** Whether this is a folder collection (vs. file collection) */
  isFolderCollection: boolean
  /** Whether this is a file collection */
  isFileCollection: boolean
  /** Content type path for Nuxt Content queries */
  contentPath: string
  /** URL to the collection in the CMS */
  cmsUrl: string
}

/** Resolved field with computed display information */
export interface CmsField extends CmsFieldDef {
  /** Unique key path (e.g., 'prerequisites.0.lesson') */
  keyPath: string
  /** Whether the field is the body/content field */
  isBody: boolean
  /** Whether the field is visible (not hidden widget) */
  isVisible: boolean
}
