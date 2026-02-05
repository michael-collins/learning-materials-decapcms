# Chatbot Query System - Simplified Client-Side Architecture

**Approach:** Fully client-side, BYOK (Bring Your Own Key), zero server costs  
**Status:** Planning Phase  
**Last Updated:** February 5, 2026

---

## Core Concept: "Static Index + Client-Side Search + User's API Key"

Instead of running servers and databases, we:
1. **Build a search index at compile time** (during `npm run build`)
2. **Ship the index as static JSON** with your site
3. **Search happens in the browser** using JavaScript
4. **Users provide their own API keys** (OpenAI, Anthropic, local Ollama)
5. **Zero ongoing infrastructure costs**

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Build Time (npm run build)                                  │
├─────────────────────────────────────────────────────────────┤
│ 1. Read all content files                                   │
│ 2. Extract metadata + first 500 words                       │
│ 3. Generate simple search index                             │
│ 4. Output: public/search-index.json (static file)           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Runtime (in browser)                                         │
├─────────────────────────────────────────────────────────────┤
│ 1. Load search-index.json                                   │
│ 2. User asks: "How do I learn 3D modeling?"                 │
│ 3. Search index using keyword/fuzzy search                  │
│ 4. Build context from top 5 matches                         │
│ 5. Send to user's LLM API (with their key)                  │
│ 6. Display response + links to materials                    │
└─────────────────────────────────────────────────────────────┘
```

**No servers. No databases. No ongoing costs.**

---

## Implementation: Three Approaches (Simple → Advanced)

### Approach 1: Keyword Search (Simplest, Good Enough)

**How it works:** Simple text matching, no AI needed for search

**Pros:**
- ✅ Dead simple to implement
- ✅ Works offline after initial load
- ✅ Tiny index file (~100-500KB)
- ✅ Instant search (no API calls for search)
- ✅ Zero cost

**Cons:**
- ⚠️ Less "smart" - doesn't understand synonyms
- ⚠️ Exact word matches only

**Code:**

```typescript
// scripts/build-search-index.ts
import { queryCollection } from '@nuxt/content';
import fs from 'fs/promises';

async function buildSearchIndex() {
  const allContent = await queryCollection('content').find();
  
  const index = allContent.map(item => ({
    // Essential fields
    id: item._path,
    title: item.title,
    type: item.type || item._dir,
    description: item.description || '',
    
    // Search fields
    searchText: [
      item.title,
      item.description,
      item.tags?.join(' '),
      item.learningObjectives?.join(' '),
      item.body?.substring(0, 500) // First 500 chars
    ].filter(Boolean).join(' ').toLowerCase(),
    
    // Display fields
    tags: item.tags || [],
    difficulty: item.difficulty,
    duration: item.estimatedDuration || item.duration,
    author: item.author,
    
    // Context for LLM
    learningObjectives: item.learningObjectives || [],
    prerequisites: item.prerequisites || [],
    
    // Metadata
    version: item.version,
    published: item.published !== false
  }));
  
  // Filter to only published content
  const publishedIndex = index.filter(item => item.published);
  
  // Write to public directory
  await fs.writeFile(
    'public/search-index.json',
    JSON.stringify(publishedIndex, null, 2)
  );
  
  console.log(`✅ Built search index with ${publishedIndex.length} items`);
}

buildSearchIndex();
```

```typescript
// composables/useContentSearch.ts
export function useContentSearch() {
  const searchIndex = ref<any[]>([]);
  
  // Load index once
  async function loadIndex() {
    if (searchIndex.value.length === 0) {
      const response = await fetch('/search-index.json');
      searchIndex.value = await response.json();
    }
  }
  
  // Simple keyword search
  function search(query: string, limit = 5) {
    const terms = query.toLowerCase().split(' ').filter(t => t.length > 2);
    
    const results = searchIndex.value.map(item => {
      let score = 0;
      const searchText = item.searchText;
      
      // Score based on term matches
      terms.forEach(term => {
        // Title match (highest weight)
        if (item.title.toLowerCase().includes(term)) score += 10;
        
        // Description match
        if (item.description.toLowerCase().includes(term)) score += 5;
        
        // Tag match
        if (item.tags.some((tag: string) => tag.toLowerCase().includes(term))) {
          score += 3;
        }
        
        // General content match
        if (searchText.includes(term)) score += 1;
      });
      
      return { ...item, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
    
    return results;
  }
  
  return { loadIndex, search };
}
```

**Add to package.json:**
```json
{
  "scripts": {
    "build:search": "tsx scripts/build-search-index.ts",
    "build": "npm run build:search && nuxt build"
  }
}
```

---

### Approach 2: Client-Side Embeddings (Better, Still Simple)

**How it works:** Use transformers.js to run AI embeddings in the browser

**Pros:**
- ✅ Much smarter search (understands "polygon modeling" = "3D mesh creation")
- ✅ Still fully client-side
- ✅ No API calls for search
- ✅ Works offline after initial load

**Cons:**
- ⚠️ Larger initial download (~20MB model)
- ⚠️ Slower first search (~2-3 seconds for model load)
- ⚠️ More complex code

**Code:**

```typescript
// scripts/build-embedding-index.ts
import { pipeline } from '@xenova/transformers';
import { queryCollection } from '@nuxt/content';
import fs from 'fs/promises';

async function buildEmbeddingIndex() {
  console.log('Loading embedding model...');
  const embedder = await pipeline(
    'feature-extraction',
    'Xenova/all-MiniLM-L6-v2'
  );
  
  const allContent = await queryCollection('content').find();
  const index = [];
  
  for (const item of allContent) {
    if (item.published === false) continue;
    
    const text = [
      item.title,
      item.description,
      item.learningObjectives?.join(' '),
      item.tags?.join(' ')
    ].filter(Boolean).join('\n');
    
    const embedding = await embedder(text, {
      pooling: 'mean',
      normalize: true
    });
    
    index.push({
      id: item._path,
      title: item.title,
      type: item.type || item._dir,
      description: item.description,
      tags: item.tags || [],
      difficulty: item.difficulty,
      duration: item.estimatedDuration || item.duration,
      learningObjectives: item.learningObjectives || [],
      prerequisites: item.prerequisites || [],
      embedding: Array.from(embedding.data) // Convert to regular array
    });
    
    console.log(`Embedded: ${item.title}`);
  }
  
  await fs.writeFile(
    'public/embedding-index.json',
    JSON.stringify(index, null, 2)
  );
  
  console.log(`✅ Built embedding index with ${index.length} items`);
}

buildEmbeddingIndex();
```

```typescript
// composables/useEmbeddingSearch.ts
import { pipeline } from '@xenova/transformers';

export function useEmbeddingSearch() {
  const searchIndex = ref<any[]>([]);
  const embedder = ref<any>(null);
  
  async function loadIndex() {
    if (searchIndex.value.length === 0) {
      const [indexData, model] = await Promise.all([
        fetch('/embedding-index.json').then(r => r.json()),
        pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
      ]);
      searchIndex.value = indexData;
      embedder.value = model;
    }
  }
  
  async function search(query: string, limit = 5) {
    if (!embedder.value) await loadIndex();
    
    // Generate query embedding
    const queryEmbedding = await embedder.value(query, {
      pooling: 'mean',
      normalize: true
    });
    
    // Calculate cosine similarity
    const results = searchIndex.value.map(item => {
      const similarity = cosineSimilarity(
        queryEmbedding.data,
        item.embedding
      );
      return { ...item, similarity };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
    
    return results;
  }
  
  function cosineSimilarity(a: number[], b: number[]) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
  
  return { loadIndex, search };
}
```

**Package.json additions:**
```json
{
  "dependencies": {
    "@xenova/transformers": "^2.17.0"
  },
  "scripts": {
    "build:embeddings": "tsx scripts/build-embedding-index.ts",
    "build": "npm run build:embeddings && nuxt build"
  }
}
```

---

### Approach 3: Hybrid (Recommended Balance)

Use **Approach 1 (keyword)** by default, offer **Approach 2 (embeddings)** as opt-in for power users.

**Benefits:**
- Fast load for most users
- Better search for those who want it
- Progressive enhancement

---

## Multi-Provider API Key Support

Support multiple LLM providers so users can use whatever they have:

```typescript
// composables/useChatbot.ts
interface APIProvider {
  name: string;
  keyFormat: string; // For validation
  setupInstructions: string;
  apiCall: (query: string, context: string, apiKey: string) => Promise<string>;
}

const providers: Record<string, APIProvider> = {
  openai: {
    name: 'OpenAI (GPT-4, GPT-3.5)',
    keyFormat: 'sk-...',
    setupInstructions: `
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy and paste it below
4. Cost: ~$0.01-0.10 per conversation
    `,
    apiCall: async (query, context, apiKey) => {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Context:\n${context}\n\nQuestion: ${query}` }
          ]
        })
      });
      
      const data = await response.json();
      return data.choices[0].message.content;
    }
  },
  
  anthropic: {
    name: 'Anthropic (Claude)',
    keyFormat: 'sk-ant-...',
    setupInstructions: `
1. Go to https://console.anthropic.com/settings/keys
2. Create a new API key
3. Copy and paste it below
4. Cost: ~$0.003-0.015 per conversation
    `,
    apiCall: async (query, context, apiKey) => {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: `Context:\n${context}\n\nQuestion: ${query}`
          }],
          system: SYSTEM_PROMPT
        })
      });
      
      const data = await response.json();
      return data.content[0].text;
    }
  },
  
  ollama: {
    name: 'Ollama (Local - FREE!)',
    keyFormat: 'http://localhost:11434',
    setupInstructions: `
1. Install Ollama: https://ollama.ai/download
2. Run: ollama pull llama3.2
3. Keep Ollama running in the background
4. Cost: FREE (runs on your computer)
    `,
    apiCall: async (query, context, endpoint) => {
      const response = await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2',
          prompt: `${SYSTEM_PROMPT}\n\nContext:\n${context}\n\nQuestion: ${query}`,
          stream: false
        })
      });
      
      const data = await response.json();
      return data.response;
    }
  }
};

export function useChatbot() {
  const selectedProvider = ref<string>('openai');
  const apiKey = ref<string>('');
  const isConfigured = ref(false);
  
  // Load from localStorage
  onMounted(() => {
    const saved = localStorage.getItem('chatbot-config');
    if (saved) {
      const config = JSON.parse(saved);
      selectedProvider.value = config.provider;
      apiKey.value = config.apiKey;
      isConfigured.value = true;
    }
  });
  
  function saveConfig() {
    localStorage.setItem('chatbot-config', JSON.stringify({
      provider: selectedProvider.value,
      apiKey: apiKey.value
    }));
    isConfigured.value = true;
  }
  
  async function query(userQuery: string) {
    // Search content
    const { search } = useContentSearch(); // or useEmbeddingSearch()
    await search.loadIndex();
    const results = search(userQuery, 5);
    
    // Build context
    const context = results.map((r, i) => `
[Source ${i + 1}]
Title: ${r.title}
Type: ${r.type}
Description: ${r.description}
Learning Objectives: ${r.learningObjectives?.join(', ') || 'N/A'}
Link: ${r.id}
    `.trim()).join('\n\n---\n\n');
    
    // Query LLM
    const provider = providers[selectedProvider.value];
    const response = await provider.apiCall(userQuery, context, apiKey.value);
    
    return {
      answer: response,
      sources: results
    };
  }
  
  return {
    providers,
    selectedProvider,
    apiKey,
    isConfigured,
    saveConfig,
    query
  };
}
```

---

## User Interface: Setup Flow

```vue
<!-- components/ChatbotSetup.vue -->
<template>
  <div class="setup-modal">
    <h2>🤖 Set Up Learning Assistant</h2>
    
    <p>
      This chatbot helps you discover learning materials by searching our
      curriculum and answering questions. It runs entirely in your browser
      and uses <strong>your own AI API key</strong> - we never see your
      conversations or charge any fees.
    </p>
    
    <div class="provider-selector">
      <h3>Choose Your AI Provider:</h3>
      
      <div class="provider-cards">
        <label
          v-for="(provider, key) in providers"
          :key="key"
          class="provider-card"
          :class="{ selected: selectedProvider === key }"
        >
          <input
            type="radio"
            :value="key"
            v-model="selectedProvider"
          />
          <div class="provider-info">
            <h4>{{ provider.name }}</h4>
            <div class="setup-instructions">
              <pre>{{ provider.setupInstructions }}</pre>
            </div>
          </div>
        </label>
      </div>
    </div>
    
    <div class="api-key-input">
      <label>
        <span v-if="selectedProvider === 'ollama'">
          Ollama Endpoint:
        </span>
        <span v-else>
          API Key:
        </span>
        
        <input
          v-model="apiKey"
          :type="selectedProvider === 'ollama' ? 'text' : 'password'"
          :placeholder="providers[selectedProvider].keyFormat"
        />
      </label>
      
      <p class="privacy-note">
        🔒 Your API key is stored locally in your browser and never sent
        to our servers. Only you can see it.
      </p>
    </div>
    
    <div class="actions">
      <button @click="testConnection" :disabled="!apiKey">
        Test Connection
      </button>
      <button @click="saveAndStart" :disabled="!apiKey" class="primary">
        Start Chatting
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const { providers, selectedProvider, apiKey, saveConfig } = useChatbot();

async function testConnection() {
  try {
    await query('Hello, are you working?');
    alert('✅ Connection successful!');
  } catch (error) {
    alert('❌ Connection failed. Please check your API key.');
  }
}

function saveAndStart() {
  saveConfig();
  emit('configured');
}
</script>
```

```vue
<!-- components/ChatbotInterface.vue -->
<template>
  <div class="chatbot">
    <!-- Setup if not configured -->
    <ChatbotSetup
      v-if="!isConfigured"
      @configured="isConfigured = true"
    />
    
    <!-- Chat interface if configured -->
    <div v-else class="chat-interface">
      <div class="messages">
        <div
          v-for="(msg, i) in messages"
          :key="i"
          :class="['message', msg.role]"
        >
          <div class="content" v-html="marked(msg.content)" />
          
          <div v-if="msg.sources" class="sources">
            <h4>📚 Related Materials:</h4>
            <ul>
              <li v-for="source in msg.sources" :key="source.id">
                <NuxtLink :to="source.id">
                  {{ source.title }}
                  <span class="badge">{{ source.type }}</span>
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
          placeholder="Ask about learning materials..."
          :disabled="isLoading"
        />
        <button @click="sendMessage" :disabled="isLoading">
          Send
        </button>
        <button @click="showSettings" class="settings-btn">
          ⚙️
        </button>
      </div>
    </div>
  </div>
</template>
```

---

## Why This Is Better Than Complex Infrastructure

### What We Eliminate:
- ❌ No servers to maintain
- ❌ No databases to manage
- ❌ No API routes to secure
- ❌ No hosting costs
- ❌ No scaling concerns
- ❌ No privacy issues (data never leaves user's browser)
- ❌ No rate limiting
- ❌ No API key management on your end

### What We Keep:
- ✅ Smart search through all materials
- ✅ Context-aware answers
- ✅ Source citations
- ✅ Works with any content updates (just rebuild)
- ✅ Progressive enhancement
- ✅ Full user control

### Trade-offs:
- ⚠️ Users must bring their own API keys (but this is actually a feature!)
- ⚠️ Slightly larger initial download (but only ~100KB-20MB depending on approach)
- ⚠️ Search happens in browser (but it's fast enough)

---

## Why The Complex Infrastructure Was Suggested

The original plan assumed you'd run the chatbot as a **hosted service** where:
- You pay for all API calls
- You need to handle thousands of concurrent users
- You need to optimize costs across all users
- You need server-side rate limiting and auth

But with **BYOK**, each user:
- Pays for their own API usage
- Runs search in their browser
- Has no rate limits (except their API provider's)
- Manages their own privacy

This is **WAY simpler** and arguably **better** for an open educational platform!

---

## Recommended Implementation

**Phase 1: Start Simple (Week 1-2)**
- Implement Approach 1 (keyword search)
- Support OpenAI and Anthropic providers
- Basic UI with setup flow

**Phase 2: Add Local Support (Week 3)**
- Add Ollama integration
- Test with local models
- Document setup for students

**Phase 3: Enhance Search (Week 4, optional)**
- Add Approach 2 (embeddings) as opt-in
- Compare quality vs. keyword search
- Let users choose

**Total Complexity: 5-10x simpler than original plan**

---

## Cost Comparison

| Approach | Setup Cost | Monthly Cost | Per-Query Cost |
|----------|------------|--------------|----------------|
| Original (Server-side) | $0-500 | $100-1000 | $0.01-0.10 |
| **BYOK Client-side** | **$0** | **$0** | **$0 (users pay)** |

---

## Questions?

This approach means:
1. You build the search index once during deployment
2. It ships as a static file with your site  
3. Everything else happens in the user's browser
4. Zero ongoing infrastructure or costs for you
5. Users have full control and privacy

Want me to start implementing this simplified version?
