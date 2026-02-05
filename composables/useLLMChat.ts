import type { Provider } from './useChatbotSettings'

interface SearchResult {
  title: string
  type: string
  description?: string
  difficulty?: string
  duration?: string
  learningObjectives?: string[]
  prerequisites?: string[]
  topics?: string[]
  id: string
}

interface LLMResponse {
  content: string
  references?: Array<{
    id: string
    title: string
    reason: string
  }>
  error?: string
}

interface ResponseIntent {
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

interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string
}

export function useLLMChat() {
  async function generateRetrievalHints(
    query: string,
    provider: Provider,
    apiKey: string,
    model: string
  ): Promise<{ keywords: string[]; preferredTypes: string[] }> {
    try {
      const systemPrompt = `You are a retrieval assistant. Return ONLY valid JSON with two fields: "keywords" and "preferredTypes".

Rules:
- keywords: 3–8 short phrases likely to appear in material titles or tags
- preferredTypes: zero or more of ["lessons","exercises","projects","lectures","articles","tutorials","pathways","specializations"]
- Do not include extra text or code fences.`

      const userPrompt = `User query: "${query}"

Return only JSON.`

      const response = await $fetch<{ content: string }>('/api/chat', {
        method: 'POST',
        body: {
          provider,
          apiKey,
          model,
          systemPrompt,
          userPrompt
        }
      })

      const raw = response.content?.trim() || ''
      const cleaned = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim()

      const parsed = JSON.parse(cleaned)
      const keywords = Array.isArray(parsed?.keywords)
        ? parsed.keywords.map((k: any) => String(k).trim()).filter((k: string) => k.length > 1)
        : []
      const preferredTypes = Array.isArray(parsed?.preferredTypes)
        ? parsed.preferredTypes.map((t: any) => String(t).trim())
        : []

      return { keywords: keywords.slice(0, 8), preferredTypes }
    } catch (error) {
      console.error('Retrieval hints error:', error)
      return { keywords: [], preferredTypes: [] }
    }
  }
  async function rerankResults<T extends { id: string; title: string; type: string; description?: string }>(
    query: string,
    candidates: T[],
    provider: Provider,
    apiKey: string,
    model: string
  ): Promise<T[]> {
    if (candidates.length <= 1) return candidates

    try {
      const candidateList = candidates.map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        description: item.description || ''
      }))

      const systemPrompt = `You are a ranking assistant. Return ONLY a JSON array of ids ordered from most to least relevant to the user's query. Use only the ids provided.`

      const userPrompt = `User query: "${query}"

Candidates:
${JSON.stringify(candidateList, null, 2)}

Return ONLY a JSON array of ids in best-first order.`

      const response = await $fetch<{ content: string }>('/api/chat', {
        method: 'POST',
        body: {
          provider,
          apiKey,
          model,
          systemPrompt,
          userPrompt
        }
      })

      const raw = response.content?.trim() || ''
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return candidates

      const order = parsed.map((id) => String(id))
      const lookup = new Map(candidates.map((c) => [c.id, c]))
      const reranked = order
        .map((id) => lookup.get(id))
        .filter(Boolean) as T[]

      // Append any missing items to preserve coverage
      const remaining = candidates.filter((c) => !order.includes(c.id)) as T[]
      return [...reranked, ...remaining]
    } catch (error) {
      console.error('Rerank error:', error)
      return candidates
    }
  }
  async function generateQueryExpansion(
    query: string,
    provider: Provider,
    apiKey: string,
    model: string
  ): Promise<string[]> {
    try {
      const systemPrompt = `You are a query expansion assistant. Your task is to provide short, concrete search terms that map a user's interest to likely content titles and tags. Return ONLY a JSON array of 3-8 short phrases. Do not include extra text.`

      const userPrompt = `User query: "${query}"

Return a JSON array of 3-8 short phrases that could appear in course or exercise titles/tags. Keep phrases concise.`

      const response = await $fetch<{ content: string }>('/api/chat', {
        method: 'POST',
        body: {
          provider,
          apiKey,
          model,
          systemPrompt,
          userPrompt
        }
      })

      const raw = response.content?.trim() || ''
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          return parsed.map((t) => String(t).trim()).filter((t) => t.length > 1).slice(0, 8)
        }
      } catch {
        // Fallback: parse bullet/line-separated text
        return raw
          .split(/\n|,/)
          .map((t) => t.replace(/^[-*\d.\s]+/, '').trim())
          .filter((t) => t.length > 1)
          .slice(0, 8)
      }

      return []
    } catch (error) {
      console.error('Query expansion error:', error)
      return []
    }
  }

  async function generateResponse(
    query: string,
    searchResults: SearchResult[],
    provider: Provider,
    apiKey: string,
    model: string,
    intent?: ResponseIntent,
    conversation?: ConversationTurn[]
  ): Promise<LLMResponse> {
    try {
      // Build context from search results
      const context = searchResults.slice(0, 5).map((result, idx) => {
        let contextText = `[${idx + 1}] "${result.title}"\n`
        contextText += `   Type: ${result.type}\n`
        contextText += `   Path: ${result.id}\n`
        
        if (result.description) {
          contextText += `   Description: ${result.description}\n`
        }
        
        if (result.difficulty) {
          contextText += `   Difficulty: ${result.difficulty}\n`
        }
        
        if (result.duration) {
          contextText += `   Duration: ${result.duration}\n`
        }
        
        if (result.learningObjectives && result.learningObjectives.length > 0) {
          contextText += `   Learning Objectives:\n`
          result.learningObjectives.slice(0, 3).forEach((obj: string) => {
            contextText += `   - ${obj}\n`
          })
        }
        
        if (result.topics && result.topics.length > 0) {
          contextText += `   Topics: ${result.topics.join(', ')}\n`
        }
        
        return contextText
      }).join('\n')
      const responseMode = intent?.wantsPlan
        ? 'plan'
        : intent?.wantsLookup
          ? 'lookup'
          : intent?.wantsTroubleshooting
            ? 'troubleshoot'
            : 'general'

      const allowedIds = new Set(searchResults.map((result) => result.id))
      const allowedItems = searchResults.map((result) => `- ${result.title} | ${result.id}`).join('\n')
      const allowedLookup = new Map(searchResults.map((result) => [
        result.id,
        {
          title: result.title,
          type: result.type,
          description: result.description || '',
          difficulty: result.difficulty || '',
          duration: result.duration || ''
        }
      ]))

      // System prompt for the assistant
      const systemPrompt = `You are a learning assistant for an educational platform. You help students and teachers use ONLY the educational materials provided to you.

    CRITICAL RULES:
    1. ONLY reference materials that are explicitly provided in the search results
    2. DO NOT make up or suggest courses, lessons, or exercises that aren't in the search results
    3. If the search results don't contain relevant materials, say so honestly
    4. Always include specific titles and paths from the search results when referencing materials
    5. Be concise and practical - focus on the actual materials available
    6. NEVER reference attachments, images, or media captions as separate materials
    7. NEVER invent titles. Use EXACT titles from the allowed list only

    RESPONSE MODES:
    - lookup: return 1–3 exact matches
    - plan: create a short schedule ONLY using provided materials
    - troubleshoot: link to the most relevant material(s) and cite the section reason
    - general: summarize best matches and provide next steps

    OUTPUT FORMAT (REQUIRED):
    Return ONLY valid JSON with this shape:
    {
      "answer": "short response text",
      "references": [
        {"id": "/path/to/material", "reason": "why it matches"}
      ]
    }

    Your job is to help users navigate the EXISTING materials, not to create imaginary content.`

      const historyBlock = (conversation && conversation.length > 0)
        ? `Conversation History (most recent last):\n${conversation.map((turn) => `- ${turn.role.toUpperCase()}: ${turn.content}`).join('\n')}\n\n`
        : ''

      const userPrompt = `${historyBlock}User Question: ${query}
    Response Mode: ${responseMode}
    User Intent:
    - wantsPlan: ${intent?.wantsPlan ?? false}
    - wantsLookup: ${intent?.wantsLookup ?? false}
    - wantsTroubleshooting: ${intent?.wantsTroubleshooting ?? false}
    - wantsPractice: ${intent?.wantsPractice ?? false}
    - wantsTheory: ${intent?.wantsTheory ?? false}
    - wantsTimeboxed: ${intent?.wantsTimeboxed ?? false}
    - contentType: ${intent?.contentType ?? 'none'}

    Allowed Materials (EXACT TITLES AND PATHS ONLY):
    ${allowedItems}

    Available Learning Materials (THESE ARE THE ONLY MATERIALS YOU CAN REFERENCE):
    ${context}

    Instructions: Answer the user's question using ONLY the materials listed above. If these materials don't fully address the question, acknowledge what's missing rather than making up content. Be specific about which materials you're recommending and why they're relevant.`

      function formatStructuredResponse(
        raw: string,
        allowedIds: Set<string>,
        lookup: Map<string, { title: string; type: string; description?: string; difficulty?: string; duration?: string }>
      ): { content: string; references: Array<{ id: string; title: string; reason: string }> } | null {
        try {
          const cleaned = raw
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/```\s*$/i, '')
            .trim()

          const parsed = JSON.parse(cleaned)
          if (!parsed || typeof parsed !== 'object') return null

          const answer = typeof parsed.answer === 'string' ? parsed.answer.trim() : ''
          const refs = Array.isArray(parsed.references) ? parsed.references : []

          const filtered = refs
            .filter((r: any) => r && typeof r.id === 'string' && allowedIds.has(r.id))
            .map((r: any) => {
              const meta = lookup.get(r.id)
              const baseReason = meta?.description || ''
              const typeLabel = meta?.type ? meta.type.replace(/^\w/, c => c.toUpperCase()) : 'Material'
              const reason = baseReason
                ? `${typeLabel}: ${baseReason}`
                : `${typeLabel} relevant to your request.`

              return {
                id: r.id,
                title: meta?.title || r.id,
                reason
              }
            })

          if (!answer && filtered.length === 0) return null

          return {
            content: answer || 'Here are the most relevant materials:',
            references: filtered
          }
        } catch {
          return null
        }
      }

      // Call our server API endpoint instead of provider APIs directly
      const response = await $fetch<{ content: string }>('/api/chat', {
        method: 'POST',
        body: {
          provider,
          apiKey,
          model,
          systemPrompt,
          userPrompt
        }
      })

      const structured = formatStructuredResponse(response.content, allowedIds, allowedLookup)
      if (structured) {
        return { content: structured.content, references: structured.references }
      }

      // If the model returned JSON but parsing failed, avoid showing raw JSON
      if (response.content?.trim().startsWith('{')) {
        return { content: 'I found relevant materials, but the response format was invalid. Please try again.' }
      }

      return { content: response.content }
    } catch (error: any) {
      console.error('LLM API Error:', error)
      
      // Extract error message from various error formats
      let errorMessage = 'Failed to generate response'
      
      // Nuxt $fetch errors have data.message or data.statusMessage
      if (error.data?.message) {
        errorMessage = error.data.message
      } else if (error.data?.statusMessage) {
        errorMessage = error.data.statusMessage
      } else if (error.statusMessage) {
        errorMessage = error.statusMessage
      } else if (error.message) {
        errorMessage = error.message
      }
      
      console.error('Error message:', errorMessage)
      
      return {
        content: '',
        error: errorMessage
      }
    }
  }

  return {
    generateResponse,
    generateQueryExpansion,
    rerankResults,
    generateRetrievalHints
  }
}
