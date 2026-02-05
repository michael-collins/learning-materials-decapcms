<script setup lang="ts">
import { ref, nextTick, onMounted, watch } from 'vue'
import { Bot, Send, Sparkles, Trash2, Maximize2, Minimize2, Settings } from 'lucide-vue-next'
import { Dialog, DialogContentFullscreen, DialogContentPopover, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import Button from '~/components/ui/button/Button.vue'
import Textarea from '~/components/ui/textarea/Textarea.vue'
import ChatbotSettings from '~/components/ChatbotSettings.vue'
import { useChatbotSettings } from '~/composables/useChatbotSettings'
import { useLLMChat } from '~/composables/useLLMChat'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  model?: string // The AI model used to generate this response
  sources?: Array<{
    title: string
    type: string
    path: string
    description?: string
    difficulty?: string
    duration?: string
  }>
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

const { loadIndex, search, detectIntent, isLoading: searchIndexLoading, isLoaded } = useSchemaEnhancedSearch()

const CHAT_HISTORY_KEY = 'ai-chat-history'
const CHAT_HISTORY_MAX_AGE = 24 * 60 * 60 * 1000 // 24 hours

// Load messages from localStorage or use default
const loadChatHistory = () => {
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
      content: "Hello! I'm your learning assistant. I can help you discover learning materials, answer questions about courses and lessons, and suggest learning paths.\n\n💡 **Tip:** Enable **Enhanced Mode** in settings for AI-powered conversational responses with your own API key.",
      timestamp: new Date()
    }
  ]
}

const messages = ref<Message[]>(loadChatHistory())

// Save messages to localStorage
const saveChatHistory = () => {
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
const messagesEndRef = ref<HTMLElement | null>(null)
const isFullscreen = ref(false)
const settingsOpen = ref(false)

const { settings, canUseEnhancedMode, isConfigured } = useChatbotSettings()
const { generateResponse, generateQueryExpansion } = useLLMChat()

// Load search index when component mounts
onMounted(async () => {
  try {
    await loadIndex()
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
    content: inputText.value,
    timestamp: new Date()
  }
  
  messages.value.push(userMessage)
  const query = inputText.value
  inputText.value = ''
  isLoading.value = true
  
  // Scroll to bottom
  await nextTick()
  messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' })
  
  try {
    // Search for relevant content
    let results = search(query, { limit: 10 })
    const intent = detectIntent(query)
    const topScore = (results[0] as any)?.score || 0
    
    console.log('[Chat] Enhanced mode:', settings.value.enhancedMode, 'Configured:', isConfigured.value)
    console.log('[Chat] Provider:', settings.value.provider, 'Model:', settings.value.model)
    
    let responseText = ''
    
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
        results = search(expandedQuery, { limit: 5 })
      }
    }

    // Use LLM if enhanced mode is enabled and configured
    if (settings.value.enhancedMode && isConfigured.value) {
      console.log('[Chat] Using LLM for response')
      try {
        const conversationContext = buildConversationContext(8)
        const llmResponse = await generateResponse(
          query,
          results,
          settings.value.provider,
          settings.value.apiKey,
          settings.value.model,
          intent,
          conversationContext
        )
        
        if (llmResponse.error) {
          // Fall back to basic response if LLM fails
          responseText = `⚠️ **Enhanced mode error:** ${llmResponse.error}\n\nFalling back to search results:\n\n${buildContextResponse(query, results)}`
        } else {
          responseText = llmResponse.content
        }
      } catch (error: any) {
        // Fall back to basic response if LLM fails
        console.error('LLM Error:', error)
        responseText = `⚠️ **Enhanced mode unavailable:** ${error.message}\n\nShowing search results instead:\n\n${buildContextResponse(query, results)}`
      }
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

function buildConversationContext(limit = 6) {
  return messages.value
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-limit)
    .map(m => ({
      role: m.role,
      content: m.content
    }))
}

function parseMarkdown(text: string): string {
  let html = text
  
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  
  // Bullet lists - handle them before line break conversion
  html = html.replace(/^• (.+)$/gm, '<li class="ml-4">$1</li>')
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
  <Dialog v-model:open="isOpen">
    <!-- Popover Mode -->
    <DialogContentPopover v-if="!isFullscreen" class="flex flex-col p-0 gap-0">
      <DialogTitle class="sr-only">Learning Assistant Chat</DialogTitle>
      <DialogDescription class="sr-only">Chat with the AI learning assistant to find educational materials and get help with your learning journey.</DialogDescription>
      
      <!-- Header -->
      <div class="flex items-center gap-3 border-b pl-4 pr-10 py-3 shrink-0">
        <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/90 to-primary shrink-0">
          <Sparkles class="h-4 w-4 text-primary-foreground" />
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="text-base font-semibold">Learning Assistant</h2>
          <p v-if="settings.enhancedMode" class="text-[10px] text-muted-foreground flex items-center gap-1">
            <Sparkles class="h-2.5 w-2.5" />
            Enhanced mode
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          @click="settingsOpen = true"
          class="text-muted-foreground hover:text-foreground shrink-0 h-8 w-8 p-0"
          title="Settings"
        >
          <Settings class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          @click="isFullscreen = true"
          class="text-muted-foreground hover:text-foreground shrink-0 h-8 w-8 p-0"
          title="Expand to fullscreen"
        >
          <Maximize2 class="h-4 w-4" />
        </Button>
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
                <div class="text-xs leading-relaxed [&_strong]:font-semibold [&_ul]:my-2 [&_li]:leading-snug" v-html="parseMarkdown(message.content)"></div>
                
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
                
                <div class="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{{ formatTime(message.timestamp) }}</span>
                  <span v-if="message.model" class="flex items-center gap-1">
                    • <Sparkles class="h-2.5 w-2.5" /> {{ message.model }}
                  </span>
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
            v-model="inputText"
            placeholder="Ask a question..."
            :disabled="isLoading"
            class="min-h-[40px] max-h-[100px] text-sm resize-none"
            @keydown="handleKeydown"
          />
          <Button
            type="submit"
            size="sm"
            :disabled="!inputText.trim() || isLoading"
            class="shrink-0"
          >
            <Send class="h-4 w-4" />
          </Button>
        </form>
      </div>
    </DialogContentPopover>

    <!-- Fullscreen Mode -->
    <DialogContentFullscreen v-else class="flex flex-col p-0 gap-0">
      <DialogTitle class="sr-only">Learning Assistant Chat</DialogTitle>
      <DialogDescription class="sr-only">Chat with the AI learning assistant to find educational materials and get help with your learning journey.</DialogDescription>
      
      <!-- Header -->
      <div class="flex items-center gap-3 border-b pl-6 pr-12 py-4 shrink-0">
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/90 to-primary shrink-0">
          <Sparkles class="h-5 w-5 text-primary-foreground" />
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="text-lg font-semibold">Learning Assistant</h2>
          <p class="text-sm text-muted-foreground flex items-center gap-1.5">
            Discover courses, lessons, and learning paths
            <span v-if="settings.enhancedMode" class="inline-flex items-center gap-1 text-xs text-primary">
              • <Sparkles class="h-3 w-3" /> Enhanced
            </span>
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          @click="settingsOpen = true"
          class="text-muted-foreground hover:text-foreground shrink-0"
          title="Settings"
        >
          <Settings class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          @click="isFullscreen = false"
          class="text-muted-foreground hover:text-foreground shrink-0"
          title="Exit fullscreen"
        >
          <Minimize2 class="h-4 w-4" />
        </Button>
        <Button
          v-if="messages.length > 1"
          variant="ghost"
          size="sm"
          @click="clearChatHistory"
          class="text-muted-foreground hover:text-destructive shrink-0"
          title="Clear chat history"
        >
          <Trash2 class="h-4 w-4" />
        </Button>
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
              <div class="flex-1 space-y-2 overflow-hidden">
                <div class="text-sm leading-relaxed [&_strong]:font-semibold [&_ul]:my-2 [&_li]:leading-snug" v-html="parseMarkdown(message.content)"></div>
                
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
                
                <div class="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{{ formatTime(message.timestamp) }}</span>
                  <span v-if="message.model" class="flex items-center gap-1">
                    • <Sparkles class="h-3 w-3" /> {{ message.model }}
                  </span>
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
              v-model="inputText"
              placeholder="Ask a question about learning materials..."
              :disabled="isLoading"
              class="min-h-[60px] max-h-[200px] resize-none pr-12"
              @keydown="handleKeydown"
            />
            <Button
              type="submit"
              :disabled="!inputText.trim() || isLoading"
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
