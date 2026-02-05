// Build semantic search index from content
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface ContentItem {
  _path: string
  title: string
  type?: string
  description?: string
  tags?: string[]
  difficulty?: string
  learningObjectives?: string[]
  prerequisites?: any[]
  items?: any[]
  hasPart?: any[]
  author?: string
  duration?: string
  estimatedDuration?: string
  course?: string
  published?: boolean
  version?: string
  versionStatus?: string
  body?: string
}

interface SearchIndexItem {
  id: string
  title: string
  type: string
  description: string
  searchText: string
  tags: string[]
  difficulty: string
  duration: string
  author: string
  course: string
  learningObjectives: string[]
  prerequisites: string[]
  published: boolean
  version: string
  versionStatus: string
}

interface ConceptData {
  relatedConcepts: string[]
  actionTypes: string[]
  contentTypes: string[]
  prerequisites: string[]
  leadsTo: string[]
}

interface SemanticIndex {
  content: SearchIndexItem[]
  conceptGraph: Record<string, ConceptData>
  synonymMap: Record<string, string[]>
  stats: {
    totalItems: number
    contentTypes: Record<string, number>
    buildDate: string
  }
}

// Extract concepts from text (simple keyword extraction)
function extractConcepts(text: string): string[] {
  if (!text) return []
  
  const concepts: string[] = []
  const lowerText = text.toLowerCase()
  
  // Key concept patterns for 3D/digital media
  const conceptPatterns = [
    'modeling', 'texturing', 'animation', 'rigging', 'rendering',
    'lighting', 'simulation', 'compositing', 'sculpting', 'vfx',
    'particle', 'shader', 'material', 'topology', 'uv mapping',
    'keyframe', 'camera', 'motion graphics', 'character', 'environment',
    'polygon', 'mesh', 'geometry', 'procedural', 'node', 'blueprint',
    '3d printing', 'game design', 'level design', 'asset', 'pipeline'
  ]
  
  for (const concept of conceptPatterns) {
    if (lowerText.includes(concept)) {
      concepts.push(concept)
    }
  }
  
  return [...new Set(concepts)]
}

// Build synonym map
function buildSynonymMap(): Record<string, string[]> {
  return {
    '3d': ['three-dimensional', '3d modeling', '3d graphics', 'three dimensional'],
    'modeling': ['modelling', 'model creation', 'mesh creation', 'geometry creation'],
    'mesh': ['geometry', 'model', '3d object', 'polygon mesh'],
    'polygon': ['poly', 'polygonal', 'mesh'],
    'texture': ['texturing', 'material', 'shading', 'surface'],
    'animation': ['animating', 'animate', 'motion', 'movement'],
    'render': ['rendering', 'rendered', 'output', 'final image'],
    'beginner': ['intro', 'introduction', 'basic', 'fundamentals', 'getting started', 'start'],
    'advanced': ['expert', 'professional', 'complex', 'sophisticated'],
    'tutorial': ['guide', 'walkthrough', 'how-to', 'lesson'],
    'exercise': ['practice', 'hands-on', 'activity', 'drill'],
    'project': ['assignment', 'assessment', 'capstone'],
    'learn': ['study', 'understand', 'master', 'discover'],
    'create': ['make', 'build', 'construct', 'produce'],
    'character': ['avatar', 'figure', 'person', 'creature'],
    'environment': ['scene', 'world', 'setting', 'landscape']
  }
}

// Read all content files
async function loadAllContent(): Promise<ContentItem[]> {
  const contentDir = path.join(__dirname, '../content')
  const allContent: ContentItem[] = []
  
  const contentTypes = [
    'lessons', 'exercises', 'projects', 'lectures', 
    'articles', 'tutorials', 'pathways', 'specializations'
  ]
  
  for (const contentType of contentTypes) {
    const typeDir = path.join(contentDir, contentType)
    try {
      const items = await fs.readdir(typeDir)
      
      for (const item of items) {
        const itemPath = path.join(typeDir, item, 'index.md')
        try {
          const content = await fs.readFile(itemPath, 'utf-8')
          
          // Extract frontmatter (simple YAML parsing)
          const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
          if (!frontmatterMatch) continue
          
          const frontmatter = parseFrontmatter(frontmatterMatch[1])
          const body = content.replace(/^---\n[\s\S]*?\n---\n/, '').substring(0, 1000)
          
          allContent.push({
            _path: `/${contentType}/${item}`,
            body,
            ...frontmatter
          })
        } catch (err) {
          // Skip files that don't exist
        }
      }
    } catch (err) {
      // Skip directories that don't exist
    }
  }
  
  return allContent
}

// Simple YAML frontmatter parser
function parseFrontmatter(yaml: string): Partial<ContentItem> {
  const result: any = {}
  const lines = yaml.split('\n')
  let currentKey = ''
  let currentArray: string[] = []
  let inArray = false
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    
    // Array item
    if (trimmed.startsWith('- ')) {
      if (inArray) {
        currentArray.push(trimmed.substring(2).trim())
      }
      continue
    }
    
    // Key-value pair
    const colonIndex = trimmed.indexOf(':')
    if (colonIndex > 0) {
      // Save previous array
      if (inArray && currentKey) {
        result[currentKey] = currentArray
        currentArray = []
        inArray = false
      }
      
      const key = trimmed.substring(0, colonIndex).trim()
      const value = trimmed.substring(colonIndex + 1).trim()
      
      if (!value) {
        // Start of array or object
        currentKey = key
        inArray = true
      } else {
        result[key] = parseValue(value)
      }
    }
  }
  
  // Save last array
  if (inArray && currentKey) {
    result[currentKey] = currentArray
  }
  
  return result
}

function parseValue(value: string): any {
  // Remove quotes
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }
  
  // Boolean
  if (value === 'true') return true
  if (value === 'false') return false
  
  // Number
  if (!isNaN(Number(value))) return Number(value)
  
  return value
}

// Build the semantic index
async function buildSemanticIndex(): Promise<void> {
  console.log('🔍 Loading content...')
  const allContent = await loadAllContent()
  
  console.log(`📚 Found ${allContent.length} content items`)
  
  // Build concept graph
  const conceptGraph: Record<string, ConceptData> = {}
  const contentTypes: Record<string, number> = {}
  
  console.log('🧠 Building concept graph...')
  
  for (const item of allContent) {
    // Extract concepts from this item
    const textForConcepts = [
      item.title,
      item.description,
      ...(item.learningObjectives || []),
      ...(item.tags || [])
    ].join(' ')
    
    const concepts = extractConcepts(textForConcepts)
    const type = item.type || item._path.split('/')[1]
    
    // Track content types
    contentTypes[type] = (contentTypes[type] || 0) + 1
    
    // Build relationships between concepts
    for (const concept of concepts) {
      if (!conceptGraph[concept]) {
        conceptGraph[concept] = {
          relatedConcepts: [],
          actionTypes: [],
          contentTypes: [],
          prerequisites: [],
          leadsTo: []
        }
      }
      
      // Add content type
      if (!conceptGraph[concept].contentTypes.includes(type)) {
        conceptGraph[concept].contentTypes.push(type)
      }
      
      // Add related concepts from same item
      for (const relatedConcept of concepts) {
        if (relatedConcept !== concept && 
            !conceptGraph[concept].relatedConcepts.includes(relatedConcept)) {
          conceptGraph[concept].relatedConcepts.push(relatedConcept)
        }
      }
      
      // Add tags as related concepts
      if (item.tags) {
        for (const tag of item.tags) {
          const tagLower = tag.toLowerCase()
          if (!conceptGraph[concept].relatedConcepts.includes(tagLower)) {
            conceptGraph[concept].relatedConcepts.push(tagLower)
          }
        }
      }
    }
  }
  
  console.log(`🔗 Built concept graph with ${Object.keys(conceptGraph).length} concepts`)
  
  // Build search index
  console.log('📇 Building search index...')
  const searchIndex: SearchIndexItem[] = allContent
    .filter(item => item.published !== false)
    .map(item => {
      const type = item.type || item._path.split('/')[1] || 'unknown'
      
      return {
        id: item._path,
        title: item.title || '',
        type,
        description: item.description || '',
        searchText: [
          item.title,
          item.description,
          item.tags?.join(' '),
          item.learningObjectives?.join(' '),
          item.body?.substring(0, 500)
        ].filter(Boolean).join(' ').toLowerCase(),
        tags: item.tags || [],
        difficulty: item.difficulty || '',
        duration: item.estimatedDuration || item.duration || '',
        author: item.author || '',
        course: item.course || '',
        learningObjectives: item.learningObjectives || [],
        prerequisites: item.prerequisites || [],
        published: item.published !== false,
        version: item.version || '',
        versionStatus: item.versionStatus || 'latest'
      }
    })
  
  // Build final index
  const semanticIndex: SemanticIndex = {
    content: searchIndex,
    conceptGraph,
    synonymMap: buildSynonymMap(),
    stats: {
      totalItems: searchIndex.length,
      contentTypes,
      buildDate: new Date().toISOString()
    }
  }
  
  // Write to public directory
  const outputPath = path.join(__dirname, '../public/semantic-search-index.json')
  await fs.writeFile(outputPath, JSON.stringify(semanticIndex, null, 2))
  
  console.log('✅ Semantic search index built successfully!')
  console.log(`📊 Stats:`)
  console.log(`   - Total items: ${semanticIndex.stats.totalItems}`)
  console.log(`   - Content types:`, semanticIndex.stats.contentTypes)
  console.log(`   - Concepts: ${Object.keys(conceptGraph).length}`)
  console.log(`   - Output: ${outputPath}`)
  
  // Calculate file size
  const stats = await fs.stat(outputPath)
  const sizeKB = (stats.size / 1024).toFixed(2)
  console.log(`   - File size: ${sizeKB} KB`)
}

// Run the build
buildSemanticIndex().catch(console.error)
