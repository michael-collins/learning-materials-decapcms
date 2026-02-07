<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Settings, Key, Sparkles, CheckCircle2, AlertCircle, Check, AlertTriangle, Save, X, ChevronDown } from 'lucide-vue-next'
import { Dialog, DialogContentCustom, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '~/components/ui/dialog'
import Button from '~/components/ui/button/Button.vue'
import Input from '~/components/ui/input/Input.vue'
import Label from '~/components/ui/label/Label.vue'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group'
import { useChatbotSettings, type Provider, AVAILABLE_MODELS } from '~/composables/useChatbotSettings'

const props = defineProps<{
  open?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => {
    emit('update:open', value)
    if (!value) {
      // Reset to saved settings when closing without saving
      resetToSaved()
    }
  }
})

const {
  settings,
  availableModels,
  currentModel,
  updateProvider,
  updateApiKey,
  updateModel,
  toggleEnhancedMode,
  clearApiKey,
  loadModels,
  loadingModels,
  showAllModels
} = useChatbotSettings()

// Local draft state for editing
const draftProvider = ref<Provider>(settings.value.provider)
const draftApiKey = ref(settings.value.apiKey)
const draftModel = ref(settings.value.model)
const draftEnhancedMode = ref(settings.value.enhancedMode)

const showApiKey = ref(false)
const testingConnection = ref(false)
const testResult = ref<'success' | 'error' | null>(null)
const isSaving = ref(false)
const justSaved = ref(false)
const isProviderDropdownOpen = ref(false)
const isModelDropdownOpen = ref(false)

// Reset draft to saved settings
function resetToSaved() {
  draftProvider.value = settings.value.provider
  draftApiKey.value = settings.value.apiKey
  draftModel.value = settings.value.model
  draftEnhancedMode.value = settings.value.enhancedMode
  testResult.value = null
  justSaved.value = false
}

// Watch for settings opening to reset draft
watch(() => props.open, (opened) => {
  if (opened) {
    resetToSaved()
    // Load models if API key is present
    if (draftApiKey.value && draftProvider.value !== 'ollama') {
      loadModels(draftProvider.value, draftApiKey.value)
    } else if (draftProvider.value === 'ollama') {
      loadModels('ollama', '')
    }
  }
  isProviderDropdownOpen.value = false
  isModelDropdownOpen.value = false
})

// Watch for API key changes to reload models
watch(draftApiKey, (newKey) => {
  if (newKey && draftProvider.value !== 'ollama') {
    loadModels(draftProvider.value, newKey)
  }
})

// Watch for provider changes to reload models
watch(draftProvider, (newProvider) => {
  if (newProvider === 'ollama') {
    loadModels('ollama', '')
  } else if (draftApiKey.value) {
    loadModels(newProvider, draftApiKey.value)
  }
})

const isConfigured = computed(() => {
  if (draftProvider.value === 'ollama') {
    return true
  }
  return !!draftApiKey.value && !!draftModel.value
})

const canUseEnhancedMode = computed(() => isConfigured.value)

const hasChanges = computed(() => {
  return draftProvider.value !== settings.value.provider ||
    draftApiKey.value !== settings.value.apiKey ||
    draftModel.value !== settings.value.model ||
    draftEnhancedMode.value !== settings.value.enhancedMode
})

// Save changes
async function saveSettings() {
  isSaving.value = true
  try {
    updateProvider(draftProvider.value)
    updateApiKey(draftApiKey.value)
    updateModel(draftModel.value)
    
    // Update enhanced mode state
    if (draftEnhancedMode.value !== settings.value.enhancedMode) {
      toggleEnhancedMode()
    }
    
    justSaved.value = true
    setTimeout(() => {
      justSaved.value = false
      isOpen.value = false
    }, 800)
  } catch (error) {
    console.error('Failed to save settings:', error)
  } finally {
    isSaving.value = false
  }
}

// Handle provider change
function handleProviderChange(provider: Provider) {
  draftProvider.value = provider
  // Set default model for new provider
  draftModel.value = AVAILABLE_MODELS[provider][0].id
  testResult.value = null
}

// Handle clear API key
function handleClearApiKey() {
  draftApiKey.value = ''
  draftEnhancedMode.value = false
  testResult.value = null
}

const providerOptions = [
  { value: 'openai', label: 'OpenAI', description: 'GPT-5 nano recommended' },
  { value: 'anthropic', label: 'Anthropic', description: 'Claude Haiku 4.5 recommended' },
  { value: 'google', label: 'Google', description: 'Gemini 2.5 Flash recommended' },
  { value: 'ollama', label: 'Ollama', description: 'Run models locally on your computer' }
] as const

async function testConnection() {
  testingConnection.value = true
  testResult.value = null
  
  try {
    const key = draftApiKey.value.trim()
    console.log('[Settings Test] Testing connection for', draftProvider.value)
    console.log('[Settings Test] Key length:', key.length, 'starts with:', key.substring(0, 10))
    
    if (draftProvider.value === 'ollama') {
      testResult.value = 'success'
    } else if (draftProvider.value === 'openai') {
      if (key.startsWith('sk-')) {
        console.log('[Settings Test] OpenAI key format valid')
        testResult.value = 'success'
      } else {
        console.error('[Settings Test] OpenAI key should start with sk-, got:', key.substring(0, 5))
        testResult.value = 'error'
      }
    } else if (draftProvider.value === 'anthropic') {
      if (key.startsWith('sk-ant-')) {
        console.log('[Settings Test] Anthropic key format valid')
        testResult.value = 'success'
      } else {
        console.error('[Settings Test] Anthropic key should start with sk-ant-, got:', key.substring(0, 7))
        testResult.value = 'error'
      }
    } else if (draftProvider.value === 'google') {
      if (key.startsWith('AIza')) {
        console.log('[Settings Test] Google key format valid')
        testResult.value = 'success'
      } else {
        console.error('[Settings Test] Google key should start with AIza, got:', key.substring(0, 4))
        testResult.value = 'error'
      }
    } else {
      testResult.value = 'error'
    }
  } catch (error) {
    console.error('[Settings Test] Error:', error)
    testResult.value = 'error'
  } finally {
    testingConnection.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContentCustom 
      class="sm:max-w-[550px] flex flex-col p-0 gap-0 max-h-[90vh]"
      aria-labelledby="settings-dialog-title"
    >
      <DialogClose as-child>
        <Button
          variant="ghost"
          size="icon"
          class="absolute right-3 top-3 text-muted-foreground hover:text-foreground shrink-0 h-9 w-9 sm:h-8 sm:w-8 touch-manipulation z-10"
          aria-label="Close settings"
        >
          <X class="h-4 w-4" />
        </Button>
      </DialogClose>
      
      <div class="flex items-center gap-2 px-4 pt-4 pb-4 sm:px-6 sm:pt-5 border-b">
        <Settings class="h-4 w-4 sm:h-5 sm:w-5" />
        <h2 id="settings-dialog-title" class="text-base sm:text-lg font-semibold">Chatbot Settings</h2>
      </div>

      <div class="space-y-4 py-3 px-4 sm:px-6 overflow-y-auto flex-1">
        <!-- Enhanced Mode Toggle -->
        <div class="rounded-lg border bg-muted/50 p-3 sm:p-4">
          <div class="flex flex-col sm:flex-row items-start sm:justify-between gap-3">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-0.5">
                <Sparkles class="h-4 w-4 text-primary" />
                <h3 class="font-semibold text-sm">Enhanced Mode</h3>
              </div>
              <p class="text-xs text-muted-foreground">
                Use AI for natural responses instead of keyword search
              </p>
              <p v-if="!canUseEnhancedMode" class="text-xs text-destructive mt-1.5">
                Configure an API key below to enable
              </p>
            </div>
            <Button
              :variant="draftEnhancedMode ? 'default' : 'outline'"
              size="sm"
              :disabled="!canUseEnhancedMode"
              @click="draftEnhancedMode = !draftEnhancedMode"
              class="shrink-0 min-w-[100px] sm:min-w-[120px] w-full sm:w-auto h-10 sm:h-9"
              :class="{ 'bg-green-600 hover:bg-green-700 text-white': draftEnhancedMode }"
              :aria-label="draftEnhancedMode ? 'Enhanced mode is enabled. Click to disable.' : 'Enable enhanced mode'"
              :aria-pressed="draftEnhancedMode"
            >
              <Check v-if="draftEnhancedMode" class="h-4 w-4 mr-1" />
              <AlertTriangle v-else class="h-4 w-4 mr-1" />
              {{ draftEnhancedMode ? 'Enabled' : 'Enable' }}
            </Button>
          </div>
        </div>

        <!-- Provider Selection -->
        <div class="space-y-2">
          <Label class="text-sm font-medium">AI Provider</Label>
          <div class="relative">
            <Button
              @click.stop="isProviderDropdownOpen = !isProviderDropdownOpen"
              variant="outline"
              class="w-full justify-start h-10 sm:h-9 text-sm gap-2 touch-manipulation"
              :aria-expanded="isProviderDropdownOpen"
              aria-haspopup="listbox"
              aria-label="Select AI provider"
            >
              <span class="flex-1 text-left">{{ providerOptions.find(p => p.value === draftProvider)?.label }}</span>
              <ChevronDown :class="['h-4 w-4 transition-transform duration-200', isProviderDropdownOpen ? 'rotate-180' : '']" />
            </Button>
            
            <Transition name="dropdown">
              <div
                v-if="isProviderDropdownOpen"
                role="listbox"
                aria-label="AI providers"
                class="absolute left-0 right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden"
                @click.stop
              >
                <button
                  v-for="option in providerOptions"
                  :key="option.value"
                  @click="handleProviderChange(option.value as Provider); isProviderDropdownOpen = false"
                  role="option"
                  :aria-selected="draftProvider === option.value"
                  class="w-full flex items-center gap-2 px-3 py-2.5 sm:py-2 text-sm hover:bg-muted transition-colors text-left min-h-[44px] sm:min-h-0 touch-manipulation"
                >
                  <div class="flex flex-col flex-1 min-w-0">
                    <span class="font-medium">{{ option.label }}</span>
                    <span class="text-xs text-muted-foreground line-clamp-1">{{ option.description }}</span>
                  </div>
                  <Check v-if="draftProvider === option.value" class="h-4 w-4 shrink-0 text-primary" />
                </button>
              </div>
            </Transition>
          </div>
        </div>

        <!-- API Key Input (not shown for Ollama) -->
        <div v-if="draftProvider !== 'ollama'" class="space-y-2">
          <div class="flex items-center justify-between">
            <Label for="api-key" class="flex items-center gap-1.5 text-sm">
              <Key class="h-3.5 w-3.5" />
              API Key
            </Label>
            <Button
              v-if="draftApiKey"
              variant="ghost"
              size="sm"
              @click="handleClearApiKey"
              class="text-destructive hover:text-destructive h-7 text-xs"
            >
              Clear
            </Button>
          </div>
          <div class="space-y-1.5">
            <div class="relative">
              <Input
                id="api-key"
                :type="showApiKey ? 'text' : 'password'"
                v-model="draftApiKey"
                :placeholder="draftProvider === 'openai' ? 'sk-... or sk-proj-...' : draftProvider === 'google' ? 'AIza...' : 'sk-ant-...'"
                class="pr-16 text-sm h-10 sm:h-9"
                aria-label="API key"
                :aria-describedby="draftProvider !== 'ollama' ? 'api-key-help' : undefined"
                @input="testResult = null"
              />
              <Button
                variant="ghost"
                size="sm"
                class="absolute right-0.5 top-0.5 h-9 sm:h-8 text-xs touch-manipulation"
                @click="showApiKey = !showApiKey"
                :aria-label="showApiKey ? 'Hide API key' : 'Show API key'"
                :aria-pressed="showApiKey"
              >
                {{ showApiKey ? 'Hide' : 'Show' }}
              </Button>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                @click="testConnection"
                :disabled="!draftApiKey || testingConnection"
                class="h-9 sm:h-7 text-xs min-w-[80px] touch-manipulation"
                :aria-label="testingConnection ? 'Testing connection' : 'Test API key connection'"
              >
                {{ testingConnection ? 'Testing...' : 'Test' }}
              </Button>
              <div v-if="testResult === 'success'" class="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 class="h-3 w-3" />
                Valid
              </div>
              <div v-if="testResult === 'error'" class="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle class="h-3 w-3" />
                Invalid
              </div>
            </div>
            <p id="api-key-help" class="text-xs text-muted-foreground">
              Get your key from
              <a
                :href="draftProvider === 'openai' ? 'https://platform.openai.com/api-keys' : draftProvider === 'google' ? 'https://aistudio.google.com/apikey' : 'https://console.anthropic.com/settings/keys'"
                target="_blank"
                rel="noopener noreferrer"
                class="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                :aria-label="'Get API key from ' + (draftProvider === 'openai' ? 'OpenAI' : draftProvider === 'google' ? 'Google AI Studio' : 'Anthropic')"
              >
                {{ draftProvider === 'openai' ? 'OpenAI' : draftProvider === 'google' ? 'Google AI Studio' : 'Anthropic' }}
              </a>
            </p>
          </div>
        </div>

        <!-- Ollama Info -->
        <div v-else class="rounded-lg border bg-blue-500/10 border-blue-500/20 p-3">
          <div class="flex items-start gap-2">
            <AlertCircle class="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div class="space-y-1.5 text-xs">
              <p class="font-medium">Run AI models on your own computer</p>
              <p class="text-muted-foreground">
                1. Install from <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">ollama.com</a>
              </p>
              <p class="text-muted-foreground">
                2. Pull a model: <code class="bg-muted px-1 py-0.5 rounded text-[11px]">ollama pull llama3.2:3b</code>
              </p>
              <p class="text-muted-foreground">
                3. Ollama runs in the background once installed
              </p>
            </div>
          </div>
        </div>

        <!-- Model Selection -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label class="text-sm font-medium">Model</Label>
            <Button
              v-if="draftProvider !== 'ollama' && draftApiKey"
              variant="ghost"
              size="sm"
              @click="showAllModels = !showAllModels; if (showAllModels) loadModels(draftProvider, draftApiKey)"
              class="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              {{ showAllModels ? 'Show Recommended' : 'Show All Models' }}
            </Button>
          </div>
          <div class="relative">
            <Button
              @click.stop="isModelDropdownOpen = !isModelDropdownOpen"
              variant="outline"
              class="w-full justify-start h-10 sm:h-9 text-sm gap-2 touch-manipulation"
              :aria-expanded="isModelDropdownOpen"
              aria-haspopup="listbox"
              aria-label="Select AI model"
              :disabled="loadingModels || (draftProvider !== 'ollama' && !draftApiKey)"
            >
              <span class="flex-1 text-left">
                {{ loadingModels ? 'Loading models...' : (draftProvider !== 'ollama' && !draftApiKey) ? 'Enter API key first' : currentModel.name }}
              </span>
              <ChevronDown v-if="!loadingModels" :class="['h-4 w-4 transition-transform duration-200', isModelDropdownOpen ? 'rotate-180' : '']" />
            </Button>
            
            <Transition name="dropdown">
              <div
                v-if="isModelDropdownOpen"
                role="listbox"
                aria-label="AI models"
                class="absolute left-0 right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden"
                @click.stop
              >
                <div v-if="availableModels.length === 0" class="px-3 py-4 text-sm text-muted-foreground text-center">
                  Enter an API key to load models
                </div>
                <button
                  v-for="model in availableModels"
                  :key="model.id"
                  @click="draftModel = model.id; isModelDropdownOpen = false"
                  role="option"
                  :aria-selected="draftModel === model.id"
                  class="w-full flex items-center gap-2 px-3 py-2.5 sm:py-2 text-sm hover:bg-muted transition-colors text-left min-h-[44px] sm:min-h-0 touch-manipulation"
                >
                  <div class="flex flex-col flex-1 min-w-0">
                    <span class="font-medium">{{ model.name }}</span>
                    <span class="text-xs text-muted-foreground line-clamp-1">{{ model.description }}</span>
                  </div>
                  <Check v-if="draftModel === model.id" class="h-4 w-4 shrink-0 text-primary" />
                </button>
              </div>
            </Transition>
          </div>
        </div>

        <!-- Privacy Note -->
        <div class="rounded-lg border bg-muted/50 p-2.5">
          <p class="text-xs text-muted-foreground">
            <strong>Privacy:</strong> Your API keys are stored locally in your browser. All AI requests go directly to your chosen provider.
          </p>
        </div>
      </div>

      <!-- Footer with Save Button - Fixed at bottom -->
      <div class="flex items-center justify-between gap-3 border-t px-4 py-3 sm:px-6 sm:py-4 bg-background">
        <p v-if="hasChanges" class="text-xs text-muted-foreground">
          You have unsaved changes
        </p>
        <p v-else-if="justSaved" class="text-xs text-green-600 flex items-center gap-1">
          <CheckCircle2 class="h-3 w-3" />
          Settings saved!
        </p>
        <div v-else></div>
        <div class="flex gap-2">
          <Button
            variant="ghost"
            @click="isOpen = false"
            :disabled="isSaving"
            class="h-10 sm:h-9"
          >
            Cancel
          </Button>
          <Button
            @click="saveSettings"
            :disabled="isSaving || justSaved"
            class="h-10 sm:h-9 gap-2 min-w-[100px]"
          >
            <Save v-if="!justSaved" class="h-4 w-4" />
            <CheckCircle2 v-else class="h-4 w-4" />
            {{ isSaving ? 'Saving...' : justSaved ? 'Saved!' : 'Save Settings' }}
          </Button>
        </div>
      </div>
    </DialogContentCustom>
  </Dialog>
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