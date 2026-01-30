#!/usr/bin/env node

/**
 * Migrate frontmatter structure:
 * - Remove 'specialization' and 'order' from lessons
 * - Add 'items' array structure to lessons (converts lectures/tutorials/exercises/articles/projects)
 * - Remove 'pathway' from specializations
 * - Keep 'lessons' array in specializations (already added in Phase 1)
 */

import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.dirname(__dirname)

const DRY_RUN = process.argv.includes('--dry-run')

function getFrontmatterContent(data) {
  const lines = []
  lines.push('---')
  
  // Add fields in order
  const fieldsOrder = [
    'title', 'slug', 'type', 'description', 'estimatedDuration', 'specialization',
    'order', 'learningObjectives', 'items', 'lectures', 'tutorials', 'exercises', 
    'articles', 'projects', 'resources', 'prerequisites', 'tags', 'author', 'published',
    'allowEmbed', 'license', 'aiLicense', 'version', 'versionStatus',
    'changelog', 'whoItsFor', 'targetRole', 'skills', 'tools', 'difficulty',
    'pathway', 'lessons', 'image', 'imageAlt', 'date', 'oer', 'course'
  ]
  
  for (const field of fieldsOrder) {
    if (field in data && data[field] !== undefined && data[field] !== null) {
      const value = data[field]
      if (typeof value === 'string') {
        lines.push(`${field}: '${value.replace(/'/g, "\\'")}'`)
      } else if (typeof value === 'boolean') {
        lines.push(`${field}: ${value}`)
      } else if (typeof value === 'number') {
        lines.push(`${field}: ${value}`)
      } else if (Array.isArray(value)) {
        if (value.length === 0) {
          lines.push(`${field}: []`)
        } else if (field === 'items' && value.length > 0 && typeof value[0] === 'object') {
          // Special handling for items array with objects
          lines.push(`${field}:`)
          for (const item of value) {
            lines.push(`  - type: ${item.type}`)
            lines.push(`    slug: ${item.slug}`)
            if (item.title) {
              lines.push(`    title: '${item.title.replace(/'/g, "\\'")}'`)
            }
          }
        } else if (typeof value[0] === 'string') {
          lines.push(`${field}:`)
          for (const item of value) {
            lines.push(`  - '${item.replace(/'/g, "\\'")}'`)
          }
        } else {
          // Complex nested structure
          lines.push(`${field}:`)
          lines.push(JSON.stringify(value, null, 2).split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n'))
        }
      } else if (typeof value === 'object') {
        lines.push(`${field}:`)
        const objStr = JSON.stringify(value, null, 2)
        for (const line of objStr.split('\n')) {
          lines.push(`  ${line}`)
        }
      }
    }
  }
  
  lines.push('---')
  return lines.join('\n')
}

function migrateLessonFrontmatter(filePath, data) {
  const originalData = { ...data }
  let modified = false
  
  // Remove specialization field
  if ('specialization' in data) {
    delete data.specialization
    modified = true
  }
  
  // Remove order field
  if ('order' in data) {
    delete data.order
    modified = true
  }
  
  // Convert old separate arrays to items array if they exist
  const itemTypes = ['lectures', 'tutorials', 'exercises', 'articles', 'projects']
  const hasOldItemFields = itemTypes.some(type => Array.isArray(data[type]) && data[type].length > 0)
  
  if (hasOldItemFields && !Array.isArray(data.items)) {
    const items = []
    for (const type of itemTypes) {
      if (Array.isArray(data[type])) {
        for (const slug of data[type]) {
          items.push({ type, slug })
        }
      }
      delete data[type]
    }
    if (items.length > 0) {
      data.items = items
      modified = true
    }
  }
  
  // Remove old resource field if it exists
  if ('resources' in data) {
    delete data.resources
    modified = true
  }
  
  return { data, modified }
}

function migrateSpecializationFrontmatter(filePath, data) {
  const originalData = { ...data }
  let modified = false
  
  // Remove pathway field
  if ('pathway' in data) {
    delete data.pathway
    modified = true
  }
  
  return { data, modified }
}

function migratePathwayFrontmatter(filePath, data) {
  // Pathways don't have specialization field, so no changes needed
  return { data, modified: false }
}

function processLessonsDirectory() {
  console.log('\n=== Processing Lessons ===')
  const lessonsDir = path.join(rootDir, 'content', 'lessons')
  let count = 0
  let modified = 0
  
  if (!fs.existsSync(lessonsDir)) {
    console.log('Lessons directory not found')
    return
  }
  
  const lessonFolders = fs.readdirSync(lessonsDir).filter(f => {
    const fullPath = path.join(lessonsDir, f)
    return fs.statSync(fullPath).isDirectory()
  })
  
  for (const folder of lessonFolders) {
    const indexPath = path.join(lessonsDir, folder, 'index.md')
    if (fs.existsSync(indexPath)) {
      count++
      const content = fs.readFileSync(indexPath, 'utf-8')
      const { data, content: body } = matter(content)
      
      const { data: newData, modified: wasModified } = migrateLessonFrontmatter(indexPath, data)
      
      if (wasModified) {
        modified++
        const newContent = `${getFrontmatterContent(newData)}\n${body}`
        
        if (DRY_RUN) {
          console.log(`[DRY-RUN] Would update: ${folder}`)
        } else {
          fs.writeFileSync(indexPath, newContent)
          console.log(`✓ Updated: ${folder}`)
        }
      }
    }
  }
  
  console.log(`Lessons: ${count} total, ${modified} modified`)
}

function processSpecializationsDirectory() {
  console.log('\n=== Processing Specializations ===')
  const specsDir = path.join(rootDir, 'content', 'specializations')
  let count = 0
  let modified = 0
  
  if (!fs.existsSync(specsDir)) {
    console.log('Specializations directory not found')
    return
  }
  
  const specFolders = fs.readdirSync(specsDir).filter(f => {
    const fullPath = path.join(specsDir, f)
    return fs.statSync(fullPath).isDirectory()
  })
  
  for (const folder of specFolders) {
    const indexPath = path.join(specsDir, folder, 'index.md')
    if (fs.existsSync(indexPath)) {
      count++
      const content = fs.readFileSync(indexPath, 'utf-8')
      const { data, content: body } = matter(content)
      
      const { data: newData, modified: wasModified } = migrateSpecializationFrontmatter(indexPath, data)
      
      if (wasModified) {
        modified++
        const newContent = `${getFrontmatterContent(newData)}\n${body}`
        
        if (DRY_RUN) {
          console.log(`[DRY-RUN] Would update: ${folder}`)
        } else {
          fs.writeFileSync(indexPath, newContent)
          console.log(`✓ Updated: ${folder}`)
        }
      }
    }
  }
  
  console.log(`Specializations: ${count} total, ${modified} modified`)
}

function processPathwaysDirectory() {
  console.log('\n=== Processing Pathways ===')
  const pathwaysDir = path.join(rootDir, 'content', 'pathways')
  let count = 0
  let modified = 0
  
  if (!fs.existsSync(pathwaysDir)) {
    console.log('Pathways directory not found')
    return
  }
  
  const pathwayFolders = fs.readdirSync(pathwaysDir).filter(f => {
    const fullPath = path.join(pathwaysDir, f)
    return fs.statSync(fullPath).isDirectory()
  })
  
  for (const folder of pathwayFolders) {
    const indexPath = path.join(pathwaysDir, folder, 'index.md')
    if (fs.existsSync(indexPath)) {
      count++
      const content = fs.readFileSync(indexPath, 'utf-8')
      const { data, content: body } = matter(content)
      
      const { data: newData, modified: wasModified } = migratePathwayFrontmatter(indexPath, data)
      
      if (wasModified) {
        modified++
        const newContent = `${getFrontmatterContent(newData)}\n${body}`
        
        if (DRY_RUN) {
          console.log(`[DRY-RUN] Would update: ${folder}`)
        } else {
          fs.writeFileSync(indexPath, newContent)
          console.log(`✓ Updated: ${folder}`)
        }
      }
    }
  }
  
  console.log(`Pathways: ${count} total, ${modified} modified`)
}

console.log(`\n${DRY_RUN ? '[DRY-RUN MODE]' : '[LIVE MODE]'} Migrating frontmatter structure...\n`)

processLessonsDirectory()
processSpecializationsDirectory()
processPathwaysDirectory()

console.log('\n✅ Migration complete!')
