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
 * Update versionStatus in frontmatter
 */
function updateVersionStatus(frontmatterStr, status) {
  const lines = frontmatterStr.split('\n')
  const updated = []
  let statusFound = false
  
  for (const line of lines) {
    if (line.startsWith('versionStatus:')) {
      statusFound = true
      updated.push(`versionStatus: ${status}`)
    } else {
      updated.push(line)
    }
  }
  
  // If not found, add it
  if (!statusFound) {
    updated.push(`versionStatus: ${status}`)
  }
  
  return updated.join('\n')
}

console.log('🚀 Creating v1.0.0 archive versions...\n')

let totalCreated = 0

for (const contentType of contentTypes) {
  const contentTypeDir = path.join(contentDir, contentType)
  
  if (!fs.existsSync(contentTypeDir)) {
    continue
  }
  
  const items = fs.readdirSync(contentTypeDir)
  let count = 0
  
  for (const item of items) {
    const itemPath = path.join(contentTypeDir, item)
    
    if (!fs.statSync(itemPath).isDirectory()) continue
    
    const indexFile = path.join(itemPath, 'index.md')
    const archiveFile = path.join(itemPath, 'v1.0.0.md')
    
    if (!fs.existsSync(indexFile)) continue
    
    // Skip if archive version already exists
    if (fs.existsSync(archiveFile)) {
      continue
    }
    
    const content = fs.readFileSync(indexFile, 'utf-8')
    const { frontmatter, body } = parseFrontmatter(content)
    
    // Create archive version with versionStatus: archived
    const archivedFrontmatter = updateVersionStatus(frontmatter, 'archived')
    const archivedContent = `---\n${archivedFrontmatter}\n---\n${body}`
    fs.writeFileSync(archiveFile, archivedContent, 'utf-8')
    
    // Update index.md to have versionStatus: latest
    const latestFrontmatter = updateVersionStatus(frontmatter, 'latest')
    const latestContent = `---\n${latestFrontmatter}\n---\n${body}`
    fs.writeFileSync(indexFile, latestContent, 'utf-8')
    
    count++
    totalCreated++
    console.log(`✓ Created ${contentType}/${item}/v1.0.0.md`)
  }
  
  if (count > 0) {
    console.log(`📊 ${contentType}: ${count} archive versions created\n`)
  }
}

console.log(`✅ Done! Created ${totalCreated} archive versions at v1.0.0`)
