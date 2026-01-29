import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const contentDir = path.join(__dirname, '..', 'content')

const contentTypes = [
  'exercises',
  'lectures',
  'tutorials',
  'articles',
  'projects',
  'lessons',
  'pathways',
  'specializations'
]

/**
 * Parse YAML frontmatter from markdown file
 */
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
  const match = content.match(frontmatterRegex)
  
  if (!match) {
    return { frontmatter: '', body: content }
  }
  
  const [, frontmatterStr, body] = match
  return { frontmatter: frontmatterStr, body }
}

/**
 * Set or update version to 1.0.0 in frontmatter
 */
function setVersion1_0_0(frontmatterStr) {
  const lines = frontmatterStr.split('\n')
  const updated = []
  let versionFound = false
  
  for (const line of lines) {
    if (line.startsWith('version:')) {
      versionFound = true
      updated.push("version: '1.0.0'")
    } else {
      updated.push(line)
    }
  }
  
  // If version not found, add it before last line
  if (!versionFound) {
    updated.push("version: '1.0.0'")
  }
  
  return updated.join('\n')
}

console.log('🚀 Setting all content to version 1.0.0...\n')

let totalUpdated = 0

for (const contentType of contentTypes) {
  const contentTypeDir = path.join(contentDir, contentType)
  
  if (!fs.existsSync(contentTypeDir)) {
    console.log(`⚠️  ${contentType} directory not found, skipping...`)
    continue
  }
  
  const items = fs.readdirSync(contentTypeDir)
  let count = 0
  
  for (const item of items) {
    const itemPath = path.join(contentTypeDir, item)
    
    if (!fs.statSync(itemPath).isDirectory()) continue
    
    const indexFile = path.join(itemPath, 'index.md')
    
    if (!fs.existsSync(indexFile)) continue
    
    const content = fs.readFileSync(indexFile, 'utf-8')
    const { frontmatter, body } = parseFrontmatter(content)
    
    // Check if version is already 1.0.0
    if (frontmatter.includes("version: '1.0.0'")) {
      continue
    }
    
    const updatedFrontmatter = setVersion1_0_0(frontmatter)
    const updatedContent = `---\n${updatedFrontmatter}\n---\n${body}`
    
    fs.writeFileSync(indexFile, updatedContent, 'utf-8')
    count++
    totalUpdated++
    console.log(`✓ Updated ${contentType}/${item}`)
  }
  
  if (count > 0) {
    console.log(`📊 ${contentType}: ${count} updated\n`)
  }
}

console.log(`✅ Done! Set ${totalUpdated} files to version 1.0.0`)
