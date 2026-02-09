import { ref, computed } from 'vue'

export type ChatMode = 'auto' | 'ask' | 'plan' | 'concept' | 'career' | 'critique' | 'pathway' | 'explain'

export interface ChatModeConfig {
  id: ChatMode
  label: string
  description: string
  icon: string
  systemPromptSuffix: string
  detectKeywords?: string[]
  requiresEnhancedMode?: boolean
  /** If true, the mode shows focus selection buttons before the first user message */
  hasFocusOptions?: boolean
  focusOptions?: Array<{ id: string; label: string; icon: string; description: string }>
}

const CHAT_MODES: Record<ChatMode, ChatModeConfig> = {
  auto: {
    id: 'auto',
    label: 'Auto',
    description: 'Automatically detect the best mode for your question',
    icon: 'lucide:shapes',
    systemPromptSuffix: 'Respond appropriately based on the type of question or request.',
    requiresEnhancedMode: false
  },
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
  critique: {
    id: 'critique',
    label: 'Peer Review & Critique Coach',
    description: 'Prepare for critiques and practice giving constructive feedback',
    icon: 'lucide:message-square-text',
    systemPromptSuffix: `You are a peer review and critique coach for creative and academic work. Help the user prepare for in-class critiques, practice giving constructive feedback, or reflect on their own work. Use structured critique frameworks and encourage thoughtful, specific observations.`,
    detectKeywords: ['critique', 'crit', 'peer review', 'feedback', 'review my', 'evaluate', 'strengths and weaknesses'],
    requiresEnhancedMode: true,
    hasFocusOptions: true,
    focusOptions: [
      { id: 'prep', label: 'Critique Prep', icon: 'lucide:clipboard-list', description: 'Organize talking points about your work using rubric criteria' },
      { id: 'give', label: 'Give Feedback', icon: 'lucide:message-circle-plus', description: 'Practice giving constructive, rubric-grounded feedback' },
      { id: 'receive', label: 'Process Feedback', icon: 'lucide:inbox', description: 'Map critique notes to rubric criteria and prioritize next steps' },
      { id: 'self', label: 'Self-Evaluate', icon: 'lucide:search-check', description: 'Assess your work criterion by criterion against the rubric' }
    ]
  },
  pathway: {
    id: 'pathway',
    label: 'Pathway Advisor',
    description: 'Get personalized recommendations for specializations and learning paths',
    icon: 'lucide:compass',
    systemPromptSuffix: `You are a curriculum pathway advisor. Help users discover the right specializations, pathways, and sequences of materials based on their interests, goals, and current skill level. Ask clarifying questions about what excites them, what they've already learned, and where they want to go. Recommend specific pathways, specializations, and prerequisite materials from the available content. Be encouraging and help them see connections between topics.`,
    detectKeywords: ['pathway', 'specialization', 'what should i take', 'recommend', 'what course', 'where to start', 'sequence', 'which path'],
    requiresEnhancedMode: true
  },
  explain: {
    id: 'explain',
    label: 'Concept Explainer',
    description: 'Get clear explanations of topics at your level',
    icon: 'lucide:book-open-text',
    systemPromptSuffix: `You are a patient, clear concept explainer. When the user asks about a topic, explain it at their level using simple language, analogies, and concrete examples. Start with a foundational explanation, then offer to go deeper. If the topic relates to available learning materials, reference them. Use the pattern: 1) Simple explanation with an analogy, 2) A concrete example, 3) Why it matters in practice. Avoid jargon unless the user is clearly advanced. Ask "Would you like me to go deeper or explain a related concept?" after each explanation.`,
    detectKeywords: ['explain', 'what is', 'how does', 'eli5', 'break down', 'simplify', 'help me understand', 'confused about', 'what does.*mean'],
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
  }
}

const CHAT_MODE_KEY = 'ai-chat-mode'

export function useChatModes() {
  const currentMode = ref<ChatMode>('auto')

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
    
    // Check each mode's detection keywords (skip auto and ask)
    for (const mode of Object.values(CHAT_MODES)) {
      if (mode.id === 'auto' || mode.id === 'ask') continue
      
      if (mode.detectKeywords) {
        for (const keyword of mode.detectKeywords) {
          if (lowerQuery.includes(keyword)) {
            return mode.id
          }
        }
      }
    }
    
    // Default to ask if no specific mode detected
    return 'ask'
  }

  // Get effective mode (resolves 'auto' to detected mode)
  const getEffectiveMode = (query?: string): ChatMode => {
    if (currentMode.value === 'auto' && query) {
      return detectMode(query) || 'ask'
    }
    return currentMode.value
  }

  // Get effective mode config
  const effectiveModeConfig = (query?: string) => {
    const mode = getEffectiveMode(query)
    return CHAT_MODES[mode]
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
    getEffectiveMode,
    effectiveModeConfig,
    getModeConfig
  }
}
