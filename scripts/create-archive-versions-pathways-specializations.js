#!/usr/bin/env node

import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const contentDir = path.join(__dirname, '../content')

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

async function createArchiveVersions() {
  for (const collection of collections) {
    console.log(`\n📦 Processing ${collection.name}...`)

    if (!fs.existsSync(collection.path)) {
      console.log(`  ⚠️  Collection path not found: ${collection.path}`)
      continue
    }

    const items = fs.readdirSync(collection.path)
    let createdCount = 0

    for (const item of items) {
      const itemPath = path.join(collection.path, item)
      const stat = fs.statSync(itemPath)

      if (!stat.isDirectory()) continue

      const indexPath = path.join(itemPath, 'index.md')
      const vDirPath = path.join(itemPath, 'v')

      if (!fs.existsSync(indexPath)) {
        console.log(`  ⚠️  No index.md found in ${item}`)
        continue
      }

      // Check if v/ directory already exists
      if (fs.existsSync(vDirPath)) {
        const vFiles = fs.readdirSync(vDirPath)
        if (vFiles.length > 0) {
          console.log(`  ✓ ${item} already has versions`)
          continue
        }
      }

      // Create v/ directory if it doesn't exist
      if (!fs.existsSync(vDirPath)) {
        fs.mkdirSync(vDirPath, { recursive: true })
      }

      // Read the index.md content
      const indexContent = fs.readFileSync(indexPath, 'utf-8')

      // Create v/1.0.0.md with the content
      const versionFilePath = path.join(vDirPath, '1.0.0.md')
      fs.writeFileSync(versionFilePath, indexContent)

      console.log(`  ✓ Created ${item}/v/1.0.0.md`)
      createdCount++
    }

    console.log(`  📊 Summary: ${createdCount} archive versions created for ${collection.name}`)
  }

  console.log('\n✅ Archive version creation complete!')
}

createArchiveVersions().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})
