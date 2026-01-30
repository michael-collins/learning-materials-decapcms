<script setup lang="ts">
import { ref, computed } from 'vue'
import { Copy, Check, ChevronDown } from 'lucide-vue-next'
import Button from '~/components/ui/button/Button.vue'

interface Props {
  embedUrl: string
  title: string
}

const props = defineProps<Props>()

const isEmbedOpen = ref(false)
const isCopied = ref(false)
const isEmbedConfigOpen = ref(false)
const isEmbedPreviewOpen = ref(false)
const embedShowRubric = ref(true)
const embedShowAILicense = ref(true)

const embedCode = computed(() => {
  let code = `<iframe src="${props.embedUrl}"`
  
  if (!embedShowRubric.value) {
    code += ' data-hide-rubric="true"'
  }
  if (!embedShowAILicense.value) {
    code += ' data-hide-ai-license="true"'
  }
  
  code += ' width="100%" height="600" frameborder="0" allowfullscreen></iframe>'
  return code
})

const copyEmbedCode = async () => {
  try {
    await navigator.clipboard.writeText(embedCode.value)
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}
</script>

<template>
  <div class="mt-12 pt-8 pb-8 border-t">
    <button
      @click="isEmbedOpen = !isEmbedOpen"
      class="flex items-center justify-between w-full text-left group"
      :aria-label="isEmbedOpen ? 'Hide embed code' : 'Show embed code'"
      :aria-expanded="isEmbedOpen"
    >
      <h2 class="text-2xl font-bold text-foreground">Embed</h2>
      <ChevronDown
        :class="['w-5 h-5 text-muted-foreground transition-transform', isEmbedOpen ? 'rotate-180' : '']"
      />
    </button>
    <div v-if="isEmbedOpen" class="mt-6 space-y-6">
      <!-- Configuration Section -->
      <div class="border border-border rounded-lg">
        <button
          @click="isEmbedConfigOpen = !isEmbedConfigOpen"
          class="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-t-lg"
          :aria-label="isEmbedConfigOpen ? 'Hide embed configuration' : 'Show embed configuration'"
          :aria-expanded="isEmbedConfigOpen"
        >
          <h3 class="text-sm font-semibold text-foreground">Configuration</h3>
          <ChevronDown
            :class="['w-4 h-4 text-muted-foreground transition-transform', isEmbedConfigOpen ? 'rotate-180' : '']"
          />
        </button>
        <div v-if="isEmbedConfigOpen" class="px-4 py-3 border-t border-border space-y-3">
          <label class="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              v-model="embedShowRubric"
              class="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
            />
            <span class="text-sm text-foreground">Display rubric</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              v-model="embedShowAILicense"
              class="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
            />
            <span class="text-sm text-foreground">Display AI license</span>
          </label>
        </div>
      </div>

      <!-- Embed Code -->
      <div>
        <p class="text-sm text-muted-foreground mb-3">
          Copy the code below to embed this content on your website:
        </p>
        <div class="relative">
          <pre class="p-4 bg-muted dark:bg-[#0a0a0a] rounded-lg border border-border overflow-x-auto text-sm"><code>{{ embedCode }}</code></pre>
          <Button
            @click="copyEmbedCode"
            size="sm"
            variant="outline"
            class="absolute top-2 right-2"
          >
            <Check v-if="isCopied" class="w-4 h-4 mr-2" />
            <Copy v-else class="w-4 h-4 mr-2" />
            {{ isCopied ? 'Copied!' : 'Copy' }}
          </Button>
        </div>
      </div>

      <!-- Preview Section -->
      <div class="border border-border rounded-lg">
        <button
          @click="isEmbedPreviewOpen = !isEmbedPreviewOpen"
          class="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-t-lg"
          :aria-label="isEmbedPreviewOpen ? 'Hide embed preview' : 'Show embed preview'"
          :aria-expanded="isEmbedPreviewOpen"
        >
          <h3 class="text-sm font-semibold text-foreground">Preview</h3>
          <ChevronDown
            :class="['w-4 h-4 text-muted-foreground transition-transform', isEmbedPreviewOpen ? 'rotate-180' : '']"
          />
        </button>
        <div v-if="isEmbedPreviewOpen" class="p-4 border-t border-border">
          <div class="bg-muted/30 rounded-lg overflow-hidden">
            <iframe
              :src="embedUrl"
              class="w-full h-96"
              frameborder="0"
            ></iframe>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
