/**
 * Composable for CMS file uploads.
 *
 * Converts files to base64 and sends as JSON to the upload endpoint.
 * This avoids multipart form data parsing issues on Netlify.
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

export function useCmsUpload() {
  const { getToken } = useCmsAuth()

  /**
   * Upload a file to the CMS media endpoint.
   * Returns the public path of the uploaded file.
   */
  async function uploadFile(file: File, folder: string = 'uploads'): Promise<{ path: string; filename: string }> {
    const base64 = await fileToBase64(file)
    const token = getToken()

    console.log('[useCmsUpload] uploading:', {
      filename: file.name,
      contentLength: base64?.length,
      contentType: file.type,
      folder,
      hasToken: !!token,
    })

    const res = await $fetch<{ path: string; filename: string }>('/api/cms/media/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        filename: file.name,
        content: base64,
        contentType: file.type,
        folder,
        token,
      },
    })

    console.log('[useCmsUpload] response:', res)
    return res
  }

  return { uploadFile }
}
