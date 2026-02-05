// Schema-enhanced search composable
import { ref } from 'vue'

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

interface SearchIntent {
  wantsBeginner: boolean
  wantsAdvanced: boolean
  wantsPrerequisites: boolean
  wantsPractice: boolean
  wantsTheory: boolean
  contentType: string | null
  wantsPlan: boolean
  wantsLookup: boolean
  wantsTroubleshooting: boolean
  wantsTimeboxed: boolean
}

interface SearchResult extends SearchIndexItem {
  score: number
  matchReason: string[]
  semanticScore?: number
  combinedScore?: number
}

export function useSchemaEnhancedSearch() {
  const searchIndex = ref<SemanticIndex | null>(null)
  const isLoading = ref(false)
  const isLoaded = ref(false)

  async function loadIndex() {
    if (isLoaded.value) return
    
    isLoading.value = true
    try {
      const response = await fetch('/semantic-search-index.json')
      if (!response.ok) {
        throw new Error('Failed to load search index')
      }
      searchIndex.value = await response.json()
      isLoaded.value = true
      console.log('✅ Search index loaded:', searchIndex.value?.stats)
    } catch (error) {
      console.error('❌ Failed to load search index:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  function detectIntent(query: string): SearchIntent {
    const lower = query.toLowerCase()
    
    return {
      wantsBeginner: /\b(start|begin|intro|basic|new to|first time|beginner|getting started|fundamentals)\b/.test(lower),
      wantsAdvanced: /\b(advanced|complex|expert|professional|sophisticated)\b/.test(lower),
      wantsPrerequisites: /\b(prerequisite|need to know|first|before|required)\b/.test(lower),
      wantsPractice: /\b(exercise|practice|hands.?on|try|do|activity)\b/.test(lower),
      wantsTheory: /\b(learn|understand|theory|concept|why|explain)\b/.test(lower),
      contentType: detectContentType(lower),
      wantsPlan: /\b(plan|week|schedule|roadmap|curriculum|sequence)\b/.test(lower),
      wantsLookup: /\b(where|find|which|locate|link|resource)\b/.test(lower),
      wantsTroubleshooting: /\b(error|issue|problem|fix|troubleshoot|why)\b/.test(lower),
      wantsTimeboxed: /\b(\d+\s*(hour|hours|hr|hrs|day|days|week|weeks))\b/.test(lower)
    }
  }

  function detectContentType(query: string): string | null {
    if (/\b(exercise|practice|hands.?on)\b/.test(query)) return 'exercises'
    if (/\b(project|assignment|assessment|capstone)\b/.test(query)) return 'projects'
    if (/\b(lecture|presentation|slide)\b/.test(query)) return 'lectures'
    if (/\b(lesson|course|module|unit)\b/.test(query)) return 'lessons'
    if (/\b(pathway|career|specialization|track)\b/.test(query)) return 'pathways'
    if (/\b(article|reference|reading)\b/.test(query)) return 'articles'
    if (/\b(tutorial|guide|walkthrough|how.?to)\b/.test(query)) return 'tutorials'
    return null
  }

  function normalizeTerm(term: string): string {
    return term
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/(ing|ed|es|s)\b/g, '')
      .trim()
  }

  function expandQueryWithSynonyms(query: string): string[] {
    if (!searchIndex.value) return [query]
    
    const lowerQuery = query.toLowerCase()
    const terms = lowerQuery.split(/\s+/).filter(t => t.length > 2)
    const expanded = new Set<string>(terms)
    
    for (const term of terms) {
      // Add exact synonyms
      const synonyms = searchIndex.value.synonymMap[term]
      if (synonyms) {
        synonyms.forEach(syn => expanded.add(syn))
      }
      
      // Add partial matches from synonym map
      for (const [key, values] of Object.entries(searchIndex.value.synonymMap)) {
        if (key.includes(term) || term.includes(key)) {
          values.forEach(syn => expanded.add(syn))
        }
      }
    }
    
    return Array.from(expanded)
  }

  function extractQueryConcepts(query: string): string[] {
    if (!searchIndex.value) return []
    
    const concepts: string[] = []
    const lowerQuery = query.toLowerCase()
    
    // Check which concepts appear in the query
    for (const concept of Object.keys(searchIndex.value.conceptGraph)) {
      if (lowerQuery.includes(concept)) {
        concepts.push(concept)
      }
    }
    
    return concepts
  }

  function scoreAll(query: string): SearchResult[] {
    if (!searchIndex.value) {
      throw new Error('Search index not loaded')
    }
    
    const intent = detectIntent(query)
    const expandedTerms = expandQueryWithSynonyms(query).map(normalizeTerm)
    const queryConcepts = extractQueryConcepts(query)
    const lowerQuery = query.toLowerCase()
    
    // Get related concepts
    const relatedConcepts = new Set<string>()
    for (const concept of queryConcepts) {
      const conceptData = searchIndex.value.conceptGraph[concept]
      if (conceptData) {
        conceptData.relatedConcepts.forEach(rc => relatedConcepts.add(rc))
      }
    }
    
    // Score each content item
    const validContentTypes = ['lessons', 'exercises', 'projects', 'tutorials', 'lectures', 'articles', 'pathways', 'specializations']
    
    const results = searchIndex.value.content
      .filter(item => {
        // Filter out image attachments - they have MIME types like image/jpeg
        if (item.type && item.type.startsWith('image/')) {
          return false
        }
        // Only include valid learning content types
        if (!validContentTypes.includes(item.type)) {
          return false
        }
        // Ensure it has a valid path (learning materials start with /)
        if (!item.id || !item.id.startsWith('/')) {
          return false
        }
        return true
      })
      .map(item => {
      let score = 0
      const matchReasons: string[] = []
      const searchableText = item.searchText
      const originalTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2).map(normalizeTerm)
      const normalizedTitle = normalizeTerm(item.title)
      const normalizedDescription = normalizeTerm(item.description)
      const normalizedTags = item.tags.map(tag => normalizeTerm(tag))
      let tagMatches = 0
      
      // 1. Original query terms (highest weight)
      for (const term of originalTerms) {
        if (normalizedTitle.includes(term)) {
          score += 10
          matchReasons.push(`Title contains "${term}"`)
        }
        if (normalizedDescription.includes(term)) {
          score += 5
          matchReasons.push(`Description contains "${term}"`)
        }
        if (normalizedTags.some(tag => tag.includes(term))) {
          score += 3
          matchReasons.push(`Tagged with "${term}"`)
          tagMatches += 1
        }
      }
      
      // 2. Expanded synonyms (medium weight)
      for (const term of expandedTerms) {
        if (term && term !== normalizeTerm(query) && searchableText.includes(term)) {
          score += 2
          matchReasons.push(`Related term: "${term}"`)
        }
      }

      // 2b. Generic tag overlap boost (no hardcoded keywords)
      if (tagMatches >= 2) {
        score *= 1.2
        matchReasons.push('Multiple tag matches')
      }
      
      // 3. Related concepts (lower weight)
      for (const concept of relatedConcepts) {
        if (searchableText.includes(concept)) {
          score += 1
          matchReasons.push(`Related concept: "${concept}"`)
        }
      }
      
      // 4. Learning objectives match (high value)
      for (const objective of item.learningObjectives) {
        for (const concept of queryConcepts) {
          if (objective.toLowerCase().includes(concept)) {
            score += 4
            matchReasons.push(`Learning objective matches "${concept}"`)
          }
        }
      }
      
      // 5. Intent-based boosting
      if (intent.wantsBeginner && item.difficulty?.toLowerCase() === 'beginner') {
        score *= 1.5
        matchReasons.push('Beginner level')
      }
      
      if (intent.wantsAdvanced && item.difficulty?.toLowerCase() === 'advanced') {
        score *= 1.5
        matchReasons.push('Advanced level')
      }
      
      if (intent.wantsPrerequisites && item.prerequisites.length === 0) {
        score *= 1.3
        matchReasons.push('No prerequisites required')
      }
      
      if (intent.contentType && item.type === intent.contentType) {
        score *= 1.3
        matchReasons.push(`Matches content type: ${intent.contentType}`)
      }
      
      if (intent.wantsPractice && (item.type === 'exercises' || item.type === 'projects')) {
        score *= 1.2
        matchReasons.push('Hands-on practice')
      }
      
      if (intent.wantsTheory && (item.type === 'lessons' || item.type === 'lectures' || item.type === 'articles')) {
        score *= 1.2
        matchReasons.push('Conceptual learning')
      }
      
      // 6. Prioritize latest versions
      if (item.versionStatus === 'latest') {
        score *= 1.1
      }
      
      return {
        ...item,
        score,
        matchReason: matchReasons.slice(0, 3) // Keep top 3 reasons
      }
    })
    
    return results
  }

  function search(query: string, options: { limit?: number } = {}): SearchResult[] {
    const limit = options.limit || 10
    return scoreAll(query)
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  async function getEmbeddings(
    texts: string[],
    provider: string,
    apiKey: string,
    model?: string
  ): Promise<number[][]> {
    const response = await $fetch<{ embeddings: number[][] }>('/api/embeddings', {
      method: 'POST',
      body: { provider, apiKey, model, input: texts }
    })
    return response.embeddings
  }

  function cosineSimilarity(a?: number[], b?: number[]) {
    if (!a || !b || a.length === 0 || b.length === 0) return 0
    const len = Math.min(a.length, b.length)
    let dot = 0
    let aNorm = 0
    let bNorm = 0
    for (let i = 0; i < len; i++) {
      const aVal = a[i] ?? 0
      const bVal = b[i] ?? 0
      dot += aVal * bVal
      aNorm += aVal * aVal
      bNorm += bVal * bVal
    }
    return dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm) + 1e-10)
  }

  async function hybridSearch(
    query: string,
    options: { limit?: number; provider: string; apiKey: string; model?: string } 
  ): Promise<SearchResult[]> {
    if (!searchIndex.value) throw new Error('Search index not loaded')
    if (typeof window === 'undefined') return search(query, { limit: options.limit })

    const limit = options.limit || 10
    const all = scoreAll(query)

    // Prepare embedding cache
    const cacheKey = `semantic-embeddings:${options.provider}:${options.model || 'default'}:${searchIndex.value.stats.buildDate}`
    const cached = localStorage.getItem(cacheKey)
    let itemEmbeddings: number[][] | null = null
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed.embeddings)) {
          itemEmbeddings = parsed.embeddings
        }
      } catch {
        itemEmbeddings = null
      }
    }

    // Build embeddings if missing or mismatched
    if (!itemEmbeddings || itemEmbeddings.length !== searchIndex.value.content.length) {
      const texts = searchIndex.value.content.map(item => [
        item.title,
        item.description,
        item.tags?.join(' '),
        item.learningObjectives?.join(' ')
      ].filter(Boolean).join(' '))

      // Batch embeddings to reduce request size
      const batchSize = 50
      const embeddings: number[][] = []
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize)
        const batchEmbeddings = await getEmbeddings(batch, options.provider, options.apiKey, options.model)
        embeddings.push(...batchEmbeddings)
      }

      itemEmbeddings = embeddings
      localStorage.setItem(cacheKey, JSON.stringify({ embeddings }))
    }

    // Query embedding
    const [queryEmbedding] = await getEmbeddings([query], options.provider, options.apiKey, options.model)
    if (!queryEmbedding) {
      return search(query, { limit })
    }

    // Compute semantic scores
    const semanticScores = itemEmbeddings.map((emb) => cosineSimilarity(queryEmbedding, emb))

    const maxLex = Math.max(...all.map(r => r.score)) || 1
    const minLex = Math.min(...all.map(r => r.score)) || 0
    const maxSem = Math.max(...semanticScores) || 1
    const minSem = Math.min(...semanticScores) || 0

    const lexWeight = maxLex < 5 ? 0.3 : 0.6
    const semWeight = 1 - lexWeight

    const combined = all.map((item, idx) => {
      const lexNorm = (item.score - minLex) / (maxLex - minLex + 1e-6)
      const semScore = semanticScores[idx] ?? 0
      const semNorm = (semScore - minSem) / (maxSem - minSem + 1e-6)
      const combinedScore = lexNorm * lexWeight + semNorm * semWeight
      return {
        ...item,
        semanticScore: semanticScores[idx],
        combinedScore
      }
    })

    return combined
      .sort((a, b) => (b.combinedScore || 0) - (a.combinedScore || 0))
      .slice(0, limit)
  }

  function suggestLearningPath(topic: string) {
    if (!searchIndex.value) return null
    
    const conceptData = searchIndex.value.conceptGraph[topic.toLowerCase()]
    if (!conceptData) return null
    
    return {
      prerequisites: conceptData.prerequisites,
      relatedTopics: conceptData.relatedConcepts,
      nextSteps: conceptData.leadsTo,
      contentTypes: conceptData.contentTypes
    }
  }

  return {
    loadIndex,
    search,
    hybridSearch,
    suggestLearningPath,
    detectIntent,
    isLoading,
    isLoaded,
    stats: computed(() => searchIndex.value?.stats || null)
  }
}
