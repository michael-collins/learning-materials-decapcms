<script setup lang="ts">
import { Github, Twitter, Mail, Sun, Moon } from 'lucide-vue-next'
import Button from '~/components/ui/button/Button.vue'

const currentYear = new Date().getFullYear()
const { isDark, toggleTheme } = useTheme()
</script>

<template>
  <footer class="border-t bg-background">
    <div class="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <!-- About -->
        <div>
          <h3 class="mb-4 text-sm font-semibold">About</h3>
          <p class="text-sm text-muted-foreground leading-relaxed">
            A modern content platform for learning materials, built with Nuxt 4 and DecapCMS.
          </p>
        </div>

        <!-- Content -->
        <div>
          <h3 class="mb-4 text-sm font-semibold">Content</h3>
          <ul class="space-y-2 text-sm">
            <li>
              <NuxtLink to="/articles" class="text-muted-foreground hover:text-foreground transition-colors">
                Articles
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/tutorials" class="text-muted-foreground hover:text-foreground transition-colors">
                Tutorials
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Admin -->
        <div>
          <h3 class="mb-4 text-sm font-semibold">Admin</h3>
          <ul class="space-y-2 text-sm">
            <li>
              <a href="/admin" target="_blank" class="text-muted-foreground hover:text-foreground transition-colors">
                CMS Admin
              </a>
            </li>
          </ul>
        </div>

        <!-- Social & Theme -->
        <div>
          <h3 class="mb-4 text-sm font-semibold">Connect</h3>
          <div class="flex items-center gap-4">
            <a href="#" class="text-muted-foreground hover:text-foreground transition-colors" aria-label="GitHub">
              <Github class="h-5 w-5" />
            </a>
            <a href="#" class="text-muted-foreground hover:text-foreground transition-colors" aria-label="Twitter">
              <Twitter class="h-5 w-5" />
            </a>
            <a href="#" class="text-muted-foreground hover:text-foreground transition-colors" aria-label="Email">
              <Mail class="h-5 w-5" />
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
      </div>

      <div class="mt-8 border-t pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p class="text-sm text-muted-foreground">
          &copy; {{ currentYear }} Learning Materials. Built with Nuxt 4.
        </p>
        <div class="flex gap-6 text-sm text-muted-foreground">
          <a href="#" class="hover:text-foreground transition-colors">Privacy Policy</a>
          <a href="#" class="hover:text-foreground transition-colors">Terms of Service</a>
        </div>
      </div>
    </div>
  </footer>
</template>
