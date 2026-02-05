<script setup lang="ts">
import { ref } from 'vue'
import { Settings, Key, Sparkles, CheckCircle2, AlertCircle, Check, AlertTriangle } from 'lucide-vue-next'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import Button from '~/components/ui/button/Button.vue'
import Input from '~/components/ui/input/Input.vue'
import Label from '~/components/ui/label/Label.vue'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group'
import { useChatbotSettings, type Provider } from '~/composables/useChatbotSettings'

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

const {
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
} = useChatbotSettings()

const showApiKey = ref(false)
const testingConnection = ref(false)
const testResult = ref<'success' | 'error' | null>(null)

const providerOptions = [
  { value: 'openai', label: 'OpenAI', description: 'GPT-4o mini recommended' },
  { value: 'anthropic', label: 'Anthropic', description: 'Claude 3.5 Haiku recommended' },
  { value: 'google', label: 'Google', description: 'Gemini 2.0 Flash recommended' },
  { value: 'ollama', label: 'Ollama', description: 'Run models locally on your computer' }
] as const

async function testConnection() {
  testingConnection.value = true
  testResult.value = null
  
  try {
    const key = settings.value.apiKey.trim()
    console.log('[Settings Test] Testing connection for', settings.value.provider)
    console.log('[Settings Test] Key length:', key.length, 'starts with:', key.substring(0, 10))
    
    if (settings.value.provider === 'ollama') {
      testResult.value = 'success'
    } else if (settings.value.provider === 'openai') {
      if (key.startsWith('sk-')) {
        console.log('[Settings Test] OpenAI key format valid')
        testResult.value = 'success'
      } else {
        console.error('[Settings Test] OpenAI key should start with sk-, got:', key.substring(0, 5))
        testResult.value = 'error'
      }
    } else if (settings.value.provider === 'anthropic') {
      if (key.startsWith('sk-ant-')) {
        console.log('[Settings Test] Anthropic key format valid')
        testResult.value = 'success'
      } else {
        console.error('[Settings Test] Anthropic key should start with sk-ant-, got:', key.substring(0, 7))
        testResult.value = 'error'
      }
    } else if (settings.value.provider === 'google') {
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
    <DialogContent class="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Settings class="h-5 w-5" />
          Chatbot Settings
        </DialogTitle>
        <DialogDescription>
          Configure AI provider to enable enhanced conversational responses
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-3">
        <!-- Enhanced Mode Toggle -->
        <div class="rounded-lg border bg-muted/50 p-3">
          <div class="flex items-start justify-between gap-3">
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
              :variant="settings.enhancedMode ? 'default' : 'outline'"
              size="sm"
              :disabled="!canUseEnhancedMode"
              @click="toggleEnhancedMode"
              class="shrink-0 min-w-[100px]"
              :class="{ 'bg-green-600 hover:bg-green-700 text-white': settings.enhancedMode }"
            >
              <Check v-if="settings.enhancedMode" class="h-4 w-4 mr-1" />
              <AlertTriangle v-else class="h-4 w-4 mr-1" />
              {{ settings.enhancedMode ? 'Enabled' : 'Enable' }}
            </Button>
          </div>
        </div>

        <!-- Provider Selection -->
        <div class="space-y-2">
          <Label class="text-sm">AI Provider</Label>
          <RadioGroup :model-value="settings.provider" @update:model-value="(value: string) => updateProvider(value as Provider)">
            <div
              v-for="option in providerOptions"
              :key="option.value"
              class="flex items-start space-x-2 rounded-md border p-2.5 cursor-pointer hover:bg-accent transition-colors"
              :class="{ 'border-primary bg-accent': settings.provider === option.value }"
              @click="updateProvider(option.value as Provider)"
            >
              <RadioGroupItem :value="option.value" :id="option.value" class="mt-0.5" />
              <div class="flex-1 min-w-0">
                <Label :for="option.value" class="font-medium cursor-pointer text-sm">
                  {{ option.label }}
                </Label>
                <p class="text-xs text-muted-foreground">{{ option.description }}</p>
              </div>
            </div>
          </RadioGroup>
        </div>

        <!-- API Key Input (not shown for Ollama) -->
        <div v-if="settings.provider !== 'ollama'" class="space-y-2">
          <div class="flex items-center justify-between">
            <Label for="api-key" class="flex items-center gap-1.5 text-sm">
              <Key class="h-3.5 w-3.5" />
              API Key
            </Label>
            <Button
              v-if="settings.apiKey"
              variant="ghost"
              size="sm"
              @click="clearApiKey"
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
                :model-value="settings.apiKey"
                @update:model-value="updateApiKey"
                :placeholder="settings.provider === 'openai' ? 'sk-... or sk-proj-...' : settings.provider === 'google' ? 'AIza...' : 'sk-ant-...'"
                class="pr-16 text-sm h-9"
              />
              <Button
                variant="ghost"
                size="sm"
                class="absolute right-0.5 top-0.5 h-8 text-xs"
                @click="showApiKey = !showApiKey"
              >
                {{ showApiKey ? 'Hide' : 'Show' }}
              </Button>
            </div>
            <div class="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                @click="testConnection"
                :disabled="!settings.apiKey || testingConnection"
                class="h-7 text-xs"
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
            <p class="text-xs text-muted-foreground">
              Get your key from
              <a
                :href="settings.provider === 'openai' ? 'https://platform.openai.com/api-keys' : settings.provider === 'google' ? 'https://aistudio.google.com/apikey' : 'https://console.anthropic.com/settings/keys'"
                target="_blank"
                rel="noopener noreferrer"
                class="text-primary hover:underline"
              >
                {{ settings.provider === 'openai' ? 'OpenAI' : settings.provider === 'google' ? 'Google AI Studio' : 'Anthropic' }}
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
          <Label class="text-sm">Model</Label>
          <RadioGroup :model-value="settings.model" @update:model-value="updateModel">
            <div
              v-for="model in availableModels"
              :key="model.id"
              class="flex items-start space-x-2 rounded-md border p-2.5 cursor-pointer hover:bg-accent transition-colors"
              :class="{ 'border-primary bg-accent': settings.model === model.id }"
              @click="updateModel(model.id)"
            >
              <RadioGroupItem :value="model.id" :id="model.id" class="mt-0.5" />
              <div class="flex-1 min-w-0">
                <Label :for="model.id" class="font-medium cursor-pointer text-sm">
                  {{ model.name }}
                </Label>
                <p class="text-xs text-muted-foreground">{{ model.description }}</p>
              </div>
            </div>
          </RadioGroup>
        </div>

        <!-- Privacy Note -->
        <div class="rounded-lg border bg-muted/50 p-2.5">
          <p class="text-xs text-muted-foreground">
            <strong>Privacy:</strong> Your API keys are stored locally in your browser. All AI requests go directly to your chosen provider.
          </p>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
