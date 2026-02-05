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
      id: 'gpt-4o-mini',
      name: 'GPT-4o mini',
      description: 'Fast and affordable - recommended for most queries'
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      description: 'Balanced performance for complex questions'
    },
    {
      id: 'gpt-5-nano',
      name: 'GPT-5 nano',
      description: 'Latest generation, very efficient'
    },
    {
      id: 'gpt-5-mini',
      name: 'GPT-5 mini',
      description: 'Latest generation, good balance'
    }
  ],
  anthropic: [
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      description: 'Fast and efficient - recommended for most queries'
    },
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      description: 'Balanced intelligence and speed'
    },
    {
      id: 'claude-sonnet-4-20250514',
      name: 'Claude Sonnet 4',
      description: 'Latest generation, very capable'
    }
  ],
  google: [
    {
      id: 'gemini-2.0-flash-exp',
      name: 'Gemini 2.0 Flash',
      description: 'Fast and efficient - recommended for most queries'
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      description: 'Previous generation, well-tested'
    },
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      description: 'More capable for complex reasoning'
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
  model: 'gpt-4o-mini',
  enhancedMode: false
}

export function useChatbotSettings() {
  const settings = ref<ChatbotSettings>(loadSettings())
  
  const availableModels = computed(() => AVAILABLE_MODELS[settings.value.provider])
  
  const currentModel = computed(() => 
    availableModels.value.find(m => m.id === settings.value.model) || availableModels.value[0]
  )
  
  const isConfigured = computed(() => {
    if (settings.value.provider === 'ollama') {
      return true // Ollama doesn't need API key
    }
    return !!settings.value.apiKey && !!settings.value.model
  })

  const canUseEnhancedMode = computed(() => isConfigured.value)

  function loadSettings(): ChatbotSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return { ...defaultSettings, ...parsed }
      }
    } catch (error) {
      console.error('Failed to load chatbot settings:', error)
    }
    return { ...defaultSettings }
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings.value))
    } catch (error) {
      console.error('Failed to save chatbot settings:', error)
    }
  }

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

  // Auto-save on changes
  watch(settings, saveSettings, { deep: true })

  return {
    settings,
    availableModels,
    currentModel,
    isConfigured,
    canUseEnhancedMode,
    updateProvider,
    updateApiKey,
    updateModel,
    toggleEnhancedMode,
    clearApiKey
  }
}
