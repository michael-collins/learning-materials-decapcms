# Chatbot Enhanced Mode Implementation

**Status:** Settings UI Complete, LLM Integration Pending  
**Date:** February 5, 2026

---

## What's Implemented

### 1. **Chatbot Settings Component**
- ✅ Provider selection (OpenAI, Anthropic, Ollama)
- ✅ API key input with show/hide toggle
- ✅ Basic API key format validation
- ✅ Model selection with descriptions and pricing
- ✅ Enhanced mode toggle
- ✅ Privacy notice

### 2. **Model Database (Current 2026)**

**OpenAI Models:**
- GPT-5.2 - Best for coding and agentic tasks ($15/$60 per 1M tokens)
- GPT-5 mini - Faster, cost-efficient ($0.15/$0.60)
- GPT-5 nano - Fastest, most efficient ($0.05/$0.20)
- GPT-4.1 - Smartest non-reasoning model ($5/$15)
- GPT-4o - Fast, intelligent, flexible ($2.50/$10)
- GPT-4o mini - Affordable small model ($0.15/$0.60)

**Anthropic Models:**
- Claude Opus 4 - Most capable for complex tasks ($15/$75)
- Claude Sonnet 4 - Balanced intelligence/speed ($3/$15)
- Claude 3.5 Sonnet - Previous generation ($3/$15)
- Claude 3.5 Haiku - Fastest and compact ($0.80/$4)

**Ollama (Local):**
- Llama 3.3 70B - Meta's latest large model (Free, local)
- Llama 3.2 3B - Small, fast (Free, local)
- Qwen 2.5 14B - Alibaba's capable model (Free, local)
- Mistral 7B - Fast and efficient (Free, local)

### 3. **Settings Composable** (`useChatbotSettings`)
- ✅ Provider management
- ✅ API key storage in localStorage
- ✅ Model selection
- ✅ Enhanced mode toggle
- ✅ Auto-save on changes
- ✅ Validation helpers

### 4. **UI Components Created**
- ✅ Label component (radix-vue based)
- ✅ RadioGroup component
- ✅ RadioGroupItem component
- ✅ ChatbotSettings dialog

### 5. **Chat Interface Updates**
- ✅ Settings button in both popover and fullscreen headers
- ✅ Enhanced mode indicator (sparkles icon)
- ✅ Settings dialog integration

---

## How It Works

### User Flow

1. **Initial State (Simple Mode)**
   - User clicks bot icon, opens popover
   - Gets keyword-based search results
   - No API key required

2. **Configuration**
   - User clicks Settings button (gear icon)
   - Selects provider (OpenAI/Anthropic/Ollama)
   - Enters API key (or installs Ollama)
   - Selects model from available list
   - Tests connection (format validation)

3. **Enhanced Mode**
   - Toggle "Enhanced Mode" when configured
   - System now uses LLM for responses
   - Search results sent as context to LLM
   - Natural, conversational responses

### Storage

All settings stored in localStorage:
```json
{
  "provider": "openai",
  "apiKey": "sk-...",
  "model": "gpt-5-nano",
  "enhancedMode": true
}
```

### Privacy
- API keys never sent to our servers
- All stored locally in browser
- Direct API calls from browser to provider
- No server-side logging

---

## What's Next (Not Yet Implemented)

### LLM Integration Composable
Create `useLLMChat.ts` with:
- OpenAI Chat Completions API integration
- Anthropic Messages API integration
- Ollama API integration
- Streaming support
- Error handling
- Token counting

### Enhanced Response Generation
Update `sendMessage()` in AIChatInterface:
```typescript
if (settings.value.enhancedMode && isConfigured.value) {
  // Use LLM with search results as context
  const llmResponse = await generateLLMResponse(query, results)
  assistantMessage.content = llmResponse
} else {
  // Use simple template-based response
  assistantMessage.content = buildContextResponse(query, results)
}
```

### Features to Add
1. **Streaming Responses** - Show tokens as they arrive
2. **Conversation Context** - Send previous messages to LLM
3. **Token Usage Display** - Show cost per query
4. **Error Handling** - API errors, rate limits, invalid keys
5. **Prompt Engineering** - System prompt for educational context
6. **Model-Specific Optimizations** - Different prompts per provider

---

## Testing Checklist

### Settings UI
- [ ] Open settings from popover header
- [ ] Open settings from fullscreen header
- [ ] Switch between providers
- [ ] Enter API key and see it obscured
- [ ] Toggle show/hide on API key
- [ ] Test connection with valid format
- [ ] Test connection with invalid format
- [ ] Select different models
- [ ] Enable enhanced mode
- [ ] Verify settings persist after close
- [ ] Clear API key
- [ ] Check Ollama info panel

### Integration
- [ ] Settings persist across page refresh
- [ ] Enhanced mode indicator shows when enabled
- [ ] Can't enable enhanced mode without API key
- [ ] Ollama doesn't require API key

---

## API Integration Examples

### OpenAI
```typescript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model: 'gpt-5-nano',
    messages: [
      { role: 'system', content: 'You are a learning assistant...' },
      { role: 'user', content: query }
    ],
    temperature: 0.7
  })
})
```

### Anthropic
```typescript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      { role: 'user', content: query }
    ]
  })
})
```

### Ollama
```typescript
const response = await fetch('http://localhost:11434/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'llama3.3:70b',
    messages: [
      { role: 'user', content: query }
    ],
    stream: false
  })
})
```

---

## Cost Estimates

### Per Query (1K tokens in, 500 tokens out)

**OpenAI:**
- GPT-5-nano: $0.0001 per query
- GPT-5-mini: $0.00045 per query
- GPT-5.2: $0.045 per query

**Anthropic:**
- Claude Haiku: $0.0028 per query
- Claude Sonnet: $0.0105 per query
- Claude Opus: $0.0525 per query

**Ollama:**
- All models: Free (runs locally)

### Monthly Usage (100 queries/month)

- GPT-5-nano: $0.01/month
- GPT-5-mini: $0.04/month
- Claude Haiku: $0.28/month
- Claude Sonnet: $1.05/month

**Recommendation:** Start with GPT-5-nano or Claude Haiku for cost-effective enhanced responses.

---

## Security Considerations

✅ **Implemented:**
- API keys stored in localStorage
- Keys never sent to our servers
- Direct browser-to-provider API calls
- Privacy notice displayed

⚠️ **To Consider:**
- localStorage accessible by all scripts on domain
- Consider warning about shared computers
- Add option to clear keys on logout
- No encryption (browser storage limitation)

---

## Documentation for Users

### Getting Started with Enhanced Mode

1. **Choose Your Provider**
   - **OpenAI**: Best for fast, cost-effective responses
   - **Anthropic**: Best for detailed, thoughtful answers
   - **Ollama**: Best for privacy (runs on your computer)

2. **Get an API Key**
   - OpenAI: Visit https://platform.openai.com/api-keys
   - Anthropic: Visit https://console.anthropic.com/settings/keys
   - Ollama: Install from https://ollama.com

3. **Configure Settings**
   - Click the settings button (gear icon)
   - Select your provider
   - Paste your API key
   - Choose a model (start with the cheapest)
   - Enable Enhanced Mode

4. **Start Chatting**
   - Ask natural questions
   - Get AI-powered responses with context from our materials
   - Switch back to simple mode anytime

---

## Future Enhancements

### Tier 2 Features (Optional)
- Pre-compute embeddings for all content
- Use embeddings for semantic search
- Only use API for query embeddings
- Store embeddings in search index

### Tier 3 Features (Optional)
- Download local embedding models
- 100% offline operation
- No API costs
- Larger initial download (~20MB)

### Advanced Features
- Multi-turn conversations with context
- Learning path generation
- Course builder assistant for faculty
- Content gap analysis
- Prerequisites validation
- Personalized recommendations
