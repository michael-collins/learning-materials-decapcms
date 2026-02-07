<script setup lang="ts">
import { ref, nextTick, onMounted, watch } from 'vue'
import { Bot, Send, Sparkles, Trash2, Maximize2, Minimize2, Settings, Download, ChevronDown, Check, FileText, MoreVertical, X, Copy } from 'lucide-vue-next'
import { Dialog, DialogContentFullscreen, DialogContentPopover, DialogTitle, DialogDescription, DialogClose } from '~/components/ui/dialog'
import Popover from '~/components/ui/popover/Popover.vue'
import PopoverContent from '~/components/ui/popover/PopoverContent.vue'
import PopoverTrigger from '~/components/ui/popover/PopoverTrigger.vue'
import Button from '~/components/ui/button/Button.vue'
import Textarea from '~/components/ui/textarea/Textarea.vue'
import ChatbotSettings from '~/components/ChatbotSettings.vue'
import { useChatbotSettings } from '~/composables/useChatbotSettings'
import { useLLMChat } from '~/composables/useLLMChat'
import { useLearningPlanExport } from '~/composables/useLearningPlanExport'
import { useChatModes } from '~/composables/useChatModes'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  model?: string // The AI model used to generate this response
  thinking?: {
    stage: string
    content: string
    complete: boolean
  }[]
  references?: Array<{
    id: string
    title: string
    reason: string
  }>
  sources?: Array<{
    title: string
    type: string
    path: string
    description?: string
    difficulty?: string
    duration?: string
  }>
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

const props = defineProps<{
  open?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const { loadIndex, search, hybridSearch, detectIntent, isLoading: searchIndexLoading, isLoaded } = useSchemaEnhancedSearch()
const { exportToWord, exportConceptToWord } = useLearningPlanExport()
const { currentMode, modeConfig, allModes, setMode, loadMode } = useChatModes()

// Mode dropdown state
const isModeDropdownOpen = ref(false)
const modeDropdownRef = ref<HTMLElement | null>(null)

const CHAT_HISTORY_KEY = 'ai-chat-history'
const CHAT_HISTORY_MAX_AGE = 24 * 60 * 60 * 1000 // 24 hours

// Load messages from localStorage or use default
const loadChatHistory = () => {
  // Only access localStorage on client side
  if (typeof window === 'undefined') {
    return [
      {
        id: '1',
        role: 'assistant',
        content: "Hello! I'm Nav Bot 3000, your learning assistant. I can help you discover learning materials, answer questions about courses and lessons, and suggest learning paths.\n\n💡 **Tip:** Enable **Enhanced Mode** in settings for AI-powered conversational responses with your own API key.",
        timestamp: new Date()
      }
    ]
  }
  
  try {
    const stored = localStorage.getItem(CHAT_HISTORY_KEY)
    if (stored) {
      const { messages: savedMessages, timestamp } = JSON.parse(stored)
      // Check if cache is still valid
      if (Date.now() - timestamp < CHAT_HISTORY_MAX_AGE) {
        return savedMessages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }))
      }
    }
  } catch (error) {
    console.error('Failed to load chat history:', error)
  }
  return [
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm Nav Bot 3000, your learning assistant. I can help you discover learning materials, answer questions about courses and lessons, and suggest learning paths.\n\n💡 **Tip:** Enable **Enhanced Mode** in settings for AI-powered conversational responses with your own API key.",
      timestamp: new Date()
    }
  ]
}

const messages = ref<Message[]>(loadChatHistory())

// Save messages to localStorage
const saveChatHistory = () => {
  // Only access localStorage on client side
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify({
      messages: messages.value,
      timestamp: Date.now()
    }))
  } catch (error) {
    console.error('Failed to save chat history:', error)
  }
}

// Clear chat history
const clearChatHistory = () => {
  messages.value = [
    {
      id: Date.now().toString(),
      role: 'assistant',
      content: "Chat history cleared. How can I help you today?\n\n💡 **Tip:** Enable **Enhanced Mode** in settings for AI-powered conversational responses.",
      timestamp: new Date()
    }
  ]
  saveChatHistory()
}

// Watch messages and save to localStorage
watch(messages, () => {
  saveChatHistory()
}, { deep: true })
const inputText = ref('')
const isLoading = ref(false)
const abortController = ref<AbortController | null>(null)
const messagesEndRef = ref<HTMLElement | null>(null)
const textareaRef = ref<HTMLElement | null>(null)
const isFullscreen = ref(false)
const settingsOpen = ref(false)
const moreMenuOpen = ref(false)
const isMobile = ref(false)

// Check if viewport is mobile size
const checkMobileViewport = () => {
  if (typeof window !== 'undefined') {
    isMobile.value = window.innerWidth < 640 // sm breakpoint
  }
}

// Auto-exit fullscreen when switching to mobile viewport
watch(isMobile, (newIsMobile) => {
  if (newIsMobile && isFullscreen.value) {
    isFullscreen.value = false
  }
})

const { settings, canUseEnhancedMode, isConfigured, currentModel } = useChatbotSettings()
const { generateResponse, generateQueryExpansion, rerankResults, generateRetrievalHints } = useLLMChat()

// Concept mode: show "Generate Project Brief" button after at least one user+assistant exchange
const canGenerateConceptSummary = computed(() => {
  if (currentMode.value !== 'concept') return false
  if (isLoading.value) return false
  // Need at least 1 user message that got a response (greeting + user msg + AI reply = 3+)
  // And the last message must be from the assistant (response completed)
  const userCount = messages.value.filter(m => m.role === 'user').length
  const lastMessage = messages.value[messages.value.length - 1]
  return userCount >= 1 && messages.value.length >= 3 && lastMessage?.role === 'assistant'
})

// Already has a generated concept summary in this session — but allow regeneration
const hasConceptSummary = computed(() => {
  // Only hide the button if the LAST assistant message contains a concept summary
  // This allows regeneration after continuing the conversation
  const lastAssistant = [...messages.value].reverse().find(m => m.role === 'assistant')
  if (!lastAssistant) return false
  return lastAssistant.content.includes('# PROJECT CONCEPT') || lastAssistant.content.includes('# 🎯 PROJECT CONCEPT')
})

async function generateConceptSummary() {
  if (isLoading.value) return
  // Send a special trigger that the LLM composable recognizes
  inputText.value = '__GENERATE_CONCEPT_SUMMARY__'
  await sendMessage()
}

// Load search index when component mounts
onMounted(async () => {
  try {
    await loadIndex()
    loadMode() // Load saved chat mode
    
    // Initial mobile check
    checkMobileViewport()
    
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.mode-dropdown')) {
        isModeDropdownOpen.value = false
      }
    }
    
    // Close dropdown on Escape key
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isModeDropdownOpen.value) {
        isModeDropdownOpen.value = false
      }
    }
    
    // Check mobile viewport on resize
    const handleResize = () => {
      checkMobileViewport()
    }
    
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleResize)
    
    // Cleanup on unmount
    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleResize)
    })
  } catch (error) {
    console.error('Failed to load search index:', error)
  }
})

function buildContextResponse(query: string, results: any[]): string {
  if (results.length === 0) {
    return `I couldn't find any materials directly matching "${query}". Could you try rephrasing your question or asking about a different topic? I have materials on 3D modeling, animation, texturing, rigging, rendering, and more.`
  }
  
  // Build a natural response based on search results
  const topResult = results[0]
  let response = ''
  
  // Determine the type of response based on query intent
  if (query.toLowerCase().includes('how') || query.toLowerCase().includes('learn')) {
    response = `To learn about ${query.toLowerCase().replace(/^(how|learn|to|about|the)\s+/g, '')}, I recommend starting with **${topResult.title}**.\n\n`
  } else if (query.toLowerCase().includes('what') || query.toLowerCase().includes('explain')) {
    response = `**${topResult.title}**\n\n`
  } else if (query.toLowerCase().includes('beginner') || query.toLowerCase().includes('start')) {
    response = `For beginners, I recommend starting with **${topResult.title}**.\n\n`
  } else {
    response = `I found ${results.length} relevant ${results.length === 1 ? 'resource' : 'resources'}. Here's the best match:\n\n**${topResult.title}**\n\n`
  }
  
  // Add description
  if (topResult.description) {
    response += `${topResult.description}\n\n`
  }
  
  // Add learning objectives if available
  if (topResult.learningObjectives && topResult.learningObjectives.length > 0) {
    response += `**What you'll learn:**\n`
    topResult.learningObjectives.slice(0, 3).forEach((obj: string) => {
      response += `• ${obj}\n`
    })
    response += `\n`
  }
  
  // Add difficulty and duration info on one line
  const metadata: string[] = []
  if (topResult.difficulty) metadata.push(`${topResult.difficulty}`)
  if (topResult.duration) metadata.push(`${topResult.duration}`)
  if (metadata.length > 0) {
    response += `*${metadata.join(' • ')}*\n`
  }
  
  // Add note about additional resources if there are more results
  if (results.length > 1) {
    response += `\nSee ${results.length - 1} more related ${results.length === 2 ? 'resource' : 'resources'} below.`
  }
  
  return response.trim()
}

function stopGeneration() {
  if (abortController.value) {
    abortController.value.abort()
    abortController.value = null
  }
  isLoading.value = false
}

async function sendMessage() {
  if (!inputText.value.trim() || isLoading.value) return
  
  // Check if search index is loaded
  if (!isLoaded.value) {
    const errorMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: "I'm still loading the learning materials index. Please wait a moment and try again.",
      timestamp: new Date()
    }
    messages.value.push(errorMessage)
    return
  }
  
  const userMessage: Message = {
    id: Date.now().toString(),
    role: 'user',
    content: inputText.value.startsWith('__GENERATE_CONCEPT_SUMMARY__')
      ? '📋 Generate my project concept summary'
      : inputText.value,
    timestamp: new Date()
  }
  
  messages.value.push(userMessage)
  const query = inputText.value
  inputText.value = ''
  isLoading.value = true
  abortController.value = new AbortController()
  
  // Scroll to bottom
  await nextTick()
  messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' })
  
  try {
    // Search for relevant content
    let results = search(query, { limit: 10 })
    const intent = detectIntent(query)
    const topScore = (results[0] as any)?.score || 0

    let expandedQueryForRetrieval = query

    // Lightweight generic expansion for common nouns (not tied to specific content)
    const genericSynonyms: Record<string, string[]> = {
      furniture: ['chair', 'table', 'sofa', 'seating'],
      seating: ['chair', 'stool', 'bench']
    }
    const lowerQuery = query.toLowerCase()
    const genericTerms = Object.entries(genericSynonyms)
      .filter(([key]) => lowerQuery.includes(key))
      .flatMap(([, terms]) => terms)

    if (genericTerms.length > 0) {
      expandedQueryForRetrieval = `${expandedQueryForRetrieval} ${genericTerms.join(' ')}`
    }

    // Use LLM retrieval hints to improve coverage and content-type targeting
    if (settings.value.enhancedMode && isConfigured.value) {
      const hints = await generateRetrievalHints(
        query,
        settings.value.provider,
        settings.value.apiKey,
        settings.value.model
      )

      if (hints.keywords.length > 0) {
        expandedQueryForRetrieval = `${query} ${hints.keywords.join(' ')}`
        const expandedResults = search(expandedQueryForRetrieval, { limit: 10 })
        const merged = new Map<string, any>()
        for (const item of [...results, ...expandedResults]) {
          merged.set(item.id, item)
        }
        results = Array.from(merged.values())
      }

      if (hints.preferredTypes.length > 0) {
        const preferredSet = new Set(hints.preferredTypes)
        results = results.sort((a, b) => {
          const aPref = preferredSet.has(a.type) ? 1 : 0
          const bPref = preferredSet.has(b.type) ? 1 : 0
          if (aPref !== bPref) return bPref - aPref
          return (b.score || 0) - (a.score || 0)
        })
      }
    }
    
    console.log('[Chat] Enhanced mode:', settings.value.enhancedMode, 'Configured:', isConfigured.value)
    console.log('[Chat] Provider:', settings.value.provider, 'Model:', settings.value.model)
    
    let responseText = ''
    let llmResponse: { content: string; error?: string; references?: Array<{ id: string; title: string; reason: string }> } | null = null
    
    // Use hybrid retrieval (embeddings + lexical) when supported
    if (settings.value.enhancedMode && isConfigured.value && (settings.value.provider === 'openai' || settings.value.provider === 'google')) {
      try {
        results = await hybridSearch(expandedQueryForRetrieval, {
          limit: 30,
          provider: settings.value.provider,
          apiKey: settings.value.apiKey,
          model: settings.value.provider === 'openai' ? 'text-embedding-3-small' : 'text-embedding-004'
        })
      } catch (error) {
        console.error('Hybrid search failed, falling back to lexical:', error)
      }
    }

    // If enhanced mode is enabled and results are weak, expand the query using LLM
    if (settings.value.enhancedMode && isConfigured.value && (results.length === 0 || topScore < 10)) {
      const expandedTerms = await generateQueryExpansion(
        query,
        settings.value.provider,
        settings.value.apiKey,
        settings.value.model
      )

      if (expandedTerms.length > 0) {
        const expandedQuery = `${query} ${expandedTerms.join(' ')}`
        results = search(expandedQuery, { limit: 10 })
      }
    }

    // Rerank results with LLM for better semantic ordering (enhanced mode only)
    if (settings.value.enhancedMode && isConfigured.value && results.length > 1) {
      results = await rerankResults(
        query,
        results.slice(0, 30),
        settings.value.provider,
        settings.value.apiKey,
        settings.value.model
      )
    }

    results = results.slice(0, 10)

    // Use LLM if enhanced mode is enabled and configured
    if (settings.value.enhancedMode && isConfigured.value) {
      console.log('[Chat] Using LLM for response')
      
      // Create assistant message with thinking placeholder
      const assistantId = (Date.now() + 1).toString()
      const thinkingMessage: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        model: settings.value.model,
        thinking: []
      }
      messages.value.push(thinkingMessage)
      await nextTick()
      messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' })
      
      try {
        // Concept mode needs full conversation history; other modes use last 4 messages
        const contextLimit = currentMode.value === 'concept' ? 20 : 4
        const conversationContext = buildConversationContext(contextLimit)
        
        // Callback to update thinking in real-time
        const onThinkingUpdate = (stage: string, content: string, complete: boolean) => {
          const msg = messages.value.find(m => m.id === assistantId)
          if (msg && msg.thinking) {
            const existingIdx = msg.thinking.findIndex(t => t.stage === stage)
            if (existingIdx >= 0) {
              msg.thinking[existingIdx] = { stage, content, complete }
            } else {
              msg.thinking.push({ stage, content, complete })
            }
          }
          nextTick(() => messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' }))
        }
        
        llmResponse = await generateResponse(
          query,
          results,
          settings.value.provider,
          settings.value.apiKey,
          settings.value.model,
          currentMode.value, // Pass current chat mode
          intent,
          conversationContext,
          onThinkingUpdate,
          abortController.value?.signal
        )
        
        // Update message with final response
        const msg = messages.value.find(m => m.id === assistantId)
        if (msg) {
          if (llmResponse.error) {
            msg.content = `⚠️ **Enhanced mode error:** ${llmResponse.error}\n\nFalling back to search results:\n\n${buildContextResponse(query, results)}`
          } else {
            msg.content = llmResponse.content
            msg.references = llmResponse.references
            msg.plan = llmResponse.plan
          }
        }
      } catch (error: any) {
        // Update message with error
        const msg = messages.value.find(m => m.id === assistantId)
        if (msg) {
          msg.content = `⚠️ **Enhanced mode unavailable:** ${error.message}\n\nShowing search results instead:\n\n${buildContextResponse(query, results)}`
        }
      }
      
      isLoading.value = false
      abortController.value = null
      await nextTick()
      messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' })
      return
    } else {
      console.log('[Chat] Using basic search response')
      // Use basic context response
      responseText = buildContextResponse(query, results)
    }
    
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: responseText,
      timestamp: new Date(),
      model: settings.value.enhancedMode ? settings.value.model : undefined,
      references: settings.value.enhancedMode ? (llmResponse?.references || undefined) : undefined,
      sources: results.slice(0, 5).map(r => ({
        title: r.title,
        type: r.type,
        path: r.id,
        description: r.description,
        difficulty: r.difficulty,
        duration: r.duration
      }))
    }
    
    messages.value.push(assistantMessage)
    
    // Scroll to bottom
    await nextTick()
    messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' })
  } catch (error) {
    console.error('Error sending message:', error)
    const errorMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: "Sorry, I encountered an error while searching. Please try again.",
      timestamp: new Date()
    }
    messages.value.push(errorMessage)
  } finally {
    isLoading.value = false
    abortController.value = null
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })
}

function buildConversationContext(limit = 4) {
  return messages.value
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-limit)
    .map(m => ({
      role: m.role,
      content: m.content
    }))
}

async function downloadPlan(message: Message) {
  if (!message.plan) return
  
  try {
    await exportToWord(
      message.plan.title,
      message.plan.description,
      message.plan.steps
    )
  } catch (error) {
    console.error('Failed to export plan:', error)
  }
}

async function downloadConcept(message: Message) {
  try {
    console.log('[Download] Starting concept export, content length:', message.content.length)
    await exportConceptToWord(message.content)
    console.log('[Download] Concept export completed successfully')
  } catch (error) {
    console.error('Failed to export concept:', error)
    alert('Failed to download concept document. Please check the browser console for details.')
  }
}

async function copyMessageContent(message: Message) {
  try {
    await navigator.clipboard.writeText(message.content)
  } catch (error) {
    console.error('[Copy] Failed to copy message:', error)
  }
}

function parseMarkdown(text: string): string {
  let html = text
  
  // Headings (must come before bold to avoid conflicts)
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold mt-3 mb-1">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold mt-4 mb-2">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold mt-4 mb-2">$1</h1>')
  
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  
  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="my-3 border-border">')
  
  // Numbered lists
  html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<li class="ml-4">$2</li>')
  html = html.replace(/(<li class="ml-4">.*?<\/li>\n?)+/g, (match) => {
    // Check if it's part of a bullet list by looking for • in context
    if (!match.includes('•')) {
      return '<ol class="list-decimal list-outside space-y-0.5 my-2">' + match + '</ol>'
    }
    return match
  })
  
  // Bullet lists - handle them before line break conversion
  html = html.replace(/^[•\-]\s+(.+)$/gm, '<li class="ml-4">$1</li>')
  html = html.replace(/(<li class="ml-4">.*<\/li>\n?)+/g, '<ul class="list-disc list-outside space-y-0.5 my-2">$&</ul>')
  
  // Line breaks - convert double newlines to paragraph breaks, single to br
  html = html.replace(/\n\n/g, '</p><p class="mt-2">')
  html = html.replace(/\n/g, '<br>')
  
  // Wrap in paragraph with no default margin
  html = `<p class="m-0">${html}</p>`
  
  return html
}
</script>

<template>
  <Dialog v-model:open="isOpen" :modal="isFullscreen">
    <!-- Popover Mode -->
    <DialogContentPopover 
      v-if="!isFullscreen" 
      class="flex flex-col p-0 gap-0"
      @open-auto-focus="(e) => { e.preventDefault(); textareaRef?.focus() }"
    >
      <DialogTitle class="sr-only">Learning Assistant Chat</DialogTitle>
      <DialogDescription class="sr-only">Chat with the AI learning assistant to find educational materials and get help with your learning journey.</DialogDescription>
      
      <!-- Header -->
      <div class="flex items-center gap-3 border-b pl-4 pr-3 py-3 shrink-0">
        <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/90 to-primary shrink-0">
          <Sparkles class="h-4 w-4 text-primary-foreground" />
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="text-base font-semibold">Nav Bot 3000</h2>
          <button
            v-if="settings.enhancedMode"
            @click="settingsOpen = true"
            class="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
            :aria-label="'Enhanced mode enabled using ' + currentModel.name + '. Click to open settings'"
          >
            <Sparkles class="h-2.5 w-2.5" />
            {{ currentModel.name }}
          </button>
        </div>
        <Popover v-model:open="moreMenuOpen">
          <PopoverTrigger as-child>
            <Button
              variant="ghost"
              size="icon"
              class="text-muted-foreground hover:text-foreground shrink-0 h-9 w-9 sm:h-8 sm:w-8 touch-manipulation"
              aria-label="More options"
            >
              <MoreVertical class="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent class="w-48 p-1" align="end">
            <Button
              variant="ghost"
              class="w-full justify-start h-10 sm:h-9 px-2 text-sm font-normal touch-manipulation"
              @click="settingsOpen = true; moreMenuOpen = false"
            >
              <Settings class="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button
              variant="ghost"
              class="w-full justify-start h-10 sm:h-9 px-2 text-sm font-normal text-destructive hover:text-destructive touch-manipulation"
              @click="clearChatHistory(); moreMenuOpen = false"
            >
              <Trash2 class="h-4 w-4 mr-2" />
              Clear History
            </Button>
          </PopoverContent>
        </Popover>
        <Button
          v-if="!isMobile"
          variant="ghost"
          size="icon"
          @click="isFullscreen = true"
          class="text-muted-foreground hover:text-foreground shrink-0 h-9 w-9 sm:h-8 sm:w-8 touch-manipulation"
          aria-label="Expand to fullscreen"
        >
          <Maximize2 class="h-4 w-4" />
        </Button>
        <div v-if="!isMobile" class="w-px h-5 bg-border" />
        <DialogClose as-child>
          <Button
            variant="ghost"
            size="icon"
            class="text-muted-foreground hover:text-foreground shrink-0 h-9 w-9 sm:h-8 sm:w-8 touch-manipulation"
            aria-label="Close chat"
          >
            <X class="h-4 w-4" />
          </Button>
        </DialogClose>
      </div>

      <!-- Mode Selector -->
      <div class="px-3 py-2 border-b border-border">
        <div class="flex items-center gap-2">
          <label class="text-xs font-medium text-muted-foreground shrink-0">Mode</label>
          <div ref="modeDropdownRef" class="mode-dropdown relative flex-1">
          <Button
            @click.stop="isModeDropdownOpen = !isModeDropdownOpen"
            variant="outline"
            class="w-full justify-start h-9 sm:h-8 text-xs gap-2 touch-manipulation"
            :aria-expanded="isModeDropdownOpen"
            aria-haspopup="listbox"
            aria-label="Select chat mode"
            :aria-controls="isModeDropdownOpen ? 'mode-dropdown-list' : undefined"
          >
            <Icon :name="modeConfig.icon" class="h-3 w-3" />
            <span class="flex-1 text-left">{{ modeConfig.label }}</span>
            <ChevronDown :class="['h-3 w-3 transition-transform duration-200', isModeDropdownOpen ? 'rotate-180' : '']" />
          </Button>
          
          <Transition name="dropdown">
            <div
              v-if="isModeDropdownOpen"
              id="mode-dropdown-list"
              role="listbox"
              :aria-label="'Chat modes'"
              class="absolute left-0 right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden"
              @click.stop
            >
              <button
                v-for="mode in allModes"
                :key="mode.id"
                @click="setMode(mode.id); isModeDropdownOpen = false"
                role="option"
                :aria-selected="currentMode === mode.id"
                class="w-full flex items-center gap-2 px-2 py-2.5 sm:py-2 text-xs hover:bg-muted transition-colors text-left min-h-[44px] sm:min-h-0 touch-manipulation"
              >
                <Icon :name="mode.icon" class="h-3.5 w-3.5 shrink-0" />
                <div class="flex flex-col flex-1 min-w-0">
                  <span class="font-medium">{{ mode.label }}</span>
                  <span class="text-[10px] text-muted-foreground line-clamp-1">{{ mode.description }}</span>
                </div>
                <Check v-if="currentMode === mode.id" class="h-3.5 w-3.5 shrink-0 text-primary" />
              </button>
            </div>
          </Transition>
          </div>
        </div>
      </div>

      <!-- Messages Area -->
      <div class="flex-1 overflow-y-auto px-4">
        <div class="py-4 space-y-4">
          <!-- Welcome Message -->
          <div v-if="messages.length === 1" class="text-center py-8 space-y-3">
            <div class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10">
              <Sparkles class="h-6 w-6 text-primary" />
            </div>
            <div class="space-y-1">
              <h3 class="text-lg font-bold">How Can I Help?</h3>
              <p class="text-xs text-muted-foreground">Ask about our learning materials</p>
            </div>
          </div>

          <!-- Messages -->
          <div
            v-for="message in messages"
            :key="message.id"
            class="group relative"
          >
            <!-- Assistant Message -->
            <div v-if="message.role === 'assistant'" class="flex gap-2 items-start">
              <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/90 to-primary mt-1">
                <Bot class="h-3 w-3 text-primary-foreground" />
              </div>
              <div class="flex-1 space-y-2 overflow-hidden">
                <!-- Copy Button -->
                <div class="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    @click="copyMessageContent(message)"
                    class="h-6 w-6"
                    title="Copy message"
                  >
                    <Copy class="h-3 w-3" />
                  </Button>
                </div>
                <!-- Thinking Process -->
                <div v-if="message.thinking && message.thinking.length > 0" class="space-y-1 mb-3">
                  <div
                    v-for="think in message.thinking"
                    :key="think.stage"
                    class="flex items-start gap-2 text-[10px] text-muted-foreground"
                  >
                    <div class="flex items-center gap-1 min-w-[80px]">
                      <div v-if="!think.complete" class="h-2 w-2 rounded-full bg-primary/60 animate-pulse"></div>
                      <div v-else class="h-2 w-2 rounded-full bg-primary/30"></div>
                      <span class="font-medium">{{ think.stage }}</span>
                    </div>
                    <span class="flex-1 leading-relaxed opacity-80">{{ think.content }}</span>
                  </div>
                </div>

                <div class="text-xs leading-relaxed [&_strong]:font-semibold [&_ul]:my-2 [&_li]:leading-snug" v-html="parseMarkdown(message.content)"></div>

                <!-- Concept Summary Export Button -->
                <div v-if="message.role === 'assistant' && (message.content.includes('# PROJECT CONCEPT') || message.content.includes('# 🎯 PROJECT CONCEPT'))" class="mt-4 flex justify-center">
                  <Button
                    size="sm"
                    @click="downloadConcept(message)"
                    class="h-7 text-xs gap-1"
                  >
                    <Download class="h-3 w-3" />
                    Download Project Brief (.docx)
                  </Button>
                </div>

                <!-- Learning Plan -->
                <div v-if="message.plan" class="space-y-3 mt-4">
                  <div class="flex items-center justify-between">
                    <p class="text-sm font-semibold text-foreground">📋 Learning Plan</p>
                    <Button
                      size="sm"
                      variant="outline"
                      @click="downloadPlan(message)"
                      class="h-7 text-xs gap-1"
                    >
                      <Download class="h-3 w-3" />
                      Download Plan
                    </Button>
                  </div>
                  
                  <div class="flex flex-col gap-3">
                    <div
                      v-for="(step, idx) in message.plan.steps"
                      :key="step.step"
                      class="flex gap-3 relative"
                    >
                      <!-- Step indicator -->
                      <div class="flex flex-col items-center">
                        <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold bg-primary text-primary-foreground">
                          {{ step.step }}
                        </div>
                        <div v-if="idx !== message.plan.steps.length - 1" class="w-0.5 flex-1 bg-border min-h-6 mt-1"></div>
                      </div>
                      
                      <!-- Step content -->
                      <div class="flex-1 pb-2">
                        <div class="flex items-center gap-2 mb-1">
                          <h4 class="text-sm font-semibold">{{ step.title }}</h4>
                          <span v-if="step.duration" class="text-[10px] text-muted-foreground">{{ step.duration }}</span>
                        </div>
                        <p v-if="step.description" class="text-xs text-muted-foreground mb-2">{{ step.description }}</p>
                        <div v-if="step.materials.length > 0" class="flex flex-wrap gap-1.5">
                          <NuxtLink
                            v-for="material in step.materials"
                            :key="material.id"
                            :to="material.id"
                            class="inline-flex items-center gap-1 rounded-md border bg-card px-2 py-1 text-xs font-medium text-foreground hover:bg-accent hover:border-primary/50 transition-colors"
                            :title="material.reason"
                          >
                            <span class="text-[10px] text-muted-foreground">{{ material.type }}</span>
                            <span class="truncate max-w-[120px]">{{ material.title }}</span>
                          </NuxtLink>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="message.references && message.references.length > 0" class="space-y-1">
                  <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Recommended</p>
                  <div class="flex flex-wrap gap-1.5">
                    <NuxtLink
                      v-for="ref in message.references"
                      :key="ref.id"
                      :to="ref.id"
                      class="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-1 text-[10px] font-medium text-foreground hover:bg-accent hover:border-primary/50 transition-colors"
                      :title="ref.reason"
                    >
                      <span class="truncate max-w-[140px]">{{ ref.title }}</span>
                    </NuxtLink>
                  </div>
                </div>
                
                <!-- Sources (Compact for popover) -->
                <div v-if="message.sources && message.sources.length > 0" class="space-y-1.5">
                  <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Related</p>
                  <div class="space-y-1">
                    <NuxtLink
                      v-for="source in message.sources.slice(0, 3)"
                      :key="source.path"
                      :to="source.path"
                      class="flex items-center gap-2 p-2 rounded border bg-card hover:bg-accent hover:border-primary/50 transition-all group/link"
                    >
                      <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-primary group-hover/link:bg-primary group-hover/link:text-primary-foreground transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                        </svg>
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-xs font-medium group-hover/link:text-primary transition-colors truncate">{{ source.title }}</p>
                      </div>
                    </NuxtLink>
                  </div>
                </div>
                
                <!-- Divider -->
                <div class="border-t my-3"></div>
                
                <div class="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                  <div class="flex items-center gap-2">
                    <span>{{ formatTime(message.timestamp) }}</span>
                    <span v-if="message.model" class="flex items-center gap-1">
                      • <Sparkles class="h-2.5 w-2.5" /> {{ message.model }}
                    </span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    @click="copyMessageContent(message)"
                    class="h-6 w-6"
                    title="Copy message"
                  >
                    <Copy class="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            <!-- User Message -->
            <div v-else class="flex gap-2 items-start justify-end">
              <div class="flex-1 flex justify-end">
                <div class="rounded-lg bg-primary px-3 py-2 text-primary-foreground max-w-[85%]">
                  <p class="text-xs">{{ message.content }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Concept mode: Generate the concept button (inside chat area) -->
          <div v-if="canGenerateConceptSummary && !hasConceptSummary" class="flex justify-center py-3">
            <Button
              size="sm"
              class="gap-2 text-xs bg-foreground text-background hover:bg-foreground/90 shadow-sm"
              :disabled="isLoading"
              @click="generateConceptSummary"
            >
              <FileText class="h-3.5 w-3.5" />
              Generate Project Brief
            </Button>
          </div>

          <!-- Loading indicator -->
          <div v-if="isLoading" class="flex gap-2 items-start">
            <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/90 to-primary mt-1">
              <Bot class="h-3 w-3 text-primary-foreground" />
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-1 text-xs text-muted-foreground">
                <span class="inline-block h-1 w-1 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]"></span>
                <span class="inline-block h-1 w-1 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]"></span>
                <span class="inline-block h-1 w-1 rounded-full bg-muted-foreground/40 animate-bounce"></span>
              </div>
            </div>
          </div>

          <!-- Scroll anchor -->
          <div ref="messagesEndRef"></div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="border-t bg-background px-4 py-3 shrink-0">
        <form @submit.prevent="sendMessage" class="flex items-end gap-2">
          <Textarea
            ref="textareaRef"
            v-model="inputText"
            placeholder="Ask a question..."
            :disabled="isLoading"
            class="min-h-[40px] max-h-[100px] text-sm resize-none"
            @keydown="handleKeydown"
          />
          <Button
            v-if="isLoading"
            type="button"
            size="sm"
            @click="stopGeneration"
            class="shrink-0"
            variant="destructive"
          >
            <Icon name="lucide:square" class="h-4 w-4" />
          </Button>
          <Button
            v-else
            type="submit"
            size="sm"
            :disabled="!inputText.trim()"
            class="shrink-0"
          >
            <Send class="h-4 w-4" />
          </Button>
        </form>
      </div>
    </DialogContentPopover>

    <!-- Fullscreen Mode -->
    <DialogContentFullscreen v-else class="flex flex-col p-0 gap-0">
      <DialogTitle class="sr-only">Nav Bot 3000 Chat</DialogTitle>
      <DialogDescription class="sr-only">Chat with Nav Bot 3000, your AI learning assistant, to find educational materials and get help with your learning journey.</DialogDescription>
      
      <!-- Header -->
      <div class="flex items-center gap-3 border-b pl-6 pr-6 py-4 shrink-0">
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/90 to-primary shrink-0">
          <Sparkles class="h-5 w-5 text-primary-foreground" />
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="text-lg font-semibold">Nav Bot 3000</h2>
          <p class="text-sm text-muted-foreground flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-1.5">
            <span>Discover courses, lessons, and learning paths</span>
            <button
              v-if="settings.enhancedMode"
              @click="settingsOpen = true"
              class="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
              :aria-label="'Enhanced mode enabled using ' + currentModel.name + '. Click to open settings'"
            >
              <span class="hidden sm:inline">•</span> <Sparkles class="h-3 w-3" /> {{ currentModel.name }}
            </button>
          </p>
        </div>
        <Popover v-model:open="moreMenuOpen">
          <PopoverTrigger as-child>
            <Button
              variant="ghost"
              size="icon"
              class="text-muted-foreground hover:text-foreground shrink-0 h-10 w-10 touch-manipulation"
              aria-label="More options"
            >
              <MoreVertical class="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent class="w-48 p-1" align="end">
            <Button
              variant="ghost"
              class="w-full justify-start h-10 sm:h-9 px-2 text-sm font-normal touch-manipulation"
              @click="settingsOpen = true; moreMenuOpen = false"
            >
              <Settings class="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button
              variant="ghost"
              class="w-full justify-start h-10 sm:h-9 px-2 text-sm font-normal text-destructive hover:text-destructive touch-manipulation"
              @click="clearChatHistory(); moreMenuOpen = false"
            >
              <Trash2 class="h-4 w-4 mr-2" />
              Clear History
            </Button>
          </PopoverContent>
        </Popover>
        <Button
          v-if="!isMobile"
          variant="ghost"
          size="icon"
          @click="isFullscreen = false"
          class="text-muted-foreground hover:text-foreground shrink-0 h-10 w-10 touch-manipulation"
          aria-label="Exit fullscreen"
        >
          <Minimize2 class="h-5 w-5" />
        </Button>
        <div v-if="!isMobile" class="w-px h-6 bg-border" />
        <DialogClose as-child>
          <Button
            variant="ghost"
            size="icon"
            class="text-muted-foreground hover:text-foreground shrink-0 h-10 w-10 touch-manipulation"
            aria-label="Close chat"
          >
            <X class="h-5 w-5" />
          </Button>
        </DialogClose>
      </div>

      <!-- Mode Selector -->
      <div class="px-6 py-3 border-b border-border">
        <div class="flex items-center gap-3">
          <label class="text-sm font-medium text-muted-foreground shrink-0">Mode</label>
          <div ref="modeDropdownRef" class="mode-dropdown relative flex-1">
          <Button
            @click.stop="isModeDropdownOpen = !isModeDropdownOpen"
            variant="outline"
            class="w-full justify-start h-10 sm:h-9 text-sm gap-2 touch-manipulation"
            :aria-expanded="isModeDropdownOpen"
            aria-haspopup="listbox"
            aria-label="Select chat mode"
            :aria-controls="isModeDropdownOpen ? 'mode-dropdown-list-fullscreen' : undefined"
          >
            <Icon :name="modeConfig.icon" class="h-4 w-4" />
            <span class="flex-1 text-left">{{ modeConfig.label }}</span>
            <ChevronDown :class="['h-4 w-4 transition-transform duration-200', isModeDropdownOpen ? 'rotate-180' : '']" />
          </Button>
          
          <Transition name="dropdown">
            <div
              v-if="isModeDropdownOpen"
              id="mode-dropdown-list-fullscreen"
              role="listbox"
              :aria-label="'Chat modes'"
              class="absolute left-0 right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden"
              @click.stop
            >
              <button
                v-for="mode in allModes"
                :key="mode.id"
                @click="setMode(mode.id); isModeDropdownOpen = false"
                role="option"
                :aria-selected="currentMode === mode.id"
                class="w-full flex items-center gap-2 px-3 py-3 sm:py-2.5 text-sm hover:bg-muted transition-colors text-left min-h-[48px] sm:min-h-0 touch-manipulation"
              >
                <Icon :name="mode.icon" class="h-4 w-4 shrink-0" />
                <div class="flex flex-col flex-1 min-w-0">
                  <span class="font-medium">{{ mode.label }}</span>
                  <span class="text-xs text-muted-foreground line-clamp-1">{{ mode.description }}</span>
                </div>
                <Check v-if="currentMode === mode.id" class="h-4 w-4 shrink-0 text-primary" />
              </button>
            </div>
          </Transition>
          </div>
        </div>
      </div>

      <!-- Messages Area -->
      <div class="flex-1 overflow-y-auto px-6">
        <div class="py-6 space-y-6 max-w-3xl mx-auto">
          <!-- Welcome Message -->
          <div v-if="messages.length === 1" class="text-center py-12 space-y-4">
            <div class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10">
              <Sparkles class="h-8 w-8 text-primary" />
            </div>
            <div class="space-y-2">
              <h3 class="text-2xl font-bold">How Can I Assist You Today?</h3>
              <p class="text-muted-foreground">Ask me anything about our learning materials</p>
            </div>
          </div>

          <!-- Messages -->
          <div
            v-for="message in messages"
            :key="message.id"
            class="group relative"
          >
            <!-- Assistant Message -->
            <div v-if="message.role === 'assistant'" class="flex gap-3 items-start">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/90 to-primary mt-1">
                <Bot class="h-4 w-4 text-primary-foreground" />
              </div>
              <div class="flex-1 space-y-3 overflow-hidden">
                <!-- Copy Button (Fullscreen) -->
                <div class="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity -mb-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    @click="copyMessageContent(message)"
                    class="h-8 w-8"
                    title="Copy message"
                  >
                    <Copy class="h-4 w-4" />
                  </Button>
                </div>
                <!-- Thinking Process (Fullscreen) -->
                <div v-if="message.thinking && message.thinking.length > 0" class="space-y-2 mb-4 p-3 rounded-lg bg-muted/50 border">
                  <p class="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Sparkles class="h-3 w-3" />
                    Thinking Process
                  </p>
                  <div
                    v-for="think in message.thinking"
                    :key="think.stage"
                    class="flex items-start gap-2.5 text-xs"
                  >
                    <div class="flex items-center gap-1.5 min-w-[100px]">
                      <div v-if="!think.complete" class="h-2.5 w-2.5 rounded-full bg-primary/60 animate-pulse"></div>
                      <div v-else class="h-2.5 w-2.5 rounded-full bg-primary/30"></div>
                      <span class="font-medium">{{ think.stage }}</span>
                    </div>
                    <span class="flex-1 leading-relaxed text-muted-foreground">{{ think.content }}</span>
                  </div>
                </div>

                <div class="text-sm leading-relaxed [&_strong]:font-semibold [&_ul]:my-2 [&_li]:leading-snug" v-html="parseMarkdown(message.content)"></div>

                <!-- Concept Summary Export Button (Fullscreen) -->
                <div v-if="message.role === 'assistant' && (message.content.includes('# PROJECT CONCEPT') || message.content.includes('# 🎯 PROJECT CONCEPT'))" class="mt-4 flex justify-center">
                  <Button
                    size="sm"
                    @click="downloadConcept(message)"
                    class="gap-2"
                  >
                    <Download class="h-4 w-4" />
                    Download Project Brief (.docx)
                  </Button>
                </div>

                <!-- Learning Plan (Fullscreen) -->
                <div v-if="message.plan" class="space-y-4 mt-4">
                  <div class="flex items-center justify-between">
                    <p class="text-base font-semibold text-foreground flex items-center gap-2">
                      📋 {{ message.plan.title }}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      @click="downloadPlan(message)"
                      class="gap-2"
                    >
                      <Download class="h-4 w-4" />
                      Download Plan
                    </Button>
                  </div>
                  
                  <div class="flex flex-col gap-4">
                    <div
                      v-for="(step, idx) in message.plan.steps"
                      :key="step.step"
                      class="flex gap-4 relative"
                    >
                      <!-- Step indicator -->
                      <div class="flex flex-col items-center">
                        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold bg-primary text-primary-foreground">
                          {{ step.step }}
                        </div>
                        <div v-if="idx !== message.plan.steps.length - 1" class="w-0.5 flex-1 bg-border min-h-8 mt-2"></div>
                      </div>
                      
                      <!-- Step content -->
                      <div class="flex-1 pb-3">
                        <div class="flex items-center gap-2 mb-2">
                          <h4 class="text-base font-semibold">{{ step.title }}</h4>
                          <span v-if="step.duration" class="text-xs text-muted-foreground">{{ step.duration }}</span>
                        </div>
                        <p v-if="step.description" class="text-sm text-muted-foreground mb-3">{{ step.description }}</p>
                        <div v-if="step.materials.length > 0" class="flex flex-wrap gap-2">
                          <NuxtLink
                            v-for="material in step.materials"
                            :key="material.id"
                            :to="material.id"
                            class="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-accent hover:border-primary/50 transition-colors"
                            :title="material.reason"
                          >
                            <span class="text-xs text-muted-foreground">{{ material.type }}</span>
                            <span class="truncate max-w-[200px]">{{ material.title }}</span>
                          </NuxtLink>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="message.references && message.references.length > 0" class="space-y-2">
                  <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recommended</p>
                  <div class="flex flex-wrap gap-2">
                    <NuxtLink
                      v-for="ref in message.references"
                      :key="ref.id"
                      :to="ref.id"
                      class="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:border-primary/50 transition-colors"
                      :title="ref.reason"
                    >
                      <span class="truncate max-w-[220px]">{{ ref.title }}</span>
                    </NuxtLink>
                  </div>
                </div>
                
                <!-- Sources -->
                <div v-if="message.sources && message.sources.length > 0" class="space-y-2">
                  <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Related Materials</p>
                  <div class="space-y-2">
                    <NuxtLink
                      v-for="source in message.sources"
                      :key="source.path"
                      :to="source.path"
                      class="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent hover:border-primary/50 transition-all group"
                    >
                      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                        </svg>
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium group-hover:text-primary transition-colors truncate">{{ source.title }}</p>
                        <p v-if="source.description" class="text-xs text-muted-foreground line-clamp-1 mt-0.5">{{ source.description }}</p>
                        <div v-if="source.difficulty || source.duration" class="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span v-if="source.difficulty">{{ source.difficulty }}</span>
                          <span v-if="source.difficulty && source.duration">•</span>
                          <span v-if="source.duration">{{ source.duration }}</span>
                        </div>
                      </div>
                    </NuxtLink>
                  </div>
                </div>
                
                <!-- Divider -->
                <div class="border-t my-4"></div>
                
                <div class="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <div class="flex items-center gap-2">
                    <span>{{ formatTime(message.timestamp) }}</span>
                    <span v-if="message.model" class="flex items-center gap-1">
                      • <Sparkles class="h-3 w-3" /> {{ message.model }}
                    </span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    @click="copyMessageContent(message)"
                    class="h-8 w-8"
                    title="Copy message"
                  >
                    <Copy class="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <!-- User Message -->
            <div v-else class="flex gap-3 items-start justify-end">
              <div class="flex-1 flex justify-end">
                <div class="rounded-lg bg-primary px-4 py-3 max-w-[80%]">
                  <p class="text-sm leading-relaxed whitespace-pre-wrap text-primary-foreground">{{ message.content }}</p>
                  <p class="text-xs text-primary-foreground/70 mt-1">{{ formatTime(message.timestamp) }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Concept mode: Generate the concept button (inside chat area) -->
          <div v-if="canGenerateConceptSummary && !hasConceptSummary" class="flex justify-center py-4">
            <Button
              class="gap-2 bg-foreground text-background hover:bg-foreground/90 shadow-sm"
              :disabled="isLoading"
              @click="generateConceptSummary"
            >
              <FileText class="h-4 w-4" />
              Generate Project Brief
            </Button>
          </div>

          <!-- Loading Indicator -->
          <div v-if="isLoading" class="flex gap-3 items-start">
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/90 to-primary mt-1">
              <Bot class="h-4 w-4 text-primary-foreground" />
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-1 text-sm text-muted-foreground">
                <span class="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]"></span>
                <span class="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]"></span>
                <span class="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce"></span>
                <span class="ml-2">Thinking...</span>
              </div>
            </div>
          </div>

          <!-- Scroll anchor -->
          <div ref="messagesEndRef"></div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="border-t bg-background px-6 py-4 shrink-0">
        <form @submit.prevent="sendMessage" class="space-y-2">
          <div class="relative flex items-end gap-2">
            <Textarea
              ref="textareaRef"
              v-model="inputText"
              placeholder="Ask a question about learning materials..."
              :disabled="isLoading"
              class="min-h-[60px] max-h-[200px] resize-none pr-12"
              @keydown="handleKeydown"
            />
            <Button
              v-if="isLoading"
              type="button"
              @click="stopGeneration"
              size="icon"
              variant="destructive"
              class="absolute bottom-2 right-2 h-8 w-8"
            >
              <Icon name="lucide:square" class="h-4 w-4" />
              <span class="sr-only">Stop generation</span>
            </Button>
            <Button
              v-else
              type="submit"
              :disabled="!inputText.trim()"
              size="icon"
              class="absolute bottom-2 right-2 h-8 w-8"
            >
              <Send class="h-4 w-4" />
              <span class="sr-only">Send message</span>
            </Button>
          </div>
          <p class="text-xs text-muted-foreground text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </form>
      </div>
    </DialogContentFullscreen>
  </Dialog>

  <!-- Settings Dialog -->
  <ChatbotSettings v-model:open="settingsOpen" />
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
