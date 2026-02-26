/**
 * Server-only CMS config parser.
 *
 * This file uses Node.js `fs` and `path` modules and must
 * only be imported from server-side code (server/, api/).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { CmsConfig } from '~/lib/cms/config-types'
import { parseCmsConfigYaml } from '~/lib/cms/config-parser'

const DEFAULT_CONFIG_PATH = 'cms/config.yml'

/**
 * Parse a CMS config.yml file and return the typed config.
 * Works on the server side (Node.js) — reads from filesystem.
 */
export function parseCmsConfigFromFile(configPath?: string): CmsConfig {
  const resolvedPath = resolve(process.cwd(), configPath || DEFAULT_CONFIG_PATH)
  const raw = readFileSync(resolvedPath, 'utf-8')
  return parseCmsConfigYaml(raw)
}
