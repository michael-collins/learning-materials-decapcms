import { ref, computed } from 'vue'

export type ChatMode = 'ask' | 'plan' | 'concept' | 'writing' | 'career' | 'theory'

export interface ChatModeConfig {
  id: ChatMode
  label: string
  description: string
  icon: string
  systemPromptSuffix: string
  detectKeywords?: string[]
  requiresEnhancedMode?: boolean
}

const CHAT_MODES: Record<ChatMode, ChatModeConfig> = {
  ask: {
    id: 'ask',
    label: 'Ask',
    description: 'General learning questions and material discovery',
    icon: 'lucide:message-circle',
    systemPromptSuffix: 'Provide helpful, concise answers to learning questions.',
    requiresEnhancedMode: false
  },
  plan: {
    id: 'plan',
    label: 'Plan',
    description: 'Generate structured learning plans with materials',
    icon: 'lucide:list-tree',
    systemPromptSuffix: 'Create comprehensive learning plans with step-by-step progression, recommended materials, and time estimates.',
    detectKeywords: ['plan', 'roadmap', 'learning path', 'schedule', 'organize', 'structure'],
    requiresEnhancedMode: true
  },
  concept: {
    id: 'concept',
    label: 'Project Concept Development',
    description: 'Develop and refine creative project concepts',
    icon: 'lucide:lightbulb',
    systemPromptSuffix: `You are a creative project development partner. Have a natural conversation to understand the user's project idea. Topics to explore (as they come up naturally, not as a checklist): media format, subject/theme, conceptual approach, intended message, target audience, aesthetic direction. Ask 2-3 focused questions at a time. Adapt to what the user shares — if they give a lot of detail upfront, don't re-ask. Keep responses concise and encouraging.`,
    detectKeywords: ['project', 'concept', 'idea', 'theme', 'what should i make', 'project idea', 'develop', 'brainstorm', 'assignment'],
    requiresEnhancedMode: true
  },
  writing: {
    id: 'writing',
    label: 'Writing Guide',
    description: 'Improve technical and creative writing skills',
    icon: 'lucide:pen-tool',
    systemPromptSuffix: 'Help users develop writing skills for technical documentation, artist statements, and academic work. Provide structured guidance on genre conventions, style, and effective communication. Suggest exercises and review strategies.',
    detectKeywords: ['write', 'writing', 'document', 'essay', 'paper', 'statement', 'describe'],
    requiresEnhancedMode: true
  },
  career: {
    id: 'career',
    label: 'Career Guide',
    description: 'Professional development and career planning',
    icon: 'lucide:briefcase',
    systemPromptSuffix: 'Guide users in career development, portfolio building, and professional skill acquisition. Connect learning materials to industry roles, recommend skill-building paths, and provide practical career advice.',
    detectKeywords: ['career', 'job', 'industry', 'professional', 'portfolio', 'work', 'employment'],
    requiresEnhancedMode: true
  },
  theory: {
    id: 'theory',
    label: 'Theory Guide',
    description: 'Explore theoretical frameworks and philosophy',
    icon: 'lucide:book-open',
    systemPromptSuffix: 'Explore theoretical frameworks, philosophical foundations, and historical context. Connect abstract theory to practical application, trace evolution of ideas, and encourage critical thinking about underlying principles.',
    detectKeywords: ['theory', 'philosophy', 'framework', 'why', 'context', 'history', 'critical'],
    requiresEnhancedMode: true
  }
}

const CHAT_MODE_KEY = 'ai-chat-mode'

export function useChatModes() {
  const currentMode = ref<ChatMode>('ask')

  // Load saved mode from localStorage
  const loadMode = () => {
    try {
      const saved = localStorage.getItem(CHAT_MODE_KEY)
      if (saved && saved in CHAT_MODES) {
        currentMode.value = saved as ChatMode
      }
    } catch (error) {
      console.error('Failed to load chat mode:', error)
    }
  }

  // Save mode to localStorage
  const saveMode = () => {
    try {
      localStorage.setItem(CHAT_MODE_KEY, currentMode.value)
    } catch (error) {
      console.error('Failed to save chat mode:', error)
    }
  }

  const setMode = (mode: ChatMode) => {
    currentMode.value = mode
    saveMode()
  }

  const modeConfig = computed(() => CHAT_MODES[currentMode.value])

  const allModes = computed(() => Object.values(CHAT_MODES))

  // Detect mode from query text
  const detectMode = (query: string): ChatMode | null => {
    const lowerQuery = query.toLowerCase()
    
    // Check each mode's detection keywords
    for (const mode of Object.values(CHAT_MODES)) {
      if (mode.detectKeywords) {
        for (const keyword of mode.detectKeywords) {
          if (lowerQuery.includes(keyword)) {
            return mode.id
          }
        }
      }
    }
    
    return null
  }

  const getModeConfig = (mode: ChatMode): ChatModeConfig => {
    return CHAT_MODES[mode]
  }

  return {
    currentMode,
    modeConfig,
    allModes,
    setMode,
    loadMode,
    detectMode,
    getModeConfig
  }
}
