import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const contentDir = path.join(__dirname, '..', 'content')

// Find all markdown files
function findMarkdownFiles(dir) {
  const files = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...findMarkdownFiles(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath)
    }
  }
  
  return files
}

// Fix component closing tags - put closing :: on a new line
function fixComponentClosing(content) {
  // Match component declarations that have :: on the same line
  // This matches ::component-name{...}:: and moves closing :: to next line
  const componentPattern = /::([\w-]+)\{([^}]+)\}::/g
  
  let modified = false
  const newContent = content.replace(componentPattern, (match, componentName, props) => {
    console.log(`  Fixed component closing: ::${componentName}`)
    modified = true
    return `::${componentName}{${props}}\n::`
  })
  
  return { content: newContent, modified }
}

// Process all markdown files
const markdownFiles = findMarkdownFiles(contentDir)
console.log(`Found ${markdownFiles.length} markdown files\n`)

let totalFixed = 0
let totalFiles = 0

for (const file of markdownFiles) {
  const content = fs.readFileSync(file, 'utf8')
  const { content: newContent, modified } = fixComponentClosing(content)
  
  if (modified) {
    fs.writeFileSync(file, newContent, 'utf8')
    const relativePath = path.relative(contentDir, file)
    console.log(`✓ Fixed: ${relativePath}`)
    totalFixed++
  }
  totalFiles++
}

console.log(`\n✓ Processed ${totalFiles} files`)
console.log(`✓ Fixed ${totalFixed} files with unclosed components`)
