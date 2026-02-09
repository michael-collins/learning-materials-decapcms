export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { provider, apiKey, model, input } = body

  if (!provider || !apiKey || !input) {
    throw createError({ statusCode: 400, message: 'Missing required parameters' })
  }

  try {
    switch (provider) {
      case 'openai':
        return await callOpenAIEmbeddings(apiKey, model, input)
      case 'google':
        return await callGoogleEmbeddings(apiKey, model, input)
      default:
        throw createError({ statusCode: 400, message: 'Embeddings not supported for this provider' })
    }
  } catch (error: any) {
    console.error('[Embeddings API] Error:', error.message)
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, message: error.message || 'Embedding generation failed' })
  }
})

async function callOpenAIEmbeddings(apiKey: string, model: string | undefined, input: string[] | string) {
  const embeddingModel = model || 'text-embedding-3-small'
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: embeddingModel,
      input
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw createError({
      statusCode: response.status,
      message: errorData.error?.message || `OpenAI embeddings error: ${response.status}`
    })
  }

  const data = await response.json()
  return { embeddings: data.data.map((d: any) => d.embedding) }
}

async function callGoogleEmbeddings(apiKey: string, model: string | undefined, input: string[] | string) {
  const embeddingModel = model || 'text-embedding-004'
  const inputs = Array.isArray(input) ? input : [input]

  const embeddings: number[][] = []
  for (const text of inputs) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${embeddingModel}:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text }] }
        })
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw createError({
        statusCode: response.status,
        message: errorData.error?.message || `Google embeddings error: ${response.status}`
      })
    }

    const data = await response.json()
    embeddings.push(data.embedding.values)
  }

  return { embeddings }
}
