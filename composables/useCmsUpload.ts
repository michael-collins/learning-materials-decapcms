/**
 * Composable for CMS file uploads.
 *
 * Uploads files directly to the GitHub Contents API from the browser,
 * bypassing Netlify functions entirely (which have a ~1 MB payload limit
 * that makes file uploads fail).
 *
 * For local dev, falls back to the /api/cms/media/upload endpoint
 * which writes to the local filesystem.
 */

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1] || ''
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function sanitizeFilename(originalFilename: string): string {
  const dotIdx = originalFilename.lastIndexOf('.')
  const ext = dotIdx >= 0 ? originalFilename.slice(dotIdx) : ''
  const baseName = originalFilename
    .slice(0, dotIdx >= 0 ? dotIdx : originalFilename.length)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const timestamp = Date.now().toString(36)
  return `${baseName}-${timestamp}${ext}`
}

export function useCmsUpload() {
  const { getToken } = useCmsAuth()
  const { config } = useCmsConfig()

  /**
   * Upload a file to the CMS media storage.
   *
   * Production: calls GitHub Contents API directly from the browser.
   * Dev: posts to /api/cms/media/upload (local filesystem).
   */
  async function uploadFile(file: File, folder: string = 'uploads'): Promise<{ path: string; filename: string }> {
    const base64 = await fileToBase64(file)
    const token = getToken()
    const safeFilename = sanitizeFilename(file.name)
    const normalizedFolder = folder.replace(/\.\./g, '').replace(/^\//, '')

    // If we have config + token, upload directly to GitHub (production path)
    if (token && config.value?.backend?.repo) {
      const repoStr = config.value.backend.repo
      const branch = config.value.backend.branch || 'main'
      const repoPath = `public/${normalizedFolder}/${safeFilename}`
      const apiUrl = `https://api.github.com/repos/${repoStr}/contents/${repoPath}`

      console.log('[useCmsUpload] direct GitHub upload:', { repoPath, branch, fileSize: file.size })

      // Check if file already exists (to get SHA for update)
      let existingSha: string | undefined
      try {
        const existing = await $fetch<{ sha: string }>(apiUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
          },
          query: { ref: branch },
        })
        existingSha = existing.sha
      } catch {
        // File doesn't exist yet — that's fine, we'll create it
      }

      // PUT to GitHub Contents API
      const res = await $fetch<{ content: { sha: string } }>(apiUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: {
          message: `media: upload ${safeFilename}`,
          content: base64,
          branch,
          ...(existingSha ? { sha: existingSha } : {}),
        },
      })

      console.log('[useCmsUpload] GitHub upload success, sha:', res.content?.sha)

      const publicPath = `/${normalizedFolder}/${safeFilename}`
      return { path: publicPath, filename: safeFilename }
    }

    // Fallback: local dev — use the server endpoint (multipart)
    console.log('[useCmsUpload] local dev upload:', { filename: file.name, folder })
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)

    const res = await $fetch<{ path: string; filename: string }>('/api/cms/media/upload', {
      method: 'POST',
      body: formData,
    })

    return res
  }

  return { uploadFile }
}
