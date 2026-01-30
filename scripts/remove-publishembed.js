#!/usr/bin/env node

/**
 * Remove publishEmbed field from all content files
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { globSync } from 'glob'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const contentDir = path.join(__dirname, '..', 'content')

// Find all markdown files
const files = globSync(path.join(contentDir, '**/*.md'))

let removedCount = 0

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8')
  
  // Split frontmatter and body
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  
  if (!match) {
    continue
  }
  
  const [, frontmatterStr, body] = match
  
  // Remove publishEmbed line if present
  const lines = frontmatterStr.split('\n')
  const filtered = lines.filter(line => !line.startsWith('publishEmbed:'))
  
  // Only write if something was removed
  if (filtered.length !== lines.length) {
    const updatedFrontmatter = filtered.join('\n')
    const updatedContent = `---\n${updatedFrontmatter}\n---\n${body}`
    
    fs.writeFileSync(file, updatedContent, 'utf-8')
    removedCount++
    console.log(`✓ ${path.relative(contentDir, file)}`)
  }
}

console.log(`\n✅ Done! Removed publishEmbed from ${removedCount} files.`)
