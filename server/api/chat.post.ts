export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { provider, apiKey, model, systemPrompt, userPrompt } = body

  console.log('[Chat API] Request received:', { provider, model, hasApiKey: !!apiKey })

  if (!provider || !systemPrompt || !userPrompt) {
    console.error('[Chat API] Missing required parameters')
    throw createError({
      statusCode: 400,
      message: 'Missing required parameters'
    })
  }

  try {
    switch (provider) {
      case 'openai':
        return await callOpenAI(apiKey, model, systemPrompt, userPrompt)
      case 'anthropic':
        return await callAnthropic(apiKey, model, systemPrompt, userPrompt)
      case 'google':
        return await callGoogle(apiKey, model, systemPrompt, userPrompt)
      case 'ollama':
        return await callOllama(model, systemPrompt, userPrompt)
      default:
        throw createError({
          statusCode: 400,
          message: 'Unsupported provider'
        })
    }
  } catch (error: any) {
    console.error('[Chat API] Error:', error.message, error.statusCode)
    
    // If it's already a H3 error, re-throw it
    if (error.statusCode) {
      throw error
    }
    
    // Otherwise wrap it
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to generate response'
    })
  }
})

async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
) {
  // GPT-4o and newer models use max_completion_tokens, older models use max_tokens
  const isNewerModel = model.includes('gpt-4o') || model.includes('gpt-5')
  const tokenParam = isNewerModel ? 'max_completion_tokens' : 'max_tokens'
  
  // GPT-5 models only support default temperature (1)
  const isGPT5 = model.includes('gpt-5')
  
  const requestBody: any = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    [tokenParam]: 800
  }
  
  // Only add temperature for non-GPT-5 models
  if (!isGPT5) {
    requestBody.temperature = 0.7
  }
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMessage = errorData.error?.message || `OpenAI API error: ${response.status}`
    
    if (response.status === 401) {
      throw createError({
        statusCode: 401,
        message: 'Invalid OpenAI API key. Please check your API key in settings.'
      })
    }
    
    throw createError({
      statusCode: response.status,
      message: errorMessage
    })
  }

  const data = await response.json()
  return { content: data.choices[0].message.content }
}

async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 800,
      temperature: 0.7
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMessage = errorData.error?.message || `Anthropic API error: ${response.status}`
    
    if (response.status === 401) {
      throw createError({
        statusCode: 401,
        message: 'Invalid Anthropic API key. Please check your API key in settings.'
      })
    }
    
    throw createError({
      statusCode: response.status,
      message: errorMessage
    })
  }

  const data = await response.json()
  return { content: data.content[0].text }
}

async function callGoogle(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\n${userPrompt}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800
        }
      })
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMessage = errorData.error?.message || `Google API error: ${response.status}`
    
    if (response.status === 401 || response.status === 403) {
      throw createError({
        statusCode: 401,
        message: 'Invalid Google API key. Please check your API key in settings.'
      })
    }
    
    throw createError({
      statusCode: response.status,
      message: errorMessage
    })
  }

  const data = await response.json()
  return { content: data.candidates[0].content.parts[0].text }
}

async function callOllama(
  model: string,
  systemPrompt: string,
  userPrompt: string
) {
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 800
      }
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw createError({
      statusCode: response.status,
      message: errorData.error || `Ollama API error: ${response.status}. Make sure Ollama is running locally.`
    })
  }

  const data = await response.json()
  return { content: data.message.content }
}
