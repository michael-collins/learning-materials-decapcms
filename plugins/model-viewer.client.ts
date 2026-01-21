// Plugin to register model-viewer web component
export default defineNuxtPlugin(() => {
  // Only run on client side
  if (process.client) {
    // Import model-viewer dynamically
    import('@google/model-viewer').then(() => {
      console.log('✅ model-viewer web component loaded')
    }).catch((error) => {
      console.error('Failed to load model-viewer:', error)
    })
  }
})
