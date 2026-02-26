/**
 * Server-only Decap CMS config parser.
 *
 * This file uses Node.js `fs` and `path` modules and must
 * only be imported from server-side code (server/, api/).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { DecapConfig } from '~/lib/cms/config-types'
import { parseDecapConfigYaml } from '~/lib/cms/config-parser'

const DEFAULT_CONFIG_PATH = 'public/admin/config.yml'

/**
 * Parse a Decap CMS config.yml file and return the typed config.
 * Works on the server side (Node.js) — reads from filesystem.
 */
export function parseDecapConfigFromFile(configPath?: string): DecapConfig {
  const resolvedPath = resolve(process.cwd(), configPath || DEFAULT_CONFIG_PATH)
  const raw = readFileSync(resolvedPath, 'utf-8')
  return parseDecapConfigYaml(raw)
}
