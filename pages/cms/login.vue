<script setup lang="ts">
/**
 * CMS Login page.
 * Simple GitHub PAT login for Phase 0.
 * Phase 2+ will add OAuth button.
 */
import { ref } from 'vue'
import { KeyRound, Github, AlertCircle, Loader2 } from 'lucide-vue-next'

definePageMeta({
  layout: false, // No CMS layout on login page
})

const { loginWithToken, isAuthenticated, isLoading, error: authError } = useCmsAuth()

const token = ref('')
const localError = ref('')

// If already authenticated, redirect to dashboard
onMounted(async () => {
  const { restoreSession } = useCmsAuth()
  await restoreSession()
  if (isAuthenticated.value) {
    navigateTo('/cms')
  }
})

async function handleLogin() {
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

      <!-- Login Form -->
      <div class="rounded-lg border bg-card p-6">
        <form @submit.prevent="handleLogin" class="space-y-4">
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
            <Github v-else class="h-4 w-4" />
            {{ isLoading ? 'Authenticating...' : 'Sign In' }}
          </button>
        </form>
      </div>

      <!-- Footer -->
      <p class="text-center text-xs text-muted-foreground">
        Your token is stored locally and never sent to our servers.
        <br />
        <NuxtLink to="/" class="text-primary hover:underline">← Back to site</NuxtLink>
      </p>
    </div>
  </div>
</template>
