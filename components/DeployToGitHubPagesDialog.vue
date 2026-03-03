<script setup lang="ts">
import {
  Github,
  Rocket,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
} from 'lucide-vue-next'
import Dialog from '~/components/ui/dialog/Dialog.vue'
import DialogContent from '~/components/ui/dialog/DialogContent.vue'
import DialogHeader from '~/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '~/components/ui/dialog/DialogTitle.vue'
import DialogDescription from '~/components/ui/dialog/DialogDescription.vue'
import Button from '~/components/ui/button/Button.vue'
import Input from '~/components/ui/input/Input.vue'
import { useGitHubPagesDeploy } from '~/composables/useGitHubPagesDeploy'

const {
  dialogOpen,
  step,
  repoName,
  repoDescription,
  bookSlug,
  deployProgress,
  deployError,
  deployResult,
  isAuthenticated,
  user,
  closeDialog,
  handleOAuthLogin,
  checkAuth,
  deploy,
  retry,
} = useGitHubPagesDeploy()

/** Sanitize repo name as user types */
function onRepoNameInput(val: string) {
  repoName.value = val.replace(/[^\w.\-]/g, '-').replace(/^-+/, '')
}

/** Handle form submit */
function handleSubmit() {
  if (repoName.value.trim()) {
    deploy()
  }
}

// On dialog open, check if user became authenticated (e.g., returned from OAuth)
watch(dialogOpen, async (open) => {
  if (open && step.value === 'auth') {
    await checkAuth()
  }
})
</script>

<template>
  <Dialog v-model:open="dialogOpen">
    <DialogContent class="sm:max-w-md">
      <!-- Step 1: Authentication -->
      <template v-if="step === 'auth'">
        <DialogHeader>
          <DialogTitle>Deploy to GitHub Pages</DialogTitle>
          <DialogDescription>
            Sign in with GitHub to deploy this book as a live website.
          </DialogDescription>
        </DialogHeader>

        <div class="flex flex-col gap-3 pt-2">
          <Button class="w-full gap-2" @click="handleOAuthLogin">
            <Github class="h-4 w-4" />
            Sign in with GitHub
          </Button>
          <p class="text-xs text-center text-muted-foreground">
            We'll create a new repository with your book's HTML files and enable GitHub Pages.
          </p>
        </div>
      </template>

      <!-- Step 2: Repo name form -->
      <template v-if="step === 'form'">
        <DialogHeader>
          <DialogTitle>Deploy to GitHub Pages</DialogTitle>
          <DialogDescription>
            Choose a name for your new repository. The book will be published under
            <span class="font-medium text-foreground">{{ user?.login }}</span>.
          </DialogDescription>
        </DialogHeader>

        <form class="flex flex-col gap-4 pt-2" @submit.prevent="handleSubmit">
          <div class="space-y-2">
            <label for="deploy-repo-name" class="text-sm font-medium">Repository name</label>
            <Input
              id="deploy-repo-name"
              :model-value="repoName"
              placeholder="my-learning-site"
              @update:model-value="onRepoNameInput"
            />
            <p v-if="repoName" class="text-xs text-muted-foreground">
              {{ user?.login }}/{{ repoName }}
            </p>
          </div>

          <div class="space-y-2">
            <label for="deploy-description" class="text-sm font-medium">
              Description <span class="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              id="deploy-description"
              v-model="repoDescription"
              placeholder="My open educational resource site"
            />
          </div>

          <div class="rounded-md border bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
            <p class="font-medium text-foreground">What happens next:</p>
            <ul class="list-disc pl-4 space-y-0.5">
              <li>A new repository is created on your GitHub account</li>
              <li>The book's HTML files are pushed to the repository</li>
              <li>GitHub Pages is enabled — your book will be live in a few minutes</li>
            </ul>
          </div>

          <Button type="submit" class="w-full gap-2" :disabled="!repoName.trim()">
            <Rocket class="h-4 w-4" />
            Deploy
          </Button>
        </form>
      </template>

      <!-- Step 3: Deploying -->
      <template v-if="step === 'deploying'">
        <DialogHeader>
          <DialogTitle>Deploying...</DialogTitle>
          <DialogDescription>
            Setting up your GitHub Pages site. This usually takes about 30 seconds.
          </DialogDescription>
        </DialogHeader>

        <div class="flex flex-col items-center gap-4 py-6">
          <Loader2 class="h-10 w-10 animate-spin text-primary" />
          <p class="text-sm text-muted-foreground">{{ deployProgress }}</p>
        </div>
      </template>

      <!-- Step 4: Success -->
      <template v-if="step === 'success' && deployResult">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <CheckCircle2 class="h-5 w-5 text-green-500" />
            Deployed!
          </DialogTitle>
          <DialogDescription>
            Your site is being built. It'll be live on GitHub Pages in a few minutes.
          </DialogDescription>
        </DialogHeader>

        <div class="flex flex-col gap-3 pt-2 overflow-hidden">
          <a
            :href="deployResult.repoUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-2 rounded-md border p-3 text-sm hover:bg-muted transition-colors min-w-0"
          >
            <Github class="h-4 w-4 shrink-0" />
            <span class="truncate min-w-0">{{ deployResult.repoUrl.replace('https://github.com/', '') }}</span>
            <ExternalLink class="h-3.5 w-3.5 ml-auto shrink-0 text-muted-foreground" />
          </a>

          <a
            :href="deployResult.pagesUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-2 rounded-md border p-3 text-sm hover:bg-muted transition-colors min-w-0"
          >
            <Rocket class="h-4 w-4 shrink-0 text-primary" />
            <span class="truncate min-w-0">{{ deployResult.pagesUrl }}</span>
            <ExternalLink class="h-3.5 w-3.5 ml-auto shrink-0 text-muted-foreground" />
          </a>

          <a
            :href="deployResult.actionsUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground hover:bg-muted transition-colors min-w-0"
          >
            <KeyRound class="h-3.5 w-3.5 shrink-0" />
            <span class="truncate min-w-0">Watch the build progress on GitHub Actions</span>
            <ExternalLink class="h-3 w-3 ml-auto shrink-0" />
          </a>

          <Button variant="outline" class="w-full mt-1" @click="closeDialog">
            Done
          </Button>
        </div>
      </template>

      <!-- Step 5: Error -->
      <template v-if="step === 'error'">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <AlertCircle class="h-5 w-5 text-destructive" />
            Deployment Failed
          </DialogTitle>
          <DialogDescription>
            Something went wrong while setting up your site.
          </DialogDescription>
        </DialogHeader>

        <div class="flex flex-col gap-3 pt-2">
          <div class="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {{ deployError }}
          </div>

          <div class="flex gap-2">
            <Button variant="outline" class="flex-1" @click="closeDialog">
              Cancel
            </Button>
            <Button class="flex-1" @click="retry">
              Try Again
            </Button>
          </div>
        </div>
      </template>
    </DialogContent>
  </Dialog>
</template>
