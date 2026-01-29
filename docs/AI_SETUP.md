# AI Configuration & Setup Guide

## Current Setup

**Model:** Qwen3 Coder (480B, A35B)  
**Provider:** OpenRouter  
**Context Window:** 256k tokens  
**Best For:** Large documents, accurate topic extraction, quality flashcards & mock papers

---

## Environment Variables

### Local Development (`.env.local`)
```env
AI_API_KEY=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
AI_PROVIDER=openrouter
AI_MODEL=qwen/qwen3-coder:free
AI_API_URL=https://openrouter.ai/api/v1
```

### Production (Vercel)
1. Go to **Project Settings → Environment Variables**
2. Add:
   - `OPENROUTER_API_KEY` = your OpenRouter key
   - `AI_MODEL` = `qwen/qwen3-coder:free`
   - `JWT_SECRET` = (already set)
   - `MONGODB_URI` = (already set)
   - `NEXT_PUBLIC_API_URL` = your production domain

---

## How AI is Used

### 1. **Topic Extraction** (`/api/documents/upload`)
- Identifies 3-8 main topics from uploaded documents
- Uses full document context (up to 256k tokens)
- Runs in background after upload

### 2. **Flashcard Generation** (`/api/flashcards/generate`)
- Creates 10-12 flashcards per document
- Covers entire document content
- Q&A format for study

### 3. **Mock Paper Generation** (`/api/mock-papers/generate`)
- Generates multiple choice + descriptive questions
- Balanced question distribution across topics
- With configurable difficulty

---

## Key Features

✅ **Full Document Processing**
- No more substring limitations
- Analyzes entire 5MB+ documents
- 256k token context window

✅ **Provider Flexibility**
- Switch providers without code changes
- Supports OpenRouter, OpenAI, Anthropic, Google, etc.
- Same config structure for all

✅ **Fallback Support**
- Auto-fallback to alternative models if needed
- Graceful error handling

---

## Switching Providers (If Needed)

### OpenAI (GPT-3.5)
```env
AI_PROVIDER=openai
AI_MODEL=gpt-3.5-turbo
AI_API_KEY=sk_your_openai_key
AI_API_URL=https://api.openai.com/v1
```

### Anthropic (Claude)
```env
AI_PROVIDER=anthropic
AI_MODEL=claude-3-haiku-20240307
AI_API_KEY=your_anthropic_key
AI_API_URL=https://api.anthropic.com/v1
```

### Google (Gemini)
```env
AI_PROVIDER=google
AI_MODEL=gemini-pro
AI_API_KEY=your_google_key
AI_API_URL=https://generativelanguage.googleapis.com/v1
```

---

## Code Implementation

### Text Preparation
All AI calls use intelligent text preprocessing:
```typescript
import { prepareTextForAI } from '@/lib/utils'

const fullText = document.extractedText
const preparedText = prepareTextForAI(fullText, 12000) // Smart truncation
```

### API Call Pattern
```typescript
const response = await fetch(`${config.ai.apiUrl}/chat/completions`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${config.ai.apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: config.ai.model,
    messages: [...],
    temperature: config.ai.temperature,
    max_tokens: config.ai.maxTokens,
  }),
})
```

---

## Troubleshooting

### "AI API key not configured"
- Verify `AI_API_KEY` or `OPENROUTER_API_KEY` is set
- Restart development server after updating .env

### "AI API error (401)"
- Check API key is valid
- Verify it hasn't expired on provider's dashboard

### "AI API error (429)"
- Rate limited by provider
- Check usage on provider dashboard
- Wait before retrying

### Empty topic extraction
- Ensure document is readable (PDF/DOCX/TXT)
- Check if document has extractable text
- Try with simpler document for testing

---

## Performance

- **Topic extraction:** ~3-5 seconds per document
- **Flashcard generation:** ~5-8 seconds
- **Mock paper generation:** ~8-12 seconds
- Token usage varies by document size

---

## Cost Estimates (Monthly)

For 1,000 documents × 10,000 tokens avg:

| Provider | Monthly Cost |
|----------|-------------|
| Qwen (OpenRouter) | $0.50 - $1.50 |
| Gemini | $0.75 - $2.00 |
| GPT-3.5 | $5.00 - $8.00 |
| Claude 3 Haiku | $2.50 - $5.00 |

---

## Related Files

- **Config:** `lib/config.ts`
- **Text Utils:** `lib/utils.ts`
- **Upload Route:** `app/api/documents/upload/route.ts`
- **Flashcard Route:** `app/api/flashcards/generate/route.ts`
- **Mock Paper Route:** `app/api/mock-papers/generate/route.ts`
