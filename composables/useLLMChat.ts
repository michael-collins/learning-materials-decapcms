import type { Provider } from './useChatbotSettings'
import type { ChatMode } from './useChatModes'

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
  thinking?: {
    analysis?: string
    evaluation?: string
    synthesis?: string
  }
  plan?: {
    title: string
    description: string
    steps: Array<{
      step: number
      title: string
      description?: string
      duration?: string
      materials: Array<{
        id: string
        title: string
        type: string
        reason?: string
      }>
    }>
  }
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
      // Limit to top 15 to reduce prompt size
      const topCandidates = candidates.slice(0, 15)
      const candidateList = topCandidates.map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        description: (item.description || '').substring(0, 100) // Truncate to 100 chars
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
          userPrompt,
          max_tokens: 2000 // Higher limit for reranking large lists
        }
      })

      console.log('[Rerank] Response received:', {
        hasContent: !!response?.content,
        contentLength: response?.content?.length || 0,
        responseKeys: response ? Object.keys(response) : [],
        fullResponse: response
      })

      if (!response || !response.content) {
        console.error('[Rerank] Empty or invalid response from API', {
          response,
          type: typeof response,
          isNull: response === null,
          isUndefined: response === undefined
        })
        return candidates
      }

      const raw = response.content.trim()
      if (!raw) {
        console.error('[Rerank] Empty content in response')
        return candidates
      }

      const cleaned = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim()

      let parsed: any = null
      try {
        parsed = JSON.parse(cleaned)
      } catch (error) {
        console.error('Rerank JSON parse failed:', error)
        console.error('Raw response:', raw.substring(0, 500))
        console.error('Cleaned response:', cleaned.substring(0, 500))
        return candidates
      }
      if (!Array.isArray(parsed)) return candidates

      const order = parsed.map((id) => String(id))
      const lookup = new Map(topCandidates.map((c) => [c.id, c]))
      const reranked = order
        .map((id) => lookup.get(id))
        .filter(Boolean) as T[]

      // Append any missing items from topCandidates, then remaining unranked candidates
      const rankedIds = new Set(reranked.map(c => c.id))
      const remainingTop = topCandidates.filter((c) => !rankedIds.has(c.id)) as T[]
      const remainingAll = candidates.slice(15) as T[] // Unranked tail
      return [...reranked, ...remainingTop, ...remainingAll]
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

  // STAGE 1: Analyze query to understand intent and requirements
  async function analyzeQuery(
    query: string,
    provider: Provider,
    apiKey: string,
    model: string,
    mode?: ChatMode,
    conversation?: ConversationTurn[],
    signal?: AbortSignal
  ): Promise<{ concepts: string[]; goals: string[]; contentTypes: string[]; wantsPlan: boolean }> {
    try {
      const historyBlock = conversation && conversation.length > 0
        ? `Recent conversation:\n${conversation.slice(-2).map(t => `${t.role}: ${t.content.substring(0, 100)}`).join('\n')}\n\n`
        : ''

      // Get mode-specific guidance
      const { getModeConfig } = useChatModes()
      const modeGuidance = mode ? getModeConfig(mode).systemPromptSuffix : ''
      const modeContext = mode && mode !== 'ask' 
        ? `\n\nCONTEXT: User has selected "${mode}" mode. Focus analysis on: ${modeGuidance}`
        : ''

      const systemPrompt = `You are an educational query analyst. Deeply analyze the user's question to extract:

1. **Key concepts/topics**: What subjects, skills, or domains are involved? (2-4 items)
2. **Learning goals**: What does the user want to achieve? Are they learning basics, practicing, building something, or troubleshooting? (1-3 items)
3. **Preferred content types**: What format would best help? Options:
   - lessons: Theory/concepts (when understanding principles)
   - exercises: Focused hands-on practice (CRITICAL for skill-building - always include when learning to DO something)
   - projects: Complete builds (for applying multiple skills)
   - tutorials: Step-by-step guides (for following along)
   - lectures: In-depth talks (for deep conceptual understanding)
   - pathways: Learning sequences (for structured progression)
4. **Wants plan/schedule**: Does the user want a structured learning plan, schedule, roadmap, or sequence? (true/false)

Think carefully about:
- Skill level implied (beginner, intermediate, advanced)
- Whether they need theory, practice, or both (if building/creating, MUST include exercises for hands-on practice)
- Time commitment (quick lookup vs deep learning)
- Prerequisite knowledge they might need

**IMPORTANT**: 
- If the user wants to CREATE, BUILD, MAKE, MODEL, or DESIGN something, always include "exercises" in contentTypes for essential hands-on practice.
- If the user asks to "put together a plan", "create a schedule", "plan my learning", "give me a roadmap", set wantsPlan to true and include diverse content types (lectures, tutorials, exercises, projects, lessons).
- OVERRIDE: If mode is NOT "ask" and NOT "plan", ALWAYS set wantsPlan to false. If mode IS "plan", ALWAYS set wantsPlan to true.${modeContext}

Return ONLY valid JSON: {"concepts": ["..."], "goals": ["..."], "contentTypes": ["..."], "wantsPlan": true/false}`

      const userPrompt = `${historyBlock}User question: "${query}"\n\nAnalyze deeply and return JSON.`

      const response = await $fetch<{ content: string }>('/api/chat', {
        method: 'POST',
        body: { provider, apiKey, model, systemPrompt, userPrompt, max_tokens: 400 },
        signal
      })

      const cleaned = response.content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
      const parsed = JSON.parse(cleaned)
      
      // Force wantsPlan based on mode:
      // - plan mode: always true (user explicitly wants a plan)
      // - other non-ask modes (concept, writing, etc.): always false
      // - ask mode: use LLM's analysis
      const forcedWantsPlan = mode === 'plan' ? true : (mode && mode !== 'ask' ? false : Boolean(parsed.wantsPlan))
      
      return {
        concepts: Array.isArray(parsed.concepts) ? parsed.concepts : [],
        goals: Array.isArray(parsed.goals) ? parsed.goals : [],
        contentTypes: Array.isArray(parsed.contentTypes) ? parsed.contentTypes : [],
        wantsPlan: forcedWantsPlan
      }
    } catch (error) {
      console.error('[Stage 1] Analysis error:', error)
      return { concepts: [], goals: [], contentTypes: [], wantsPlan: false }
    }
  }

  // STAGE 2: Evaluate search results against analysis
  async function evaluateResults(
    query: string,
    analysis: { concepts: string[]; goals: string[]; contentTypes: string[]; wantsPlan: boolean },
    searchResults: SearchResult[],
    provider: Provider,
    apiKey: string,
    model: string,
    signal?: AbortSignal
  ): Promise<Array<{ id: string; score: number; reasoning: string }>> {
    try {
      const topResults = searchResults.slice(0, 8).map(r => ({
        id: r.id,
        title: r.title,
        type: r.type,
        description: (r.description || '').substring(0, 120)
      }))

      const planGuidance = analysis.wantsPlan 
        ? '\n\n**PLAN MODE**: User wants a learning schedule. Prioritize diversity - select materials from different types (lectures, tutorials, exercises, projects, lessons) to create a well-rounded progression.'
        : ''

      const systemPrompt = `You are an evaluation assistant. Score how well each material matches the user's needs.${planGuidance}

Return ONLY valid JSON array:
[{"id": "/path", "score": 0-10, "reasoning": "brief reason"}]

Higher scores = better match.`

      const userPrompt = `User query: "${query}"
User needs: ${analysis.concepts.join(', ')}
Goals: ${analysis.goals.join(', ')}
Wants plan: ${analysis.wantsPlan}

Materials:
${JSON.stringify(topResults, null, 2)}

Evaluate and return JSON array.`

      const response = await $fetch<{ content: string }>('/api/chat', {
        method: 'POST',
        body: { provider, apiKey, model, systemPrompt, userPrompt, max_tokens: 800 },
        signal
      })

      console.log('[Stage 2] Evaluation response:', response.content?.length, 'chars')

      const cleaned = response.content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
      const parsed = JSON.parse(cleaned)
      
      if (Array.isArray(parsed)) {
        return parsed.map(item => ({
          id: String(item.id || ''),
          score: Number(item.score || 0),
          reasoning: String(item.reasoning || '')
        }))
      }
      
      return []
    } catch (error) {
      console.error('[Stage 2] Evaluation error:', error)
      return []
    }
  }

  // STAGE 3a: Generate plan structure (titles and material assignments only)
  async function generatePlanStructure(
    query: string,
    analysis: { concepts: string[]; goals: string[] },
    topEvaluated: Array<{ id: string; score: number; reasoning: string }>,
    resultMap: Map<string, any>,
    provider: Provider,
    apiKey: string,
    model: string
  ): Promise<{ title: string; steps: Array<{ step: number; title: string; duration: string; materialIds: string[] }> }> {
    const materialsInfo = topEvaluated.map(e => {
      const result = resultMap.get(e.id)
      return `[${e.id}] ${result?.title} (${result?.type}) - ${result?.duration || 'varies'}`
    }).join('\n')

    const systemPrompt = `You are a learning plan architect. Create a structured learning plan by organizing materials into logical steps.

Return ONLY valid JSON:
{
  "title": "Plan title",
  "steps": [
    {
      "step": 1,
      "title": "Step title",
      "duration": "estimated time",
      "materialIds": ["id1", "id2"]
    }
  ]
}`

    const userPrompt = `Query: "${query}"

Goals: ${analysis.goals.join(', ')}

Available materials:
${materialsInfo}

Create a 4-6 step learning plan. Assign 1-2 materials per step. Use the exact material IDs from the list above. Return ONLY JSON.`

    const response = await $fetch<{ content: string }>('/api/chat', {
      method: 'POST',
      body: { provider, apiKey, model, systemPrompt, userPrompt, max_tokens: 400 }
    })

    console.log('[Stage 3a] Plan structure response:', response.content?.length, 'chars')

    const cleaned = response.content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    const parsed = JSON.parse(cleaned)
    
    return {
      title: parsed.title || 'Learning Plan',
      steps: Array.isArray(parsed.steps) ? parsed.steps : []
    }
  }

  // STAGE 3b: Generate descriptions for plan steps (in batches)
  async function generateStepDescriptions(
    planStructure: { title: string; steps: Array<{ step: number; title: string; duration: string; materialIds: string[] }> },
    topEvaluated: Array<{ id: string; score: number; reasoning: string }>,
    resultMap: Map<string, any>,
    provider: Provider,
    apiKey: string,
    model: string
  ): Promise<Map<number, string>> {
    const descriptions = new Map<number, string>()
    const batchSize = 4
    
    // Process steps in batches of 4
    for (let i = 0; i < planStructure.steps.length; i += batchSize) {
      const batch = planStructure.steps.slice(i, i + batchSize)
      
      const stepsInfo = batch.map(step => {
        const materials = step.materialIds.map(id => {
          const result = resultMap.get(id)
          const evaluation = topEvaluated.find(e => e.id === id)
          return `  - ${result?.title}: ${evaluation?.reasoning || ''}`
        }).join('\n')
        
        return `Step ${step.step}: ${step.title}\nMaterials:\n${materials}`
      }).join('\n\n')

      const systemPrompt = `You are a learning guide. Write concise 2-3 sentence descriptions for each learning step.

Return ONLY valid JSON:
{
  "descriptions": {
    "1": "description for step 1",
    "2": "description for step 2"
  }
}`

      const userPrompt = `Write descriptions for these learning steps:

${stepsInfo}

Return ONLY JSON with step numbers as keys.`

      const response = await $fetch<{ content: string }>('/api/chat', {
        method: 'POST',
        body: { provider, apiKey, model, systemPrompt, userPrompt, max_tokens: 600 }
      })

      console.log(`[Stage 3b] Batch ${Math.floor(i / batchSize) + 1} descriptions:`, response.content?.length, 'chars')

      const cleaned = response.content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
      const parsed = JSON.parse(cleaned)
      
      if (parsed.descriptions) {
        Object.entries(parsed.descriptions).forEach(([stepNum, desc]) => {
          descriptions.set(Number(stepNum), String(desc))
        })
      }
    }
    
    return descriptions
  }

  // STAGE 3: Synthesize final response
  async function synthesizeResponse(
    query: string,
    analysis: { concepts: string[]; goals: string[]; contentTypes: string[]; wantsPlan: boolean },
    evaluation: Array<{ id: string; score: number; reasoning: string }>,
    searchResults: SearchResult[],
    provider: Provider,
    apiKey: string,
    model: string,
    mode?: ChatMode,
    conversation?: ConversationTurn[],
    signal?: AbortSignal
  ): Promise<LLMResponse> {
    try {
      // Get top evaluated results - more for plans
      const topCount = analysis.wantsPlan ? 6 : 3
      const topEvaluated = evaluation.filter(e => e.score >= 6).slice(0, topCount)
      const resultMap = new Map(searchResults.map(r => [r.id, r]))
      
      // For plans, use multi-step generation
      if (analysis.wantsPlan) {
        console.log('[Stage 3] Using multi-step plan generation')
        
        // Step 1: Generate plan structure
        const planStructure = await generatePlanStructure(
          query,
          { concepts: analysis.concepts, goals: analysis.goals },
          topEvaluated,
          resultMap,
          provider,
          apiKey,
          model
        )
        
        console.log('[Stage 3a] Structure generated:', {
          stepsCount: planStructure.steps.length,
          materialIdsPerStep: planStructure.steps.map(s => s.materialIds.length)
        })
        
        // Step 2: Generate descriptions
        const descriptions = await generateStepDescriptions(
          planStructure,
          topEvaluated,
          resultMap,
          provider,
          apiKey,
          model
        )
        
        // Step 3: Combine everything
        const planData = {
          title: planStructure.title,
          description: `A ${planStructure.steps.length}-step learning plan for ${query}`,
          steps: planStructure.steps.map(step => {
            const materials = step.materialIds
              .map(id => {
                const result = resultMap.get(id)
                if (!result) {
                  console.warn(`[Stage 3] Material not found: ${id}`)
                  return null
                }
                const evaluation = topEvaluated.find(e => e.id === id)
                return {
                  id,
                  title: result.title,
                  type: result.type,
                  reason: evaluation?.reasoning || ''
                }
              })
              .filter((m): m is { id: string; title: string; type: string; reason: string } => m !== null)
            
            console.log(`[Stage 3] Step ${step.step} materials:`, materials.length, 'found from', step.materialIds.length, 'IDs')
            
            return {
              step: step.step,
              title: step.title,
              description: descriptions.get(step.step) || '',
              duration: step.duration,
              materials
            }
          })
        }
        
        // Generate brief answer
        const answerPrompt = `Briefly introduce this learning plan in 2 sentences: ${planStructure.title}`
        const answerResponse = await $fetch<{ content: string }>('/api/chat', {
          method: 'POST',
          body: { 
            provider, 
            apiKey, 
            model, 
            systemPrompt: 'You are a helpful assistant. Respond in 2 sentences.',
            userPrompt: answerPrompt,
            max_tokens: 100 
          },
          signal
        })
        
        // Get all unique materials from steps for references
        const usedMaterialIds = new Set(planStructure.steps.flatMap(s => s.materialIds))
        const references = Array.from(usedMaterialIds).map(id => {
          const result = resultMap.get(id)
          const evaluation = topEvaluated.find(e => e.id === id)
          return {
            id,
            title: result?.title || id,
            reason: evaluation?.reasoning.substring(0, 150) || ''
          }
        })
        
        return {
          content: answerResponse.content.trim(),
          references,
          plan: planData
        }
      }
      
      // Regular response (non-plan)
      const materials = topEvaluated.map((ev, idx) => {
        const result = resultMap.get(ev.id)
        if (!result) return ''
        const durationInfo = result.duration ? ` [~${result.duration}]` : ''
        return `[ID: ${result.id}]
Title: "${result.title}"
Type: ${result.type}${durationInfo}
Relevance: ${ev.reasoning}`
      }).filter(Boolean).join('\n\n')

      // Get mode-specific guidance - keep it minimal
      const { getModeConfig } = useChatModes()
      let modeInstruction = ''
      // Detect if this is a summary generation request (triggered by UI button or special prefix)
      const isConceptSummaryRequest = mode === 'concept' && query.startsWith('__GENERATE_CONCEPT_SUMMARY__')
      if (mode && mode !== 'ask') {
        const modeLabel = getModeConfig(mode).label
        if (mode === 'concept') {
          const turnCount = conversation ? conversation.filter(t => t.role === 'user').length + 1 : 1
          console.log(`[Concept Mode] Turn count: ${turnCount}, Conversation length: ${conversation?.length || 0}, Summary requested: ${isConceptSummaryRequest}`)
          
          if (isConceptSummaryRequest) {
            // User clicked "Generate Summary" — produce the deliverable
            modeInstruction = `\n\nGENERATE THE PROJECT CONCEPT SUMMARY NOW. Use ALL information from the conversation history. Your "answer" field must be the complete formatted markdown document below. Do NOT ask any more questions.

# 🎯 PROJECT CONCEPT
**Title:** [Create a compelling 3-5 word project title]
**One-Line:** [Capture the complete concept in one sentence]
**Media:** [Format + any hybrid/experimental aspects discussed]

## 📋 Overview
[2-3 paragraphs: what the project is, themes it explores, how it approaches the topic, intended impact on the audience]

## 🎨 Visual Direction
**Aesthetic:** [Based on conversation, or suggest 2-3 concrete options if not discussed]
**Key Elements:** [Specific visual motifs, techniques, or stylistic choices that convey the concept]

## 🔍 Research & Inspiration
**Artists to Explore:**
1. [Real Artist Name] - [Why their work directly connects to this project's themes]
2. [Real Artist Name] - [Why their work directly connects to this project's themes]  
3. [Real Artist Name] - [Why their work directly connects to this project's themes]

**Essential Reading/Viewing:**
- [Real book, article, documentary, or video] - [How it connects]
- [Real book, article, documentary, or video] - [How it connects]
- [Real book, article, documentary, or video] - [How it connects]

IMPORTANT: Recommend REAL artists and sources from your knowledge that genuinely relate to the project's themes. Never write "TBD".

## 🛠️ Skills & Tools
**Skills:** [Specific technical skills needed based on media format]
**Tools:** [Recommend specific software/tools, or suggest options if not discussed]
**Level:** [Assess from project scope, or suggest a reasonable starting level]

## ✅ Scope & Feasibility  
[Realistic assessment of what's achievable, potential challenges, rough time estimate]

## 🎯 Success Criteria
**This project should communicate:**
- [Extract from conversation]
- [Extract from conversation]

---
*Concept developed collaboratively. Refine and iterate as you develop the project.*

For any topics the user didn't discuss, provide your best suggestions based on what WAS discussed. Never leave sections blank or write "TBD".`
          } else {
            // Natural conversation mode
            const softNudge = turnCount >= 4
              ? `\n\nNote: You've had a good conversation. If you feel you have enough information, you can suggest that the user generate their concept summary using the button below the chat. But if they're still exploring ideas, keep engaging naturally.`
              : ''
            modeInstruction = `\n\nMODE: ${modeLabel}.
Have a natural, encouraging conversation about their project concept. Review the conversation history and DO NOT repeat questions already answered. Ask 2-3 focused follow-up questions based on what's still unclear or unexplored. Keep your response concise (2-4 sentences + questions).${softNudge}`
          }
          console.log(`[Concept Mode] Instruction length: ${modeInstruction.length}`)
        } else if (mode === 'plan') {
          modeInstruction = `\n\nMODE: ${modeLabel}. Create a comprehensive, structured learning plan with step-by-step progression, recommended materials from the provided list, and time estimates. Organize content from foundational to advanced.`
        } else {
          modeInstruction = `\n\nMODE: ${modeLabel}.`
        }
      }

      // When generating concept summary, skip materials and use higher token limit
      const isForcingSummary = isConceptSummaryRequest

      const systemPrompt = `You are a learning assistant.${modeInstruction}

Return ONLY valid JSON:
{
  "answer": "Your response",
  "references": [
    {"id": "exact ID from materials", "reason": "why relevant"}
  ]
}`

      // Strip the trigger prefix from the query before sending to the LLM
      const cleanQuery = isConceptSummaryRequest
        ? query.replace('__GENERATE_CONCEPT_SUMMARY__', '').trim() || 'Generate the project concept summary from our conversation.'
        : query

      const userPrompt = isForcingSummary
        ? `User: "${cleanQuery}"\n\nUsing everything discussed in the conversation, create the complete project concept summary now.`
        : `User: "${cleanQuery}"

Materials available:
${materials}

Respond with JSON.`

      console.log('[Stage 3] Request (regular mode):', { 
        materialsCount: topEvaluated.length,
        promptLength: systemPrompt.length + userPrompt.length,
        hasConversation: !!conversation,
        conversationLength: conversation?.length || 0,
        isForcingSummary
      })

      // Pass conversation history as messages array for proper context
      const conversationMessages = conversation?.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))

      const response = await $fetch<{ content: string }>('/api/chat', {
        method: 'POST',
        body: { 
          provider, 
          apiKey, 
          model, 
          systemPrompt, 
          userPrompt,
          messages: conversationMessages,
          max_tokens: isForcingSummary ? 2000 : 600 
        },
        signal
      }).catch((error) => {
        console.error('[Stage 3] API Error Details:', {
          status: error.status,
          statusCode: error.statusCode,
          statusMessage: error.statusMessage,
          message: error.message,
          data: error.data,
          fullError: JSON.stringify(error, null, 2)
        })
        throw error
      })

      console.log('[Stage 3] Synthesis response (regular mode):', response.content?.length, 'chars')

      const cleaned = response.content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
      const parsed = JSON.parse(cleaned)
      
      console.log('[Stage 3] Parsed response:', {
        hasAnswer: !!parsed.answer,
        answerLength: parsed.answer?.length || 0,
        referencesCount: parsed.references?.length || 0,
        referenceIds: parsed.references?.map((r: any) => r.id) || []
      })
      
      const allowedIds = new Set(topEvaluated.map(e => e.id))
      console.log('[Stage 3] Allowed IDs:', Array.from(allowedIds))
      
      const references = Array.isArray(parsed.references)
        ? parsed.references
            .filter((r: any) => {
              const allowed = allowedIds.has(r.id)
              if (!allowed) {
                console.warn('[Stage 3] Filtered out reference with unknown ID:', r.id)
              }
              return allowed
            })
            .map((r: any) => {
              const result = resultMap.get(r.id)
              return {
                id: r.id,
                title: result?.title || r.id,
                reason: String(r.reason || '').substring(0, 150)
              }
            })
        : []

      console.log('[Stage 3] Final references:', references.length, 'kept')

      return {
        content: String(parsed.answer || ''),
        references,
        plan: undefined
      }
    } catch (error) {
      console.error('[Stage 3] Synthesis error:', error)
      return { content: '', references: [], plan: undefined }
    }
  }

  async function generateResponse(
    query: string,
    searchResults: SearchResult[],
    provider: Provider,
    apiKey: string,
    model: string,
    mode?: ChatMode,
    intent?: ResponseIntent,
    conversation?: ConversationTurn[],
    onThinkingUpdate?: (stage: string, content: string, complete: boolean) => void,
    signal?: AbortSignal
  ): Promise<LLMResponse> {
    try {
      console.log('[MultiStage] Starting three-stage reasoning...')

      // Skip material search for concept mode - it's purely conversational
      if (mode === 'concept') {
        console.log('[MultiStage] Concept mode: skipping material search')
        
        onThinkingUpdate?.('Analyzing', 'Understanding your project concept...', false)
        const analysis = { concepts: [], goals: [], contentTypes: [], wantsPlan: false }
        onThinkingUpdate?.('Analyzing', 'Project concept development', true)
        
        onThinkingUpdate?.('Synthesizing', 'Crafting your response...', false)
        const synthesis = await synthesizeResponse(query, analysis, [], [], provider, apiKey, model, mode, conversation, signal)
        onThinkingUpdate?.('Synthesizing', 'Response complete', true)
        
        console.log('[MultiStage] Synthesis complete')
        
        return {
          content: synthesis.content,
          references: synthesis.references || [],
          plan: undefined,
          thinking: {
            analysis: 'Project concept development',
            evaluation: '',
            synthesis: 'Response complete'
          }
        }
      }

      // STAGE 1: Analyze query
      onThinkingUpdate?.('Analyzing', 'Understanding your question...', false)
      const analysis = await analyzeQuery(query, provider, apiKey, model, mode, conversation, signal)
      const planMode = analysis.wantsPlan ? ' [Plan mode]' : ''
      const modeLabel = mode && mode !== 'ask' ? ` [${mode} mode]` : ''
      const analysisText = `Key concepts: ${analysis.concepts.join(', ')}\nGoals: ${analysis.goals.join(', ')}\nPreferred types: ${analysis.contentTypes.join(', ')}${planMode}${modeLabel}`
      onThinkingUpdate?.('Analyzing', analysisText, true)
      console.log('[MultiStage] Analysis:', analysis)

      // STAGE 2: Evaluate results
      onThinkingUpdate?.('Evaluating', 'Scoring materials for relevance...', false)
      const evaluation = await evaluateResults(query, analysis, searchResults, provider, apiKey, model, signal)
      const topScored = evaluation.filter(e => e.score >= 6).length
      const evalText = `Reviewed ${evaluation.length} materials, ${topScored} highly relevant`
      onThinkingUpdate?.('Evaluating', evalText, true)
      console.log('[MultiStage] Evaluation:', evaluation.length, 'results scored')

      // STAGE 3: Synthesize response
      onThinkingUpdate?.('Synthesizing', analysis.wantsPlan ? 'Building your learning plan...' : 'Crafting your response...', false)
      const synthesis = await synthesizeResponse(query, analysis, evaluation, searchResults, provider, apiKey, model, mode, conversation, signal)
      const synthText = analysis.wantsPlan && synthesis.plan
        ? `Created ${synthesis.plan.steps.length}-step learning plan`
        : `Generated answer with ${synthesis.references?.length || 0} references`
      onThinkingUpdate?.('Synthesizing', synthText, true)
      console.log('[MultiStage] Synthesis complete')

      return {
        content: synthesis.content,
        references: synthesis.references,
        plan: synthesis.plan,
        thinking: {
          analysis: analysisText,
          evaluation: evalText,
          synthesis: synthText
        }
      }
    } catch (error: any) {
      console.error('LLM API Error:', error)
      
      let errorMessage = 'Failed to generate response'
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
