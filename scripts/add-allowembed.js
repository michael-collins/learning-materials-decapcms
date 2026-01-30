#!/usr/bin/env node

/**
 * Add allowEmbed: true to all content files that don't have it
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { globSync } from 'glob'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const contentDir = path.join(__dirname, '..', 'content')

// Find all markdown files
const files = globSync(path.join(contentDir, '**/*.md'))

let addedCount = 0
let updatedCount = 0

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8')
  
  // Split frontmatter and body
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  
  if (!match) {
    continue
  }
  
  const [, frontmatterStr, body] = match
  
  let lines = frontmatterStr.split('\n')
  let hasAllowEmbed = false
  let modified = false
  
  // Check if allowEmbed exists and update it
  lines = lines.map(line => {
    if (line.startsWith('allowEmbed:')) {
      hasAllowEmbed = true
      if (!line.includes('true')) {
        modified = true
        return 'allowEmbed: true'
      }
      return line
    }
    return line
  })
  
  // If no allowEmbed field, add it before the body separator
  if (!hasAllowEmbed) {
    // Find a good place to insert - after published field or before version field
    let insertIndex = lines.length - 1
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('published:')) {
        insertIndex = i + 1
        break
      } else if (lines[i].startsWith('version:')) {
        insertIndex = i
        break
      }
    }
    
    lines.splice(insertIndex, 0, 'allowEmbed: true')
    modified = true
  }
  
  // Write back if modified
  if (modified) {
    const updatedFrontmatter = lines.join('\n')
    const updatedContent = `---\n${updatedFrontmatter}\n---\n${body}`
    
    fs.writeFileSync(file, updatedContent, 'utf-8')
    
    if (hasAllowEmbed) {
      updatedCount++
    } else {
      addedCount++
    }
    
    console.log(`✓ ${path.relative(contentDir, file)}`)
  }
}

console.log(`\n✅ Done! Added allowEmbed to ${addedCount} files, updated ${updatedCount} files.`)
