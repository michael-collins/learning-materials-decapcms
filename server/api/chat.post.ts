export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { provider, apiKey, model, systemPrompt, userPrompt, max_tokens, messages } = body

  console.log('[Chat API] Request received:', { provider, model, hasApiKey: !!apiKey, max_tokens, hasMessages: !!messages })

  if (!provider || !systemPrompt) {
    console.error('[Chat API] Missing required parameters')
    throw createError({
      statusCode: 400,
      message: 'Missing required parameters'
    })
  }

  // Support either messages array (preferred) or userPrompt (legacy)
  if (!messages && !userPrompt) {
    console.error('[Chat API] Missing messages or userPrompt')
    throw createError({
      statusCode: 400,
      message: 'Missing messages or userPrompt'
    })
  }

  try {
    switch (provider) {
      case 'openai':
        return await callOpenAI(apiKey, model, systemPrompt, userPrompt, max_tokens, messages)
      case 'anthropic':
        return await callAnthropic(apiKey, model, systemPrompt, userPrompt, max_tokens, messages)
      case 'google':
        return await callGoogle(apiKey, model, systemPrompt, userPrompt, max_tokens, messages)
      case 'ollama':
        return await callOllama(model, systemPrompt, userPrompt, max_tokens, messages)
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
  userPrompt: string,
  max_tokens?: number,
  conversationMessages?: Array<{ role: string; content: string }>
) {
  // GPT-4o and newer models use max_completion_tokens, older models use max_tokens
  const isNewerModel = model.includes('gpt-4o') || model.includes('gpt-5')
  const tokenParam = isNewerModel ? 'max_completion_tokens' : 'max_tokens'
  
  // GPT-5 models only support default temperature (1)
  const isGPT5 = model.includes('gpt-5')
  
  // Build messages array: system + conversation history + current user prompt
  const messages = conversationMessages 
    ? [
        { role: 'system', content: systemPrompt },
        ...conversationMessages,
        { role: 'user', content: userPrompt }
      ]
    : [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
  
  const requestBody: any = {
    model,
    messages,
    [tokenParam]: max_tokens || 800
  }
  
  // Only add temperature for non-GPT-5 models
  if (!isGPT5) {
    requestBody.temperature = 0.7
  }
  
  console.log('[Chat API] OpenAI request:', {
    model,
    messageCount: messages.length,
    hasConversation: !!conversationMessages,
    [tokenParam]: requestBody[tokenParam]
  })
  
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
    
    console.error('[Chat API] OpenAI error:', {
      status: response.status,
      message: errorMessage,
      error: errorData
    })
    
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
  
  console.log('[Chat API] OpenAI response:', {
    hasChoices: !!data.choices,
    choicesLength: data.choices?.length || 0,
    hasContent: !!data.choices?.[0]?.message?.content,
    contentLength: data.choices?.[0]?.message?.content?.length || 0,
    finishReason: data.choices?.[0]?.finish_reason,
    refusal: data.choices?.[0]?.message?.refusal,
    usage: data.usage
  })
  
  const content = data.choices?.[0]?.message?.content || ''
  const finishReason = data.choices?.[0]?.finish_reason
  const refusal = data.choices?.[0]?.message?.refusal
  
  if (!content) {
    console.error('[Chat API] Empty content from OpenAI:', {
      finishReason,
      refusal,
      model,
      requestedTokens: requestBody[tokenParam]
    })
    
    if (refusal) {
      throw createError({
        statusCode: 400,
        message: `OpenAI refused to respond: ${refusal}`
      })
    }
    
    if (finishReason === 'length') {
      throw createError({
        statusCode: 400,
        message: 'Response was cut off due to length limit. Try a shorter query.'
      })
    }
  }
  
  return { content }
}

async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  max_tokens?: number
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
      max_tokens: max_tokens || 800,
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
  userPrompt: string,
  max_tokens?: number
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
          maxOutputTokens: max_tokens || 800
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
  userPrompt: string,
  max_tokens?: number
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
        num_predict: max_tokens || 800
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
