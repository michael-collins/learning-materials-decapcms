/**
 * Deploy to GitHub Pages composable.
 *
 * Manages the multi-step workflow:
 *   1. Authentication check
 *   2. Repo name input
 *   3. Generate book HTML files on client
 *   4. Push files to a new GitHub repo
 *   5. Enable GitHub Pages
 *   6. Success / error
 */
import { ref, computed } from 'vue'
import { useCmsAuth } from '~/composables/useCmsAuth'
import { useBookExport } from '~/composables/useBookExport'

export type DeployStep = 'auth' | 'form' | 'deploying' | 'success' | 'error'

export interface DeployResult {
  repoUrl: string
  pagesUrl: string
  actionsUrl: string
  login: string
}

const dialogOpen = ref(false)
const step = ref<DeployStep>('auth')
const repoName = ref('')
const repoDescription = ref('')
const deployProgress = ref('')
const deployError = ref('')
const deployResult = ref<DeployResult | null>(null)
const bookSlug = ref('')

export function useGitHubPagesDeploy() {
  const { isAuthenticated, user, loginWithOAuth, getToken, restoreSession } = useCmsAuth()
  const { generateBookHtmlFiles } = useBookExport()

  /** Open the deploy dialog, starting from the appropriate step */
  async function openDialog(slug?: string) {
    // Reset state
    bookSlug.value = slug || ''
    repoName.value = ''
    repoDescription.value = ''
    deployProgress.value = ''
    deployError.value = ''
    deployResult.value = null

    // Ensure session is restored
    await restoreSession()

    // Start at auth step if not logged in, otherwise jump to form
    step.value = isAuthenticated.value ? 'form' : 'auth'
    dialogOpen.value = true
  }

  /** Close the dialog */
  function closeDialog() {
    dialogOpen.value = false
  }

  /** Handle OAuth login */
  function handleOAuthLogin() {
    loginWithOAuth()
  }

  /** Proceed from auth step after session restore */
  async function checkAuth() {
    await restoreSession()
    if (isAuthenticated.value) {
      step.value = 'form'
    }
  }

  /** Execute the deploy */
  async function deploy() {
    if (!repoName.value.trim() || !bookSlug.value) return

    step.value = 'deploying'
    deployError.value = ''
    deployProgress.value = 'Generating book HTML files...'

    try {
      // 1. Generate book HTML files on the client
      const { files, uploadPaths } = await generateBookHtmlFiles(bookSlug.value, (msg: string) => {
        deployProgress.value = msg
      })

      if (!files || Object.keys(files).length === 0) {
        throw new Error('No files were generated for this book.')
      }

      // 2. Fetch referenced media files and convert to base64
      //    These will be included in the repo as binary blobs
      const binaryFiles: Record<string, string> = {}
      if (uploadPaths.length > 0) {
        deployProgress.value = `Fetching ${uploadPaths.length} media files...`
        // Fetch in batches of 6 to avoid overwhelming the browser
        for (let i = 0; i < uploadPaths.length; i += 6) {
          const batch = uploadPaths.slice(i, i + 6)
          const results = await Promise.allSettled(
            batch.map(async (uploadPath) => {
              const resp = await fetch(uploadPath)
              if (!resp.ok) return null
              const arrayBuf = await resp.arrayBuffer()
              const bytes = new Uint8Array(arrayBuf)
              let binary = ''
              for (let j = 0; j < bytes.length; j++) {
                binary += String.fromCharCode(bytes[j]!)
              }
              return { path: uploadPath.replace(/^\//, ''), base64: btoa(binary) }
            })
          )
          for (const r of results) {
            if (r.status === 'fulfilled' && r.value) {
              binaryFiles[r.value.path] = r.value.base64
            }
          }
          deployProgress.value = `Fetching media... ${Math.min(i + 6, uploadPaths.length)}/${uploadPaths.length}`
        }
      }

      const totalFiles = Object.keys(files).length + Object.keys(binaryFiles).length
      deployProgress.value = `Pushing ${totalFiles} files to GitHub...`

      // 3. Send files to server for repo creation + Pages enablement
      const body: Record<string, any> = {
        repoName: repoName.value.trim(),
        files,
        binaryFiles,
      }
      if (repoDescription.value.trim()) {
        body.description = repoDescription.value.trim()
      }

      // Include PAT token if in PAT mode (OAuth uses httpOnly cookie automatically)
      const patToken = getToken()
      if (patToken) {
        body.token = patToken
      }

      deployProgress.value = 'Creating repository & enabling GitHub Pages...'

      const result = await $fetch<DeployResult>('/api/deploy/github-pages', {
        method: 'POST',
        body,
      })

      deployResult.value = result
      deployProgress.value = ''
      step.value = 'success'
    } catch (e: any) {
      const msg =
        e?.data?.message || e?.statusMessage || e?.message || 'Deployment failed'
      deployError.value = msg
      step.value = 'error'
    }
  }

  /** Retry after an error */
  function retry() {
    step.value = 'form'
    deployError.value = ''
  }

  return {
    // State
    dialogOpen,
    step: computed(() => step.value),
    repoName,
    repoDescription,
    bookSlug: computed(() => bookSlug.value),
    deployProgress: computed(() => deployProgress.value),
    deployError: computed(() => deployError.value),
    deployResult: computed(() => deployResult.value),
    isAuthenticated,
    user,

    // Actions
    openDialog,
    closeDialog,
    handleOAuthLogin,
    checkAuth,
    deploy,
    retry,
  }
}
