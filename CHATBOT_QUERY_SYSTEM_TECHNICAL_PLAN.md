# Chatbot Query System - Technical Implementation Plan

**Status:** Planning Phase  
**Last Updated:** February 5, 2026  
**Related:** [FEATURE_ROADMAP.md](FEATURE_ROADMAP.md), [OER_SCHEMA_IMPLEMENTATION.md](OER_SCHEMA_IMPLEMENTATION.md)

---

## Executive Summary

This document outlines technical approaches for implementing an AI-powered chatbot query system that enables students to search and discover learning materials through natural language conversations. The system must leverage existing frontmatter structures, integrate with the OER Schema implementation, and work seamlessly with versioning, pathways, and other platform features.

---

## 1. Current System Analysis

### 1.1 Existing Frontmatter Structure

All content types share a consistent metadata foundation that can support semantic search and AI queries:

#### Common Fields (All Content Types)
```yaml
# Identity & Discovery
title: string                    # Primary search field
description: string              # Rich semantic context
slug: string                     # URL identifier
type: string                     # OER Schema type (oer:Practice, oer:Course, etc.)

# Classification & Taxonomy
tags: string[]                   # Topic categorization
difficulty: string               # Beginner | Intermediate | Advanced
course: string                   # Course code (DART 303, etc.)

# Authorship & Attribution
author: string                   # Creator name
authorUrl: string                # Creator profile
date: string                     # Publication date
license: string                  # CC BY 4.0, etc.

# Versioning & State
version: string                  # Semantic version (1.0.0)
versionStatus: string            # latest | archived | deprecated
published: boolean               # Visibility state
allowEmbed: boolean              # Embedding permission

# AI Usage Rights
aiLicense: string[]              # AIUL-WA, AIUL-CD, etc.
```

#### Content-Specific Fields

**Lessons** (`oer:LearningComponent`)
```yaml
estimatedDuration: string        # "4 hours"
learningObjectives: string[]     # Educational outcomes
items: array                     # Structured curriculum (lectures, exercises, projects)
  - type: lectures|exercises|projects
    lecture/exercise/project: string  # Reference to content item
```

**Exercises** (`oer:Practice`)
```yaml
difficulty: string               # Skill level
learningObjectives: string[]     # What students will learn
youtubePlaylistID: string        # Video tutorial reference
rubric: string                   # Assessment criteria reference
prerequisites: array             # Prior knowledge required
attachments: array               # Supporting materials
```

**Projects** (`oer:Assessment`)
```yaml
difficulty: string
learningObjectives: string[]
youtubePlaylistID: string
rubric: string
prerequisites: array
attachments: array
timeRequired: string             # "PT30S" (ISO 8601 duration)
```

**Pathways** (`oer:Course`)
```yaml
courseCode: string               # Course identifier
teaches: string[]                # Learning objectives
hasPart: array                   # Course structure
duration: string                 # "PT6M"
inLanguage: string               # "en-US"
isAccessibleForFree: boolean
```

**Specializations** (`oer:LearningComponent`)
```yaml
componentType: string            # Unit, Module, etc.
whoItsFor: string                # Target audience
targetRole: string               # Career role
teaches: string[]
hasPart: array
duration: string
educationalLevel: string
```

**Lectures** (`oer:SupportingMaterial`)
```yaml
# Additional presentation materials
# Often includes embedded content (Google Slides, YouTube)
```

**Articles**
```yaml
# Reference materials and documentation
prerequisites: array
attachments: array
```

**Tutorials**
```yaml
# How-to guides
prerequisites: array
attachments: array
```

### 1.2 Content Body Structure

Content bodies follow consistent Markdown patterns that can be parsed for semantic understanding:

- **Headings:** Section structure (`## Learning Objectives`, `## Requirements`)
- **Lists:** Learning objectives, instructions, requirements
- **Custom Components:** Embedded media, interactive elements
- **Links:** Cross-references to related content
- **Code Blocks:** Technical examples
- **Tables:** Structured data (rubrics, schedules)

### 1.3 OER Schema Integration

The platform already generates comprehensive JSON-LD structured data:

- **Automatic parsing** of markdown content (objectives, instructions, tasks)
- **ActionType inference** from content (Making, Observing, Writing, etc.)
- **Relationship mapping** between content items
- **License and attribution** tracking
- **Material references** (videos, documents, links)

This structured data is ideal for feeding AI/ML systems.

---

## 2. Frontmatter Requirements for Chatbot

### 2.1 Already Sufficient Fields

The existing frontmatter structure is **well-suited** for chatbot queries:

✅ **Semantic richness:** `title`, `description`, `learningObjectives`  
✅ **Classification:** `tags`, `difficulty`, `type`, `courseCode`  
✅ **Relationships:** `prerequisites`, `items[]`, `hasPart[]`  
✅ **Context:** `author`, `course`, `duration`, `estimatedDuration`  
✅ **Discovery:** `published`, `versionStatus`, `allowEmbed`

### 2.2 Recommended Enhancements

To optimize chatbot performance, consider adding these **optional** fields:

```yaml
# Enhanced Semantic Fields
keywords: string[]               # SEO-style keywords for search optimization
  # Example: ["polygon modeling", "mesh topology", "3D geometry"]

searchDescription: string        # Optimized for search/chat (if different from description)
  # Example: "Learn polygon modeling, mesh topology, and efficient 3D workflows"

topics: string[]                 # Hierarchical topic taxonomy
  # Example: ["3D Modeling", "Polygon Modeling", "Topology"]

conceptsCovered: string[]        # Specific concepts/skills
  # Example: ["edge loops", "n-gons", "quad topology", "subdivision surfaces"]

# Enhanced Classification
estimatedLevel: string           # More granular: Novice | Beginner | Intermediate | Advanced | Expert
audienceType: string[]           # ["students", "professionals", "hobbyists"]
contentFormat: string[]          # ["video", "text", "interactive", "hands-on"]

# Enhanced Context
estimatedDuration: string        # If not already present (ISO 8601: "PT4H")
timeToComplete: object           # More detailed
  minimum: string                # "PT2H"
  average: string                # "PT4H"
  maximum: string                # "PT8H"

# Discovery Optimization
alternativeTitles: string[]      # Synonyms or alternative names
  # Example: ["3D Modeling Basics", "Introduction to Polygon Modeling"]

relatedConcepts: string[]        # Related but not prerequisite
  # Example: ["sculpting", "procedural modeling", "CAD modeling"]

# Usage Analytics (for future chatbot learning)
searchableText: string           # Cached full-text for search (generated, not manual)
vectorEmbedding: string          # Pre-computed embedding (generated)
popularQueries: string[]         # Common questions that led to this content
```

### 2.3 Generated Fields (Not in Frontmatter)

These should be **computed at build time** or indexing time:

```typescript
interface GeneratedMetadata {
  // Full-text search
  fullText: string;              // Complete markdown body without frontmatter
  wordCount: number;
  readingTime: number;           // Calculated from word count
  
  // Relationships
  incomingLinks: string[];       // Content that links TO this item
  outgoingLinks: string[];       // Content this item links to
  relatedContent: string[];      // AI-suggested similar content
  
  // Path & Collection
  contentType: string;           // "lesson" | "exercise" | "article" etc.
  collectionPath: string;        // "lessons/3d-modeling-fundamentals"
  url: string;                   // Full URL
  
  // OER Schema
  oerSchemaJson: object;         // Generated JSON-LD
  actionTypes: string[];         // Parsed from content
  
  // Search Optimization
  searchPriority: number;        // Ranking score (1-100)
  popularity: number;            // View/usage metrics
  lastUpdated: string;           // From git history
}
```

---

## 3. Technical Architecture Options

### Option A: OpenAI-based RAG (Retrieval-Augmented Generation)

**Architecture:**
```
User Query → OpenAI Embeddings → Vector Search → Context Retrieval → GPT-4 → Response
```

**Components:**
1. **Vector Database:** Pinecone, Weaviate, or Supabase (pgvector)
2. **Embeddings:** OpenAI `text-embedding-3-small` or `text-embedding-3-large`
3. **LLM:** GPT-4 or GPT-4-turbo
4. **Backend:** Nuxt API routes (`/server/api/chatbot/`)

**Pros:**
- ✅ High-quality responses
- ✅ Fast to implement
- ✅ Excellent context understanding
- ✅ Handles complex queries well

**Cons:**
- ❌ Recurring API costs (embeddings + completions)
- ❌ Data sent to third-party (privacy considerations)
- ❌ Rate limiting on API calls
- ❌ Requires API key management

**Implementation Steps:**

1. **Index Content**
   ```typescript
   // scripts/generate-embeddings.ts
   import { OpenAI } from 'openai';
   import { queryCollection } from '@nuxt/content';
   
   async function generateEmbeddings() {
     const allContent = await queryCollection('content').find();
     
     for (const item of allContent) {
       const text = `${item.title}\n${item.description}\n${item.body}`;
       const embedding = await openai.embeddings.create({
         model: "text-embedding-3-small",
         input: text
       });
       
       // Store in vector DB
       await vectorDB.upsert({
         id: item._path,
         values: embedding.data[0].embedding,
         metadata: { ...item }
       });
     }
   }
   ```

2. **Query Handler**
   ```typescript
   // server/api/chatbot/query.post.ts
   export default defineEventHandler(async (event) => {
     const { query } = await readBody(event);
     
     // Generate query embedding
     const queryEmbedding = await openai.embeddings.create({
       model: "text-embedding-3-small",
       input: query
     });
     
     // Search vector DB
     const results = await vectorDB.query({
       vector: queryEmbedding.data[0].embedding,
       topK: 5,
       includeMetadata: true
     });
     
     // Build context for LLM
     const context = results.matches
       .map(m => `Title: ${m.metadata.title}\nContent: ${m.metadata.description}`)
       .join('\n\n');
     
     // Query GPT-4
     const completion = await openai.chat.completions.create({
       model: "gpt-4-turbo",
       messages: [
         { role: "system", content: SYSTEM_PROMPT },
         { role: "user", content: `Context:\n${context}\n\nQuestion: ${query}` }
       ]
     });
     
     return {
       answer: completion.choices[0].message.content,
       sources: results.matches.map(m => m.metadata)
     };
   });
   ```

**Cost Estimate:**
- Embeddings: $0.02 per 1M tokens (~$2-5 for initial indexing)
- Queries: $0.01 per 1K tokens input + $0.03 per 1K tokens output
- Monthly: $50-500 depending on usage

---

### Option B: Open Source RAG with Local Embeddings

**Architecture:**
```
User Query → Local Embeddings → Vector Search → Llama 3 / Mixtral → Response
```

**Components:**
1. **Vector Database:** ChromaDB (embedded) or Qdrant
2. **Embeddings:** Sentence Transformers (`all-MiniLM-L6-v2`)
3. **LLM:** Llama 3 via Ollama, or Claude API
4. **Backend:** Python/FastAPI microservice + Nuxt API proxy

**Pros:**
- ✅ No recurring API costs (embeddings are free)
- ✅ Privacy-preserving (data stays local)
- ✅ No rate limits
- ✅ Full control over system

**Cons:**
- ❌ Requires GPU for inference (or slower CPU)
- ❌ More complex infrastructure
- ❌ Lower quality than GPT-4 (but improving)
- ❌ Requires ML engineering expertise

**Implementation Steps:**

1. **Embedding Generation**
   ```python
   # scripts/generate_embeddings.py
   from sentence_transformers import SentenceTransformer
   import chromadb
   
   model = SentenceTransformer('all-MiniLM-L6-v2')
   client = chromadb.PersistentClient(path="./chroma_db")
   collection = client.get_or_create_collection("learning_content")
   
   # Process all content
   for content_item in content_items:
       text = f"{content_item['title']}\n{content_item['description']}"
       embedding = model.encode(text)
       collection.add(
           ids=[content_item['id']],
           embeddings=[embedding.tolist()],
           metadatas=[content_item]
       )
   ```

2. **Query Service**
   ```python
   # services/chatbot_service.py
   from fastapi import FastAPI
   from sentence_transformers import SentenceTransformer
   import chromadb
   
   app = FastAPI()
   model = SentenceTransformer('all-MiniLM-L6-v2')
   client = chromadb.PersistentClient(path="./chroma_db")
   collection = client.get_collection("learning_content")
   
   @app.post("/query")
   async def query(request: QueryRequest):
       # Embed query
       query_embedding = model.encode(request.query)
       
       # Search
       results = collection.query(
           query_embeddings=[query_embedding.tolist()],
           n_results=5
       )
       
       # Build context and query LLM
       context = "\n\n".join([
           f"Title: {m['title']}\nContent: {m['description']}"
           for m in results['metadatas'][0]
       ])
       
       # Use local LLM (Ollama) or Claude API
       response = await llm.generate(context, request.query)
       
       return {
           "answer": response,
           "sources": results['metadatas'][0]
       }
   ```

**Cost Estimate:**
- Infrastructure: Self-hosted or $50-200/month for GPU VM
- One-time development: Higher (more complex)
- Ongoing: Minimal

---

### Option C: Hybrid Approach (Recommended)

**Architecture:**
```
User Query → Local Embeddings → Vector Search → Claude API → Response
                                              ↓
                                    Cache common queries
```

**Strategy:**
- Use **local/open-source embeddings** (free, private)
- Use **Claude API** for responses (high quality, pay-per-use)
- **Cache** common queries to reduce API calls
- **Progressive enhancement:** Start with API, migrate to local LLM later

**Components:**
1. **Vector Database:** Supabase (pgvector) - easy scaling, managed
2. **Embeddings:** Sentence Transformers (local) or Supabase built-in
3. **LLM:** Claude 3.5 Sonnet via Anthropic API
4. **Backend:** Nuxt server routes with caching layer (Redis optional)

**Pros:**
- ✅ Best balance of cost and quality
- ✅ Privacy for embeddings, quality for responses
- ✅ Scalable architecture
- ✅ Caching reduces API costs significantly
- ✅ Easy migration path to full local setup

**Cons:**
- ⚠️ Still some API costs (but lower with caching)
- ⚠️ Moderate complexity

**Implementation Steps:**

1. **Database Schema (Supabase)**
   ```sql
   -- Content embeddings table
   CREATE TABLE content_embeddings (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     content_path TEXT UNIQUE NOT NULL,
     content_type TEXT NOT NULL,
     title TEXT NOT NULL,
     description TEXT,
     full_text TEXT,
     metadata JSONB,
     embedding VECTOR(384), -- dimension for all-MiniLM-L6-v2
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   
   -- Create index for fast similarity search
   CREATE INDEX ON content_embeddings 
   USING ivfflat (embedding vector_cosine_ops)
   WITH (lists = 100);
   
   -- Query cache table
   CREATE TABLE query_cache (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     query_hash TEXT UNIQUE NOT NULL,
     query_text TEXT NOT NULL,
     response TEXT NOT NULL,
     sources JSONB,
     hit_count INTEGER DEFAULT 1,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     last_accessed TIMESTAMPTZ DEFAULT NOW()
   );
   
   -- Index for cache lookups
   CREATE INDEX idx_query_cache_hash ON query_cache(query_hash);
   CREATE INDEX idx_query_cache_accessed ON query_cache(last_accessed);
   ```

2. **Embedding Generation Script**
   ```typescript
   // scripts/index-content-for-chatbot.ts
   import { SentenceTransformer } from '@xenova/transformers';
   import { createClient } from '@supabase/supabase-js';
   import { queryCollection } from '@nuxt/content';
   import crypto from 'crypto';
   
   const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
   
   async function indexContent() {
     // Load embedding model
     const embedder = await SentenceTransformer.from_pretrained(
       'Xenova/all-MiniLM-L6-v2'
     );
     
     // Get all content
     const allContent = await queryCollection('content').find();
     
     for (const item of allContent) {
       // Prepare text for embedding
       const textParts = [
         item.title,
         item.description,
         item.learningObjectives?.join(' '),
         item.tags?.join(' '),
         item.body?.substring(0, 2000) // First 2000 chars
       ].filter(Boolean);
       
       const fullText = textParts.join('\n');
       
       // Generate embedding
       const embedding = await embedder.encode(fullText);
       
       // Store in database
       await supabase
         .from('content_embeddings')
         .upsert({
           content_path: item._path,
           content_type: item.type || 'unknown',
           title: item.title,
           description: item.description,
           full_text: fullText,
           metadata: {
             tags: item.tags,
             difficulty: item.difficulty,
             author: item.author,
             version: item.version,
             learningObjectives: item.learningObjectives,
             estimatedDuration: item.estimatedDuration,
             prerequisites: item.prerequisites
           },
           embedding: Array.from(embedding.data),
           updated_at: new Date().toISOString()
         });
       
       console.log(`Indexed: ${item.title}`);
     }
     
     console.log('✅ Content indexing complete');
   }
   
   indexContent().catch(console.error);
   ```

3. **Chatbot API Handler**
   ```typescript
   // server/api/chatbot/query.post.ts
   import { SentenceTransformer } from '@xenova/transformers';
   import { createClient } from '@supabase/supabase-js';
   import Anthropic from '@anthropic-ai/sdk';
   import crypto from 'crypto';
   
   const supabase = createClient(
     process.env.SUPABASE_URL!,
     process.env.SUPABASE_KEY!
   );
   
   const anthropic = new Anthropic({
     apiKey: process.env.ANTHROPIC_API_KEY
   });
   
   let embedder: any = null;
   
   async function getEmbedder() {
     if (!embedder) {
       embedder = await SentenceTransformer.from_pretrained(
         'Xenova/all-MiniLM-L6-v2'
       );
     }
     return embedder;
   }
   
   export default defineEventHandler(async (event) => {
     const { query, conversationHistory = [] } = await readBody(event);
     
     // Generate query hash for caching
     const queryHash = crypto
       .createHash('md5')
       .update(query.toLowerCase().trim())
       .digest('hex');
     
     // Check cache first
     const { data: cachedResult } = await supabase
       .from('query_cache')
       .select('*')
       .eq('query_hash', queryHash)
       .single();
     
     if (cachedResult) {
       // Update cache stats
       await supabase
         .from('query_cache')
         .update({
           hit_count: cachedResult.hit_count + 1,
           last_accessed: new Date().toISOString()
         })
         .eq('id', cachedResult.id);
       
       return {
         answer: cachedResult.response,
         sources: cachedResult.sources,
         cached: true
       };
     }
     
     // Generate query embedding
     const model = await getEmbedder();
     const queryEmbedding = await model.encode(query);
     
     // Similarity search in Supabase
     const { data: results, error } = await supabase.rpc('match_content', {
       query_embedding: Array.from(queryEmbedding.data),
       match_threshold: 0.5,
       match_count: 5
     });
     
     if (error) throw error;
     
     // Build context for LLM
     const contextParts = results.map((r: any, i: number) => {
       return `
[Source ${i + 1}]
Title: ${r.title}
Type: ${r.content_type}
Description: ${r.description}
Learning Objectives: ${r.metadata?.learningObjectives?.join(', ') || 'N/A'}
Difficulty: ${r.metadata?.difficulty || 'N/A'}
Tags: ${r.metadata?.tags?.join(', ') || 'N/A'}
Link: ${r.content_path}

${r.full_text?.substring(0, 500)}...
`.trim();
     });
     
     const context = contextParts.join('\n\n---\n\n');
     
     // System prompt
     const systemPrompt = `You are a helpful educational assistant for an Open Educational Resources (OER) platform focused on 3D modeling, animation, and digital media.

Your role is to help students find relevant learning materials and answer questions about courses, lessons, exercises, and projects.

Guidelines:
- Provide clear, concise answers
- Reference specific learning materials when relevant
- Suggest learning paths when appropriate
- Be encouraging and supportive
- If you're unsure, say so - don't make up information
- Always cite your sources using the [Source N] references provided

Available content types:
- Lessons (oer:LearningComponent): Structured learning modules
- Exercises (oer:Practice): Hands-on practice activities
- Projects (oer:Assessment): Larger assessment projects
- Lectures (oer:SupportingMaterial): Presentation materials
- Articles: Reference materials
- Tutorials: How-to guides
- Pathways (oer:Course): Complete learning paths
- Specializations: Career-focused content bundles`;
     
     // Query Claude
     const message = await anthropic.messages.create({
       model: 'claude-3-5-sonnet-20241022',
       max_tokens: 1024,
       system: systemPrompt,
       messages: [
         ...conversationHistory,
         {
           role: 'user',
           content: `Context (relevant learning materials):\n\n${context}\n\n---\n\nStudent question: ${query}`
         }
       ]
     });
     
     const answer = message.content[0].type === 'text' 
       ? message.content[0].text 
       : '';
     
     // Prepare source references
     const sources = results.map((r: any) => ({
       title: r.title,
       type: r.content_type,
       path: r.content_path,
       url: `${process.env.NUXT_PUBLIC_SITE_URL}${r.content_path}`,
       similarity: r.similarity
     }));
     
     // Cache the result
     await supabase
       .from('query_cache')
       .insert({
         query_hash: queryHash,
         query_text: query,
         response: answer,
         sources: sources
       });
     
     return {
       answer,
       sources,
       cached: false
     };
   });
   ```

4. **SQL Function for Vector Search**
   ```sql
   -- Create function for vector similarity search
   CREATE OR REPLACE FUNCTION match_content(
     query_embedding VECTOR(384),
     match_threshold FLOAT DEFAULT 0.5,
     match_count INT DEFAULT 5
   )
   RETURNS TABLE (
     id UUID,
     content_path TEXT,
     content_type TEXT,
     title TEXT,
     description TEXT,
     full_text TEXT,
     metadata JSONB,
     similarity FLOAT
   )
   LANGUAGE plpgsql
   AS $$
   BEGIN
     RETURN QUERY
     SELECT
       content_embeddings.id,
       content_embeddings.content_path,
       content_embeddings.content_type,
       content_embeddings.title,
       content_embeddings.description,
       content_embeddings.full_text,
       content_embeddings.metadata,
       1 - (content_embeddings.embedding <=> query_embedding) AS similarity
     FROM content_embeddings
     WHERE 1 - (content_embeddings.embedding <=> query_embedding) > match_threshold
     ORDER BY similarity DESC
     LIMIT match_count;
   END;
   $$;
   ```

5. **Frontend Component**
   ```vue
   <!-- components/ChatbotInterface.vue -->
   <script setup lang="ts">
   import { ref } from 'vue';
   
   interface Message {
     role: 'user' | 'assistant';
     content: string;
     sources?: any[];
   }
   
   const messages = ref<Message[]>([
     {
       role: 'assistant',
       content: 'Hi! I\'m here to help you find learning materials. What would you like to learn about?'
     }
   ]);
   
   const inputText = ref('');
   const isLoading = ref(false);
   
   async function sendMessage() {
     if (!inputText.value.trim()) return;
     
     const userMessage = inputText.value;
     messages.value.push({ role: 'user', content: userMessage });
     inputText.value = '';
     isLoading.value = true;
     
     try {
       const response = await $fetch('/api/chatbot/query', {
         method: 'POST',
         body: {
           query: userMessage,
           conversationHistory: messages.value.slice(0, -1).map(m => ({
             role: m.role,
             content: m.content
           }))
         }
       });
       
       messages.value.push({
         role: 'assistant',
         content: response.answer,
         sources: response.sources
       });
     } catch (error) {
       console.error('Chatbot error:', error);
       messages.value.push({
         role: 'assistant',
         content: 'Sorry, I encountered an error. Please try again.'
       });
     } finally {
       isLoading.value = false;
     }
   }
   </script>
   
   <template>
     <div class="chatbot-container">
       <div class="messages">
         <div
           v-for="(msg, idx) in messages"
           :key="idx"
           :class="['message', msg.role]"
         >
           <div class="message-content" v-html="marked(msg.content)" />
           
           <div v-if="msg.sources" class="sources">
             <h4>Related Materials:</h4>
             <ul>
               <li v-for="source in msg.sources" :key="source.path">
                 <NuxtLink :to="source.path">
                   {{ source.title }} ({{ source.type }})
                 </NuxtLink>
               </li>
             </ul>
           </div>
         </div>
       </div>
       
       <div class="input-area">
         <input
           v-model="inputText"
           @keyup.enter="sendMessage"
           :disabled="isLoading"
           placeholder="Ask a question about the learning materials..."
         />
         <button @click="sendMessage" :disabled="isLoading">
           {{ isLoading ? 'Thinking...' : 'Send' }}
         </button>
       </div>
     </div>
   </template>
   ```

**Cost Estimate:**
- Embeddings: Free (local)
- Database: $0-25/month (Supabase free tier covers most use cases)
- Claude API: ~$0.003 per query (avg)
- Monthly: $10-100 depending on traffic
- **70-80% cheaper than Option A** thanks to caching and free embeddings

---

## 4. Integration with Existing Features

### 4.1 Versioning System

**Challenge:** Content has multiple versions; chatbot should reference the correct version.

**Solution:**
- Index ALL versions but prioritize `versionStatus: 'latest'`
- Include version metadata in search results
- When referencing content, use the latest non-deprecated version
- Allow users to filter by version if needed

```typescript
// Add to metadata
metadata: {
  version: item.version,
  versionStatus: item.versionStatus,
  isLatest: item.versionStatus === 'latest'
}

// Boost latest versions in search
SELECT *, 
  (1 - (embedding <=> query_embedding)) * 
  CASE WHEN metadata->>'isLatest' = 'true' THEN 1.2 ELSE 0.8 END 
  AS adjusted_similarity
FROM content_embeddings
ORDER BY adjusted_similarity DESC;
```

### 4.2 Pathways & Specializations

**Challenge:** Suggest learning paths, not just individual materials.

**Solution:**
- Index pathways and specializations as distinct entities
- Parse `hasPart[]` and `items[]` to understand curriculum structure
- Suggest pathways for career goals, specializations for focused learning
- Link exercises/projects to their parent lessons/pathways

```typescript
// Enhanced indexing for pathways
const pathwayText = [
  pathway.title,
  pathway.description,
  `This ${pathway.type} teaches: ${pathway.teaches?.join(', ')}`,
  `Contains: ${pathway.hasPart?.map(p => p.title).join(', ')}`,
  `Target role: ${pathway.targetRole}`,
  `Audience: ${pathway.whoItsFor}`
].filter(Boolean).join('\n');
```

### 4.3 Prerequisites

**Challenge:** Suggest prerequisite materials when students ask about advanced topics.

**Solution:**
- Parse `prerequisites[]` relationships
- Build prerequisite graph
- When advanced content is suggested, include prerequisite check
- Offer learning path: "To learn X, you should first complete Y"

```typescript
// In chatbot prompt
if (suggestedContent.metadata.prerequisites?.length > 0) {
  const prereqs = await fetchPrerequisites(suggestedContent.metadata.prerequisites);
  context += `\n\nPrerequisites: ${prereqs.map(p => p.title).join(', ')}`;
}
```

### 4.4 OER Schema

**Challenge:** Leverage existing structured data.

**Solution:**
- Use OER Schema metadata (ActionTypes, MaterialTypes, etc.)
- Index learning objectives separately for targeted search
- Use `doTask` structures to understand content complexity
- Reference rubrics when discussing assessment

```typescript
// Enhanced metadata from OER Schema
metadata: {
  ...existing,
  oerType: item.type, // oer:Practice, oer:Assessment, etc.
  actionTypes: item.oerSchema?.doTask?.actionType || [],
  materials: item.oerSchema?.material?.map(m => m.materialType) || [],
  rubric: item.rubric
}
```

### 4.5 Embedding & Visibility

**Challenge:** Respect `allowEmbed` and `published` flags.

**Solution:**
- Filter by `published: true` and `versionStatus != 'deprecated'` by default
- Store `allowEmbed` in metadata for external embedding use cases
- Add query parameters for admins to search unpublished content

```sql
-- Add to search query
WHERE metadata->>'published' = 'true'
  AND metadata->>'versionStatus' != 'deprecated'
```

---

## 5. Progressive Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- ✅ Audit and document current frontmatter (DONE above)
- Add recommended enhancement fields (if needed)
- Set up Supabase database and schema
- Install embedding dependencies

### Phase 2: Indexing (Week 3)
- Create embedding generation script
- Index all current content
- Set up automated re-indexing on content updates
- Add to build process (`npm run index:chatbot`)

### Phase 3: Basic Chatbot (Week 4-5)
- Implement API routes with vector search
- Integrate Claude API
- Build basic query caching
- Create simple UI component
- Test with sample queries

### Phase 4: Integration (Week 6-7)
- Integrate with versioning system
- Add pathway/specialization awareness
- Implement prerequisite suggestions
- Enhance context with OER Schema data
- Test edge cases

### Phase 5: UI/UX (Week 8-9)
- Design full chatbot interface
- Add conversation history
- Implement source citations with links
- Mobile responsiveness
- Accessibility improvements

### Phase 6: Optimization (Week 10+)
- Implement advanced caching strategies
- Add analytics tracking
- Tune search relevance
- A/B test prompts
- Collect user feedback

---

## 6. Key Decision Points

### Decision 1: Frontmatter Enhancements
**Options:**
- A) Keep current frontmatter as-is (sufficient for MVP)
- B) Add recommended fields incrementally as needed
- C) Full frontmatter overhaul (not recommended)

**Recommendation:** Option A for Phase 1, Option B for optimization

### Decision 2: Vector Database
**Options:**
- A) Supabase (pgvector) - Managed, easy, scalable
- B) Pinecone - Specialized, but more expensive
- C) ChromaDB - Self-hosted, free, but requires infrastructure

**Recommendation:** Supabase for production, ChromaDB for development

### Decision 3: LLM Provider
**Options:**
- A) Claude (Anthropic) - High quality, reasonable cost
- B) GPT-4 (OpenAI) - Industry standard, higher cost
- C) Local LLM (Llama/Mixtral) - Free, but infrastructure needed

**Recommendation:** Claude for MVP, evaluate local LLM for future cost savings

### Decision 4: Embedding Model
**Options:**
- A) Local (Sentence Transformers) - Free, private
- B) OpenAI Embeddings - High quality, paid
- C) Supabase built-in - Convenient, paid

**Recommendation:** Local (Sentence Transformers) for best cost/privacy balance

---

## 7. Budget Estimates

### Option A: OpenAI RAG
- Setup: $0
- Initial indexing: $5-10
- Monthly (1000 queries): $50-100
- Monthly (10,000 queries): $500-1000

### Option B: Open Source
- Setup: $200-500 (infrastructure)
- Initial indexing: $0
- Monthly: $50-200 (server costs)
- Monthly (any volume): Same (no per-query costs)

### Option C: Hybrid (Recommended)
- Setup: $0-25 (Supabase free tier)
- Initial indexing: $0
- Monthly (1000 queries): $10-30
- Monthly (10,000 queries): $100-300
- **70% savings** vs Option A

---

## 8. Success Metrics

### User Engagement
- Query volume per day/week/month
- Conversation length (messages per session)
- Repeat usage rate
- User satisfaction ratings

### System Performance
- Query response time (target: <2s)
- Search relevance (precision@5, recall@5)
- Cache hit rate (target: >40%)
- API cost per query

### Educational Outcomes
- Content discovery improvement (compared to manual search)
- Learning path completion rates
- Prerequisite awareness
- Student feedback on suggested materials

---

## 9. Privacy & Security Considerations

### Data Privacy
- **Student queries:** May contain personal information or learning gaps
- **Content:** Public OER materials, but metadata may be sensitive
- **GDPR/FERPA:** Ensure compliance if tracking user IDs

### Mitigation Strategies
- Anonymize query logs
- Don't store user IDs with queries
- Clear data retention policies
- Option for users to delete conversation history
- Host embeddings locally (not sent to third parties)
- Use Claude API (no training on user data per Anthropic policy)

### Access Control
- Respect content visibility settings (`published`, `allowEmbed`)
- Authenticated users may access unpublished content
- Admin mode for comprehensive search

---

## 10. Next Steps

1. **Review this document** with stakeholders
2. **Choose technical approach** (recommend Hybrid/Option C)
3. **Validate frontmatter** is sufficient (currently: YES)
4. **Approve budget** allocation
5. **Set up development environment** (Supabase, API keys)
6. **Begin Phase 1** implementation

---

## References

- [FEATURE_ROADMAP.md](FEATURE_ROADMAP.md) - Original feature request
- [OER_SCHEMA_IMPLEMENTATION.md](OER_SCHEMA_IMPLEMENTATION.md) - Structured data
- [VERSIONING_SYSTEM.md](VERSIONING_SYSTEM.md) - Version handling
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [Supabase Vector](https://supabase.com/docs/guides/ai/vector-columns)
- [Sentence Transformers](https://www.sbert.net/)

---

**Questions or feedback?** Open an issue or discussion on GitHub.
