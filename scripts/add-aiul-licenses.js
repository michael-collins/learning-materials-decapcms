import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const contentDir = path.join(__dirname, '..', 'content')
const exercisesDir = path.join(contentDir, 'exercises')
const projectsDir = path.join(contentDir, 'projects')

// Function to add aiLicense to frontmatter
function addAiLicense(filePath, licenses) {
  const content = fs.readFileSync(filePath, 'utf-8')
  
  // Check if already has aiLicense
  if (content.includes('aiLicense:')) {
    console.log(`Skipping ${path.basename(filePath)} - already has aiLicense`)
    return
  }
  
  // Split into frontmatter and body
  const parts = content.split('---')
  if (parts.length < 3) {
    console.log(`Skipping ${path.basename(filePath)} - no frontmatter found`)
    return
  }
  
  const frontmatter = parts[1]
  const body = parts.slice(2).join('---')
  
  // Add aiLicense after license field or at end of frontmatter
  const licensesYaml = licenses.map(l => `  - ${l}`).join('\n')
  const newField = `aiLicense:\n${licensesYaml}\n`
  
  let newFrontmatter
  if (frontmatter.includes('license:')) {
    // Add after license field
    newFrontmatter = frontmatter.replace(
      /(license:.*\n)/,
      `$1${newField}`
    )
  } else {
    // Add at end
    newFrontmatter = frontmatter.trimEnd() + '\n' + newField
  }
  
  const newContent = `---${newFrontmatter}---${body}`
  fs.writeFileSync(filePath, newContent, 'utf-8')
  console.log(`✓ Updated ${path.basename(filePath)}`)
}

// Process exercises
console.log('\n=== Processing Exercises ===')
const exerciseLicenses = ['AIUL-WA', 'AIUL-NA-3D']
const exerciseFiles = fs.readdirSync(exercisesDir).filter(f => f.endsWith('.md'))
exerciseFiles.forEach(file => {
  addAiLicense(path.join(exercisesDir, file), exerciseLicenses)
})

// Process projects
console.log('\n=== Processing Projects ===')
const projectLicenses = ['AIUL-WA', 'AIUL-CD', 'AIUL-NA-3D']
const projectFiles = fs.readdirSync(projectsDir).filter(f => f.endsWith('.md'))
projectFiles.forEach(file => {
  addAiLicense(path.join(projectsDir, file), projectLicenses)
})

console.log('\n✅ Done!')
