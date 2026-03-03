<script setup lang="ts">
/**
 * CMS Login page.
 * Supports two auth methods:
 *   1. GitHub OAuth — one-click "Login with GitHub" (if GITHUB_CLIENT_ID is configured)
 *   2. PAT mode — manual Personal Access Token entry (always available as fallback)
 */
import { ref } from 'vue'
import { KeyRound, Github, AlertCircle, Loader2, ChevronDown } from 'lucide-vue-next'

definePageMeta({
  layout: false, // No CMS layout on login page
})

const {
  loginWithToken,
  loginWithOAuth,
  isAuthenticated,
  isOAuthAvailable,
  isLoading,
  error: authError,
} = useCmsAuth()

const token = ref('')
const localError = ref('')
const showPatForm = ref(false)

// If already authenticated, redirect to dashboard
onMounted(async () => {
  const { restoreSession } = useCmsAuth()
  await restoreSession()
  if (isAuthenticated.value) {
    navigateTo('/cms')
  }
})

async function handlePatLogin() {
  if (!token.value.trim()) {
    localError.value = 'Please enter a GitHub Personal Access Token'
    return
  }
  localError.value = ''
  try {
    await loginWithToken(token.value.trim())
    navigateTo('/cms')
  } catch {
    // Error is set in the composable
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background p-4">
    <div class="w-full max-w-md space-y-6">
      <!-- Header -->
      <div class="text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <KeyRound class="h-8 w-8 text-primary" />
        </div>
        <h1 class="text-2xl font-bold tracking-tight">Content CMS</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Sign in with your GitHub account to manage content
        </p>
      </div>

      <!-- Login Card -->
      <div class="rounded-lg border bg-card p-6 space-y-4">
        <!-- GitHub OAuth Button (primary method) -->
        <button
          v-if="isOAuthAvailable"
          type="button"
          :disabled="isLoading"
          @click="loginWithOAuth"
          class="flex h-11 w-full items-center justify-center gap-2.5 rounded-md bg-[#24292f] px-4 text-sm font-medium text-white transition-colors hover:bg-[#24292f]/90 disabled:pointer-events-none disabled:opacity-50 dark:bg-white dark:text-[#24292f] dark:hover:bg-white/90"
        >
          <Github class="h-5 w-5" />
          Sign in with GitHub
        </button>

        <!-- Divider (when OAuth is available) -->
        <div v-if="isOAuthAvailable" class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t" />
          </div>
          <div class="relative flex justify-center text-xs">
            <span class="bg-card px-2 text-muted-foreground">or use a Personal Access Token</span>
          </div>
        </div>

        <!-- PAT Form Toggle (when OAuth available) / Always shown otherwise -->
        <div v-if="!isOAuthAvailable || showPatForm">
          <form @submit.prevent="handlePatLogin" class="space-y-4">
            <div>
              <label for="token" class="mb-1.5 block text-sm font-medium">
                GitHub Personal Access Token
              </label>
              <input
                id="token"
                v-model="token"
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                autocomplete="current-password"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <p class="mt-1.5 text-xs text-muted-foreground">
                Needs <code class="rounded bg-muted px-1">repo</code> scope.
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo&description=Learning+Materials+CMS"
                  target="_blank"
                  class="text-primary underline hover:no-underline"
                >
                  Generate one →
                </a>
              </p>
            </div>

            <!-- Error -->
            <div v-if="authError || localError" class="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle class="mt-0.5 h-4 w-4 shrink-0" />
              <span>{{ authError || localError }}</span>
            </div>

            <button
              type="submit"
              :disabled="isLoading"
              class="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              <Loader2 v-if="isLoading" class="h-4 w-4 animate-spin" />
              <KeyRound v-else class="h-4 w-4" />
              {{ isLoading ? 'Authenticating...' : 'Sign In with Token' }}
            </button>
          </form>
        </div>

        <!-- Expand PAT form button (when OAuth is primary) -->
        <button
          v-if="isOAuthAvailable && !showPatForm"
          type="button"
          @click="showPatForm = true"
          class="flex w-full items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Use Personal Access Token instead
          <ChevronDown class="h-3 w-3" />
        </button>
      </div>

      <!-- Footer -->
      <p class="text-center text-xs text-muted-foreground">
        <template v-if="!isOAuthAvailable">
          Your token is stored locally and never sent to our servers.
          <br />
        </template>
        <NuxtLink to="/" class="text-primary hover:underline">← Back to site</NuxtLink>
      </p>
    </div>
  </div>
</template>
