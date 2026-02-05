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

  function search(query: string, options: { limit?: number } = {}): SearchResult[] {
    if (!searchIndex.value) {
      throw new Error('Search index not loaded')
    }
    
    const limit = options.limit || 10
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
    const results = searchIndex.value.content.map(item => {
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
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    
    return results
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
    suggestLearningPath,
    detectIntent,
    isLoading,
    isLoaded,
    stats: computed(() => searchIndex.value?.stats || null)
  }
}
