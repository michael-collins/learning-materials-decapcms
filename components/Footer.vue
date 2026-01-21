<script setup lang="ts">
import { Github, Twitter, Mail, Sun, Moon } from 'lucide-vue-next'
import Button from '~/components/ui/button/Button.vue'

const currentYear = new Date().getFullYear()
const { isDark, toggleTheme } = useTheme()
</script>

<template>
  <footer class="border-t bg-background">
    <div class="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="flex gap-6 text-sm text-muted-foreground justify-end items-center">
        
        <NuxtLink to="/about" class="hover:text-foreground transition-colors">About</NuxtLink>
        <a href="https://github.com/michael-collins/learning-materials-decapcms" class="text-muted-foreground hover:text-foreground transition-colors" aria-label="GitHub">
            <Github class="h-5 w-5" />
          </a>
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
  </footer>
</template>
