#!/usr/bin/env node

import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import matter from 'gray-matter'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const contentDir = path.join(__dirname, '../content')
const registryPath = path.join(contentDir, 'data/version-registry.json')

const collections = [
  {
    name: 'pathways',
    path: path.join(contentDir, 'pathways')
  },
  {
    name: 'specializations',
    path: path.join(contentDir, 'specializations')
  }
]

async function updateVersionRegistry() {
  console.log('📝 Updating version registry...\n')

  // Read existing registry
  let registry = {}
  if (fs.existsSync(registryPath)) {
    registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'))
  }

  for (const collection of collections) {
    console.log(`📦 Processing ${collection.name}...`)

    if (!fs.existsSync(collection.path)) {
      console.log(`  ⚠️  Collection path not found: ${collection.path}`)
      continue
    }

    const items = fs.readdirSync(collection.path)
    let addedCount = 0
    let updatedCount = 0

    for (const item of items) {
      const itemPath = path.join(collection.path, item)
      const stat = fs.statSync(itemPath)

      if (!stat.isDirectory()) continue

      const indexPath = path.join(itemPath, 'index.md')
      const vDirPath = path.join(itemPath, 'v')

      if (!fs.existsSync(indexPath)) {
        continue
      }

      // Read the index.md content to get version info
      const indexContent = fs.readFileSync(indexPath, 'utf-8')
      const { data: frontmatter } = matter(indexContent)

      const version = frontmatter.version || '1.0.0'
      const versionStatus = frontmatter.versionStatus || 'latest'
      const publishEmbed = frontmatter.publishEmbed !== undefined ? frontmatter.publishEmbed : true

      // Check if item already exists in registry
      if (!registry[item]) {
        // Add new entry
        registry[item] = {
          latest: version,
          versions: {
            [version]: {
              publishedAt: new Date().toISOString(),
              status: versionStatus,
              changelog: frontmatter.changelog || `Initial version of ${frontmatter.title || item}`,
              breakingChanges: frontmatter.breakingChanges || []
            }
          }
        }
        console.log(`  ✓ Added ${item} (${version})`)
        addedCount++
      } else if (!registry[item].versions[version]) {
        // Update existing entry with new version
        registry[item].versions[version] = {
          publishedAt: new Date().toISOString(),
          status: versionStatus,
          changelog: frontmatter.changelog || `Version ${version}`,
          breakingChanges: frontmatter.breakingChanges || []
        }
        
        // Update latest if this is the latest version
        if (versionStatus === 'latest') {
          registry[item].latest = version
        }
        
        console.log(`  ✓ Updated ${item} with version ${version}`)
        updatedCount++
      }
    }

    console.log(`  📊 Summary: ${addedCount} added, ${updatedCount} updated for ${collection.name}`)
  }

  // Write updated registry
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2))
  console.log('\n✅ Version registry updated successfully!')
}

updateVersionRegistry().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})
