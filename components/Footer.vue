<script setup lang="ts">
import { Github, Twitter, Mail, Sun, Moon, Bot } from 'lucide-vue-next'
import Button from '~/components/ui/button/Button.vue'
import AIChatInterface from '~/components/AIChatInterface.vue'

const currentYear = new Date().getFullYear()
const { isDark, toggleTheme } = useTheme()
const { isOpen: chatOpen } = useChatState()
</script>

<template>
  <footer class="border-t bg-background">
    <div class="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="flex gap-2 text-sm text-muted-foreground justify-end items-center">
        
        <Button
          variant="ghost"
          size="sm"
          as="a"
          href="/about"
          aria-label="About"
        >
          About
        </Button>
        <Button
          variant="ghost"
          size="sm"
          as="a"
          href="/terms"
          aria-label="Terms of Use"
        >
          Terms
        </Button>
        <Button
          variant="ghost"
          size="icon"
          @click="chatOpen = true"
          aria-label="Open Nav Bot 3000"
        >
          <Bot class="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          as="a"
          href="https://github.com/michael-collins/learning-materials-decapcms"
          aria-label="GitHub"
        >
          <Github class="h-5 w-5" />
        </Button>
        <div class="ml-2 pl-2 border-l">
          <Button
              variant="ghost"
              size="icon"
              @click="toggleTheme"
              :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            >
              <Sun v-if="isDark" class="h-5 w-5" />
              <Moon v-else class="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
    
    <!-- AI Chat Interface -->
    <AIChatInterface v-model:open="chatOpen" />
  </footer>
</template>
