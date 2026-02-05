# Schema-Enhanced Search (No Large Downloads Required)

**Key Insight:** We already have rich semantic structure from OER Schema - we can use it to make keyword search "smarter" without embeddings!

---

## The Problem with Embeddings

**Approach 2 requires downloading:**
- 20MB embedding model (runs in browser)
- OR using user's API key to generate embeddings (API calls cost money)

**For many users, this is:**
- ❌ Too slow on mobile/slow connections
- ❌ Too much memory usage
- ❌ Overkill for simple queries

---

## Solution: Schema-Enhanced Keyword Search

**Core Idea:** Use the structured OER Schema metadata to expand queries and boost relevance without AI models.

### What OER Schema Gives Us

```yaml
# From existing content
title: "3D Modeling Fundamentals"
type: "oer:LearningComponent"
learningObjectives:
  - "Understand polygon modeling concepts"
  - "Create 3D geometry using basic modeling tools"
  - "Apply proper topology principles"
tags: ["Blender", "modeling", "3D"]
prerequisites: []
items:
  - type: lectures
    lecture: introduction-to-modeling
  - type: exercises
    exercise: modeling-the-airline-chair

# OER Schema automatically extracts
actionTypes: ["Making", "Observing"]
materialTypes: ["Video Tutorial"]
assessmentTypes: ["Practice", "Assessment"]
```

### How to Use It

#### 1. **Concept Expansion**

Build a semantic network from the schema:

```typescript
// scripts/build-semantic-index.ts
interface SemanticIndex {
  content: ContentItem[];
  conceptGraph: ConceptGraph;
  synonymMap: SynonymMap;
}

interface ConceptGraph {
  // Built from learning objectives, tags, and OER Schema
  "polygon modeling": {
    relatedConcepts: ["mesh topology", "3D geometry", "edge flow"],
    actionTypes: ["Making", "Observing"],
    contentTypes: ["oer:Practice", "oer:LearningComponent"],
    prerequisites: ["3D software interface"],
    leadsTo: ["texturing", "animation"]
  },
  "mesh topology": {
    relatedConcepts: ["polygon modeling", "edge loops", "quad topology"],
    // ... etc
  }
}

async function buildSemanticIndex() {
  const allContent = await queryCollection('content').find();
  const conceptGraph: ConceptGraph = {};
  const synonymMap: SynonymMap = {};
  
  for (const item of allContent) {
    // Extract concepts from learning objectives
    item.learningObjectives?.forEach(objective => {
      const concepts = extractConcepts(objective);
      concepts.forEach(concept => {
        if (!conceptGraph[concept]) {
          conceptGraph[concept] = {
            relatedConcepts: new Set(),
            actionTypes: new Set(),
            contentTypes: new Set(),
            prerequisites: new Set(),
            leadsTo: new Set()
          };
        }
        
        // Add relationships
        conceptGraph[concept].contentTypes.add(item.type);
        item.tags?.forEach(tag => {
          conceptGraph[concept].relatedConcepts.add(tag.toLowerCase());
        });
      });
    });
    
    // Extract relationships from prerequisites
    item.prerequisites?.forEach(prereq => {
      const prereqContent = findContent(prereq);
      if (prereqContent) {
        // Build learning path graph
        const itemConcepts = extractConcepts(item.title + ' ' + item.description);
        const prereqConcepts = extractConcepts(prereqContent.title);
        
        itemConcepts.forEach(concept => {
          prereqConcepts.forEach(prereqConcept => {
            conceptGraph[concept]?.prerequisites.add(prereqConcept);
            conceptGraph[prereqConcept]?.leadsTo.add(concept);
          });
        });
      }
    });
    
    // Extract from OER Schema action types
    if (item.oerSchema?.doTask?.actionType) {
      const concepts = extractConcepts(item.title);
      concepts.forEach(concept => {
        item.oerSchema.doTask.actionType.forEach(action => {
          conceptGraph[concept]?.actionTypes.add(action);
        });
      });
    }
  }
  
  // Build synonym map from common educational terms
  synonymMap["3d"] = ["three-dimensional", "3d modeling", "3d graphics"];
  synonymMap["mesh"] = ["geometry", "model", "3d object"];
  synonymMap["polygon"] = ["poly", "mesh", "geometry"];
  synonymMap["texture"] = ["material", "shading", "surface"];
  // ... etc
  
  return {
    content: allContent,
    conceptGraph: convertSetsToArrays(conceptGraph),
    synonymMap
  };
}
```

#### 2. **Enhanced Query Processing**

```typescript
// composables/useSchemaEnhancedSearch.ts
export function useSchemaEnhancedSearch() {
  const searchIndex = ref<SemanticIndex | null>(null);
  
  async function loadIndex() {
    if (!searchIndex.value) {
      const response = await fetch('/semantic-search-index.json');
      searchIndex.value = await response.json();
    }
  }
  
  function search(query: string, options: SearchOptions = {}) {
    if (!searchIndex.value) throw new Error('Index not loaded');
    
    // 1. Expand query with synonyms
    const expandedTerms = expandQueryWithSynonyms(
      query,
      searchIndex.value.synonymMap
    );
    
    // 2. Extract intent (looking for beginner content? prerequisites?)
    const intent = detectIntent(query);
    
    // 3. Find related concepts
    const queryConcepts = extractConcepts(query);
    const relatedConcepts = new Set<string>();
    
    queryConcepts.forEach(concept => {
      const conceptData = searchIndex.value!.conceptGraph[concept];
      if (conceptData) {
        conceptData.relatedConcepts.forEach(rc => relatedConcepts.add(rc));
      }
    });
    
    // 4. Search with expanded terms and boost by relevance
    const results = searchIndex.value.content.map(item => {
      let score = 0;
      const searchableText = getSearchableText(item).toLowerCase();
      
      // Original terms (highest weight)
      const originalTerms = query.toLowerCase().split(' ');
      originalTerms.forEach(term => {
        if (item.title.toLowerCase().includes(term)) score += 10;
        if (item.description?.toLowerCase().includes(term)) score += 5;
        if (item.tags?.some(tag => tag.toLowerCase().includes(term))) score += 3;
      });
      
      // Expanded synonyms (medium weight)
      expandedTerms.forEach(term => {
        if (searchableText.includes(term)) score += 2;
      });
      
      // Related concepts (lower weight)
      relatedConcepts.forEach(concept => {
        if (searchableText.includes(concept)) score += 1;
      });
      
      // Boost based on intent
      if (intent.wantsBeginner && item.difficulty === 'Beginner') score *= 1.5;
      if (intent.wantsPrerequisites && item.prerequisites?.length === 0) score *= 1.3;
      if (intent.wantsAdvanced && item.difficulty === 'Advanced') score *= 1.5;
      
      // Boost by learning objectives match
      if (item.learningObjectives) {
        queryConcepts.forEach(concept => {
          item.learningObjectives?.forEach(objective => {
            if (objective.toLowerCase().includes(concept)) score += 4;
          });
        });
      }
      
      // Boost by OER type match
      if (intent.contentType && item.type === intent.contentType) {
        score *= 1.3;
      }
      
      return { ...item, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit || 10);
    
    return results;
  }
  
  function detectIntent(query: string): SearchIntent {
    const lower = query.toLowerCase();
    return {
      wantsBeginner: /\b(start|begin|intro|basic|new to|first time|beginner)\b/.test(lower),
      wantsAdvanced: /\b(advanced|complex|expert|professional)\b/.test(lower),
      wantsPrerequisites: /\b(prerequisite|need to know|first|before)\b/.test(lower),
      wantsPractice: /\b(exercise|practice|hands.?on|try|do)\b/.test(lower),
      wantsTheory: /\b(learn|understand|theory|concept|why)\b/.test(lower),
      contentType: detectContentType(lower)
    };
  }
  
  function detectContentType(query: string): string | null {
    if (/\b(exercise|practice|hands.?on)\b/.test(query)) return 'oer:Practice';
    if (/\b(project|assessment)\b/.test(query)) return 'oer:Assessment';
    if (/\b(lecture|presentation|slide)\b/.test(query)) return 'oer:SupportingMaterial';
    if (/\b(lesson|course|module)\b/.test(query)) return 'oer:LearningComponent';
    if (/\b(pathway|career|specialization)\b/.test(query)) return 'oer:Course';
    return null;
  }
  
  return { loadIndex, search };
}
```

#### 3. **Learning Path Suggestions** (Great for Faculty!)

```typescript
// For faculty building courses from materials
function suggestLearningPath(topic: string) {
  const conceptData = searchIndex.value.conceptGraph[topic];
  if (!conceptData) return null;
  
  // Build prerequisite chain
  const path = {
    prerequisites: buildPrerequisitePath(conceptData.prerequisites),
    coreConcepts: findContentByConcept(topic),
    nextSteps: buildNextStepPath(conceptData.leadsTo),
    relatedTopics: Array.from(conceptData.relatedConcepts)
  };
  
  return path;
}

function buildPrerequisitePath(prerequisites: Set<string>) {
  return Array.from(prerequisites).map(prereq => {
    const content = findContentByConcept(prereq);
    return {
      concept: prereq,
      content: content,
      difficulty: 'Foundation'
    };
  });
}

// Faculty can ask: "Build a course on character animation"
// System returns:
// Prerequisites: [3D software basics, Modeling fundamentals]
// Core Content: [Rigging intro, Animation principles, Character animation]
// Next Steps: [Advanced rigging, Motion capture, Facial animation]
```

---

## Alternative: API-Based Embeddings (No Model Download)

**Another option:** Use the user's API key to generate embeddings via API, never download the model.

### How It Works

```typescript
// composables/useAPIEmbeddingSearch.ts
export function useAPIEmbeddingSearch() {
  const { selectedProvider, apiKey } = useChatbot();
  
  // Index is pre-computed at build time and shipped as static file
  const embeddingIndex = ref<EmbeddingIndex | null>(null);
  
  async function loadIndex() {
    // This file is larger (~5-10MB) but no 20MB model needed
    const response = await fetch('/embedding-index.json');
    embeddingIndex.value = await response.json();
  }
  
  async function search(query: string, limit = 5) {
    // Generate query embedding using user's API
    const queryEmbedding = await generateEmbedding(
      query,
      selectedProvider.value,
      apiKey.value
    );
    
    // Compare with pre-computed content embeddings
    const results = embeddingIndex.value!.items.map(item => {
      const similarity = cosineSimilarity(queryEmbedding, item.embedding);
      return { ...item, similarity };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
    
    return results;
  }
  
  async function generateEmbedding(text: string, provider: string, key: string) {
    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text
        })
      });
      const data = await response.json();
      return data.data[0].embedding;
    }
    // ... other providers
  }
}
```

**Pros:**
- ✅ User only downloads 5-10MB index (not 20MB model)
- ✅ Gets full semantic search capability
- ✅ Uses API they're already paying for
- ✅ High quality embeddings (OpenAI/Anthropic quality)

**Cons:**
- ⚠️ Each search costs ~$0.0001 (negligible)
- ⚠️ Requires API key setup
- ⚠️ Doesn't work offline

---

## Recommended Architecture: Progressive Enhancement with Schema

**Tier 1: Schema-Enhanced Keyword Search (Default)**
- No downloads required
- Uses OER Schema to expand queries
- Understands learning paths via prerequisites
- Detects intent (beginner vs advanced)
- **~100-500KB index file**
- Works offline

**Tier 2: API-Based Embeddings (Optional)**
- User enables "Ultra Search"
- Downloads 5-10MB embedding index (one time)
- Uses user's API key to generate query embeddings
- Much smarter semantic matching
- Works with OpenAI, Anthropic, or compatible APIs

**Tier 3: Local Embeddings (Power Users)**
- Downloads full 20MB model
- Completely offline after download
- No API costs for search
- Best for frequent users with good hardware

```typescript
// User experience
export function useSmartSearch() {
  const searchMode = ref<'schema' | 'api-embedding' | 'local-embedding'>('schema');
  
  async function search(query: string) {
    switch (searchMode.value) {
      case 'schema':
        return useSchemaEnhancedSearch().search(query);
      case 'api-embedding':
        return useAPIEmbeddingSearch().search(query);
      case 'local-embedding':
        return useLocalEmbeddingSearch().search(query);
    }
  }
  
  return { searchMode, search };
}
```

---

## Special Features for Faculty Course Building

Using the OER Schema relationships, we can add faculty-specific tools:

### 1. **Course Builder Assistant**

```typescript
// Faculty asks: "I need to build a 12-week 3D animation course"
async function buildCourseStructure(requirements: CourseRequirements) {
  const { topic, duration, level } = requirements;
  
  // Use prerequisite graph to build logical sequence
  const conceptPath = searchIndex.value.conceptGraph[topic];
  
  // Find foundational content
  const foundations = conceptPath.prerequisites.map(prereq =>
    findBestContent(prereq, { type: 'oer:LearningComponent', difficulty: 'Beginner' })
  );
  
  // Find core content
  const core = findBestContent(topic, { 
    type: 'oer:LearningComponent',
    difficulty: level 
  });
  
  // Find practice activities
  const exercises = findBestContent(topic, {
    type: 'oer:Practice',
    difficulty: level
  });
  
  // Find capstone projects
  const projects = findBestContent(topic, {
    type: 'oer:Assessment',
    difficulty: level
  });
  
  // Assemble into 12-week structure
  return {
    weeks: [
      { week: 1, content: foundations[0], type: 'Foundation' },
      { week: 2, content: foundations[1], type: 'Foundation' },
      { week: 3, content: core[0], type: 'Core Learning' },
      { week: 4, content: exercises[0], type: 'Practice' },
      // ... etc
      { week: 12, content: projects[0], type: 'Capstone Project' }
    ],
    prerequisites: foundations,
    learningObjectives: aggregateLearningObjectives(core),
    assessments: projects
  };
}
```

### 2. **Content Gap Analysis**

```typescript
// Faculty asks: "What's missing from my animation pathway?"
function analyzeContentGaps(pathway: Pathway) {
  const covered = new Set<string>();
  const conceptGraph = searchIndex.value.conceptGraph;
  
  // Extract all concepts covered in pathway
  pathway.hasPart.forEach(item => {
    const concepts = extractConcepts(item.title + ' ' + item.description);
    concepts.forEach(c => covered.add(c));
  });
  
  // Find expected concepts from graph
  const pathwayConcepts = extractConcepts(pathway.title);
  const expected = new Set<string>();
  
  pathwayConcepts.forEach(concept => {
    const data = conceptGraph[concept];
    if (data) {
      data.prerequisites.forEach(p => expected.add(p));
      data.relatedConcepts.forEach(rc => expected.add(rc));
      data.leadsTo.forEach(lt => expected.add(lt));
    }
  });
  
  // Find gaps
  const gaps = Array.from(expected).filter(concept => !covered.has(concept));
  
  // Suggest content to fill gaps
  const suggestions = gaps.map(gap => ({
    gap,
    suggestedContent: findBestContent(gap, { limit: 3 })
  }));
  
  return suggestions;
}
```

### 3. **Prerequisite Validator**

```typescript
// Faculty asks: "Is this course sequence logical?"
function validateCourseSequence(sequence: ContentItem[]) {
  const issues: Issue[] = [];
  
  for (let i = 0; i < sequence.length; i++) {
    const item = sequence[i];
    const previousItems = sequence.slice(0, i);
    
    // Check if prerequisites are met
    item.prerequisites?.forEach(prereq => {
      const prereqMet = previousItems.some(prev => 
        prev._path === prereq || 
        containsConcept(prev, prereq)
      );
      
      if (!prereqMet) {
        issues.push({
          type: 'missing-prerequisite',
          item: item.title,
          prerequisite: prereq,
          suggestion: `Move "${prereq}" before "${item.title}"`
        });
      }
    });
    
    // Check difficulty progression
    if (i > 0) {
      const prevDifficulty = difficultyToNumber(previousItems[i-1].difficulty);
      const currDifficulty = difficultyToNumber(item.difficulty);
      
      if (currDifficulty < prevDifficulty - 1) {
        issues.push({
          type: 'difficulty-regression',
          item: item.title,
          suggestion: `Consider reordering - difficulty drops from ${previousItems[i-1].difficulty} to ${item.difficulty}`
        });
      }
    }
  }
  
  return {
    valid: issues.length === 0,
    issues,
    suggestions: generateReorderSuggestions(sequence, issues)
  };
}
```

---

## File Size Comparison

| Approach | Index Size | Model Download | Total First Load |
|----------|-----------|----------------|------------------|
| **Keyword Only** | 100-500KB | 0 | 100-500KB |
| **Schema-Enhanced** | 500KB-1MB | 0 | 500KB-1MB |
| **API Embeddings** | 5-10MB | 0 | 5-10MB |
| **Local Embeddings** | 5-10MB | 20MB | 25-30MB |

---

## My Recommendation for Your Use Case

**Implement Schema-Enhanced Search (Tier 1)**

Why:
1. ✅ Leverages your existing OER Schema investment
2. ✅ No large downloads (~500KB-1MB index)
3. ✅ Works great for faculty building courses (path analysis, gap detection)
4. ✅ Much smarter than plain keyword search
5. ✅ Can add API-based embeddings later if needed

**The magic:** Your OER Schema already contains the semantic relationships (prerequisites, learning objectives, action types, content relationships). We're just exposing them to the search system!

This gives you **80-90% of the benefits** of embeddings with **5% of the complexity**.

Want me to start implementing the Schema-Enhanced Search approach?
