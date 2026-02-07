import { ref, computed, watch } from 'vue'

export type Provider = 'openai' | 'anthropic' | 'google' | 'ollama'

export interface ChatbotSettings {
  provider: Provider
  apiKey: string
  model: string
  enhancedMode: boolean
}

export interface ModelOption {
  id: string
  name: string
  description: string
}

export const AVAILABLE_MODELS: Record<Provider, ModelOption[]> = {
  openai: [
    {
      id: 'gpt-5-nano',
      name: 'GPT-5 nano',
      description: 'Fastest, most cost-efficient - recommended for most queries'
    },
    {
      id: 'gpt-5-mini',
      name: 'GPT-5 mini',
      description: 'Fast and affordable with good balance'
    },
    {
      id: 'gpt-5.2',
      name: 'GPT-5.2',
      description: 'Latest generation - best for coding and agentic tasks'
    },
    {
      id: 'gpt-4.1',
      name: 'GPT-4.1',
      description: 'Smartest non-reasoning model from previous generation'
    }
  ],
  anthropic: [
    {
      id: 'claude-haiku-4-5-20251001',
      name: 'Claude Haiku 4.5',
      description: 'Fastest with near-frontier intelligence - recommended for most queries'
    },
    {
      id: 'claude-sonnet-4-5-20250929',
      name: 'Claude Sonnet 4.5',
      description: 'Best combination of speed and intelligence'
    },
    {
      id: 'claude-opus-4-6',
      name: 'Claude Opus 4.6',
      description: 'Most intelligent - best for coding and complex reasoning'
    }
  ],
  google: [
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      description: 'Best price-performance - recommended for most queries'
    },
    {
      id: 'gemini-3-flash',
      name: 'Gemini 3 Flash',
      description: 'Latest generation - balanced for speed and scale'
    },
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      description: 'Advanced thinking model for complex reasoning'
    },
    {
      id: 'gemini-3-pro',
      name: 'Gemini 3 Pro',
      description: 'Most intelligent - best for multimodal understanding'
    }
  ],
  ollama: [
    {
      id: 'llama3.3:70b',
      name: 'Llama 3.3 70B',
      description: 'Meta\'s latest, good quality (requires ~40GB RAM)'
    },
    {
      id: 'llama3.2:3b',
      name: 'Llama 3.2 3B',
      description: 'Small and fast (runs on most computers)'
    },
    {
      id: 'qwen2.5:14b',
      name: 'Qwen 2.5 14B',
      description: 'Good balance of speed and quality'
    },
    {
      id: 'mistral:7b',
      name: 'Mistral 7B',
      description: 'Efficient and capable'
    }
  ]
}

const SETTINGS_KEY = 'chatbot-settings'

const defaultSettings: ChatbotSettings = {
  provider: 'openai',
  apiKey: '',
  model: 'gpt-5-nano',
  enhancedMode: false
}

// Shared state - single source of truth
const settings = ref<ChatbotSettings>(loadSettings())
const dynamicModels = ref<Record<Provider, ModelOption[] | null>>({
  openai: null,
  anthropic: null,
  google: null,
  ollama: null
})
const loadingModels = ref(false)
const showAllModels = ref(false)

// Auto-save on changes (client-side only)
if (typeof window !== 'undefined') {
  watch(settings, () => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings.value))
    } catch (error) {
      console.error('Failed to save chatbot settings:', error)
    }
  }, { deep: true })
}

function loadSettings(): ChatbotSettings {
  if (typeof window === 'undefined') {
    return { ...defaultSettings }
  }
  
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Validate that the stored model exists for the provider
      const availableForProvider = AVAILABLE_MODELS[parsed.provider as Provider]
      if (!availableForProvider || !availableForProvider.some(m => m.id === parsed.model)) {
        // Invalid model, use first available for provider
        parsed.model = availableForProvider?.[0]?.id || defaultSettings.model
      }
      return { ...defaultSettings, ...parsed }
    }
  } catch (error) {
    console.error('Failed to load chatbot settings:', error)
  }
  
  return { ...defaultSettings }
}

async function fetchModels(provider: Provider, apiKey: string): Promise<ModelOption[]> {
  if (provider === 'ollama') {
    try {
      const response = await fetch('http://localhost:11434/api/tags')
      if (!response.ok) throw new Error('Ollama not running')
      const data = await response.json()
      return data.models?.map((m: any) => ({
        id: m.name,
        name: m.name,
        description: `Size: ${(m.size / 1024 / 1024 / 1024).toFixed(1)}GB`
      })) || AVAILABLE_MODELS.ollama
    } catch (error) {
      console.warn('Failed to fetch Ollama models, using defaults:', error)
      return AVAILABLE_MODELS.ollama
    }
  }

  if (!apiKey) {
    return AVAILABLE_MODELS[provider]
  }

  try {
    let url = ''
    let headers: Record<string, string> = {}

    switch (provider) {
      case 'openai':
        url = 'https://api.openai.com/v1/models'
        headers = { 'Authorization': `Bearer ${apiKey}` }
        break
      case 'anthropic':
        // Anthropic doesn't have a models endpoint, use hardcoded
        return AVAILABLE_MODELS.anthropic
      case 'google':
        url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        break
      default:
        return AVAILABLE_MODELS[provider]
    }

    const response = await fetch(url, { headers })
    if (!response.ok) {
      console.warn(`Failed to fetch ${provider} models, using defaults`)
      return AVAILABLE_MODELS[provider]
    }

    const data = await response.json()
    let models: ModelOption[] = []

    if (provider === 'openai') {
      // Filter to chat completion models, sort by most recent
      models = data.data
        ?.filter((m: any) => {
          const id = m.id.toLowerCase()
          // Include GPT models, exclude embeddings, audio, vision-only, and legacy
          return (
            id.startsWith('gpt') || 
            id.startsWith('o1') || 
            id.startsWith('o3')
          ) && 
          !id.includes('embedding') &&
          !id.includes('audio') &&
          !id.includes('whisper') &&
          !id.includes('dall-e') &&
          !id.includes('tts') &&
          !id.includes('realtime')
        })
        ?.sort((a: any, b: any) => {
          // Sort by creation date, newest first
          return (b.created || 0) - (a.created || 0)
        })
        ?.map((m: any) => ({
          id: m.id,
          name: m.id,
          description: m.owned_by || 'OpenAI model'
        })) || []
    } else if (provider === 'google') {
      // Filter to generation models
      models = data.models
        ?.filter((m: any) => 
          m.name.includes('gemini') && 
          m.supportedGenerationMethods?.includes('generateContent')
        )
        ?.map((m: any) => ({
          id: m.name.replace('models/', ''),
          name: m.displayName || m.name.replace('models/', ''),
          description: m.description || 'Google Gemini model'
        })) || []
    }

    // If we got models, return them, otherwise use defaults
    return models.length > 0 ? models : AVAILABLE_MODELS[provider]
  } catch (error) {
    console.warn(`Error fetching ${provider} models, using defaults:`, error)
    return AVAILABLE_MODELS[provider]
  }
}

export function useChatbotSettings() {
  const availableModels = computed(() => {
    // If showing all models and we have dynamic models, use those
    if (showAllModels.value) {
      const dynamic = dynamicModels.value[settings.value.provider]
      if (dynamic && dynamic.length > 0) return dynamic
    }
    // Otherwise show curated hardcoded list
    return AVAILABLE_MODELS[settings.value.provider]
  })
  
  const currentModel = computed(() => {
    if (availableModels.value.length === 0) {
      return { id: '', name: 'No models available', description: '' }
    }
    return availableModels.value.find(m => m.id === settings.value.model) || availableModels.value[0]
  })
  
  const isConfigured = computed(() => {
    if (settings.value.provider === 'ollama') {
      return true // Ollama doesn't need API key
    }
    return !!settings.value.apiKey && !!settings.value.model
  })

  const canUseEnhancedMode = computed(() => isConfigured.value)

  function updateProvider(provider: Provider) {
    settings.value.provider = provider
    // Set default model for new provider
    settings.value.model = AVAILABLE_MODELS[provider][0].id
  }

  function updateApiKey(apiKey: string) {
    // Trim whitespace and strip any HTML tags (common when copy-pasting from rich text apps)
    let cleanedKey = apiKey.trim()
    
    // Remove HTML tags if present
    cleanedKey = cleanedKey.replace(/<[^>]*>/g, '')
    
    // Remove any newlines or extra whitespace
    cleanedKey = cleanedKey.replace(/[\n\r\s]+/g, ' ').trim()
    
    settings.value.apiKey = cleanedKey
    console.log('[Settings] API key updated, length:', settings.value.apiKey.length, 'starts with:', settings.value.apiKey.substring(0, 10))
  }

  function updateModel(modelId: string) {
    settings.value.model = modelId
  }

  function toggleEnhancedMode() {
    if (canUseEnhancedMode.value) {
      settings.value.enhancedMode = !settings.value.enhancedMode
    }
  }

  function clearApiKey() {
    settings.value.apiKey = ''
    settings.value.enhancedMode = false
  }

  async function loadModels(provider: Provider, apiKey: string) {
    loadingModels.value = true
    try {
      const models = await fetchModels(provider, apiKey)
      dynamicModels.value[provider] = models
      
      // If current model is not in the new list, switch to first available
      if (!models.some(m => m.id === settings.value.model)) {
        settings.value.model = models[0].id
      }
    } catch (error) {
      console.error('Failed to load models:', error)
    } finally {
      loadingModels.value = false
    }
  }

  return {
    settings,
    availableModels,
    currentModel,
    isConfigured,
    canUseEnhancedMode,
    loadingModels,
    showAllModels,
    updateProvider,
    updateApiKey,
    updateModel,
    toggleEnhancedMode,
    clearApiKey,
    loadModels
  }
}
