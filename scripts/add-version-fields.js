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
 * Add or update version fields in frontmatter
 */
function addVersionFields(frontmatterStr) {
  const lines = frontmatterStr.split('\n')
  const updated = []
  let versionAdded = false
  let versionStatusAdded = false
  
  for (const line of lines) {
    if (line.startsWith('version:')) {
      versionAdded = true
      updated.push("version: '1.0.0'")
    } else if (line.startsWith('versionStatus:')) {
      versionStatusAdded = true
      updated.push("versionStatus: latest")
    } else if (line.startsWith('publishEmbed:')) {
      // Skip publishEmbed field when encountered
      continue
    } else {
      updated.push(line)
    }
  }
  
  // Add missing fields before the last line (in case there are comments)
  if (!versionAdded) {
    updated.push("version: '1.0.0'")
  }
  if (!versionStatusAdded) {
    updated.push("versionStatus: latest")
  }
  
  return updated.join('\n')
}

console.log('🚀 Starting to add version fields to content files...\n')

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
    
    // Skip if not a directory
    if (!fs.statSync(itemPath).isDirectory()) continue
    
    const indexFile = path.join(itemPath, 'index.md')
    
    // Skip if index.md doesn't exist
    if (!fs.existsSync(indexFile)) continue
    
    const content = fs.readFileSync(indexFile, 'utf-8')
    const { frontmatter, body } = parseFrontmatter(content)
    
    // Check if version fields are already present
    const hasVersion = frontmatter.includes('version:')
    const hasVersionStatus = frontmatter.includes('versionStatus:')
    
    console.log(`Checking ${contentType}/${item}: version=${hasVersion}, versionStatus=${hasVersionStatus}`)
    
    if (!hasVersion || !hasVersionStatus) {
      console.log(`  → Needs updating`)
      const updatedFrontmatter = addVersionFields(frontmatter)
      const updatedContent = `---\n${updatedFrontmatter}\n---\n${body}`
      
      fs.writeFileSync(indexFile, updatedContent, 'utf-8')
      count++
      totalUpdated++
      console.log(`✓ Updated ${contentType}/${item}`)
    } else {
      console.log(`  → Already has all fields`)
    }
  }
  
  console.log(`📊 ${contentType}: ${count} updated\n`)
}

console.log(`✅ Done! Updated ${totalUpdated} files with version fields.`)
