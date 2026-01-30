#!/bin/bash
# Deployment Verification Checklist for AI Optimization

echo "🔍 Checking AI Model Optimization Status..."
echo ""

# Check 1: Verify no GPT-3.5 references in active code
echo "1️⃣  Checking for paid model references in source code..."
if grep -r "gpt-3.5\|openai/" --include="*.ts" --include="*.tsx" app/ lib/ | grep -v "node_modules\|docs\|\.next"; then
    echo "⚠️  WARNING: Found paid model references in source code!"
else
    echo "✅ No paid model references found in active code"
fi
echo ""

# Check 2: Verify config.ts has free model default
echo "2️⃣  Checking default model in config..."
if grep -q "meta-llama/llama-3-70b-instruct:free" lib/config.ts; then
    echo "✅ Config defaults to Llama 3 70B (FREE)"
else
    echo "❌ Config NOT set to free model"
fi
echo ""

# Check 3: Verify context window is optimized
echo "3️⃣  Checking context window optimization..."
if grep -q "maxLength: number = 6000" lib/utils.ts; then
    echo "✅ Context window optimized to 6000 chars"
else
    echo "⚠️  Context window not optimized to 6000"
fi
echo ""

# Check 4: Verify mock-papers uses Llama 3
echo "4️⃣  Checking mock-papers model configuration..."
if grep -q "meta-llama/llama-3-70b-instruct:free" app/api/mock-papers/generate/route.ts && \
   grep -q "qwen/qwen3-coder:free" app/api/mock-papers/generate/route.ts; then
    echo "✅ Mock-papers configured with Llama 3 (primary) + Qwen (fallback)"
else
    echo "❌ Mock-papers model configuration incorrect"
fi
echo ""

# Check 5: Environment variables
echo "5️⃣  Checking environment configuration..."
if [ -f ".env.local" ]; then
    if grep -q "OPENROUTER_API_KEY" .env.local; then
        echo "✅ OpenRouter API key present in .env.local"
    else
        echo "⚠️  OpenRouter API key missing in .env.local"
    fi
    
    if grep -q "OPENAI_API_KEY" .env.local; then
        echo "⚠️  WARNING: OpenAI API key still in .env.local - should be removed!"
    else
        echo "✅ OpenAI API key not in .env.local"
    fi
else
    echo "⚠️  .env.local file not found - check manually"
fi
echo ""

# Check 6: Compilation
echo "6️⃣  Checking TypeScript compilation..."
if npx tsc --noEmit 2>&1 | grep -q "error"; then
    echo "❌ TypeScript compilation errors found"
    npx tsc --noEmit
else
    echo "✅ TypeScript compilation clean"
fi
echo ""

# Check 7: All routes updated
echo "7️⃣  Verifying all routes use 6000 char context..."
for file in "documents/upload" "documents/process" "flashcards/generate" "mock-papers/generate"; do
    if grep -q "prepareTextForAI(text, 6000)" "app/api/$file/route.ts" 2>/dev/null || \
       grep -q "maxLength: number = 6000" "app/api/$file/route.ts" 2>/dev/null; then
        echo "  ✅ $file"
    else
        echo "  ⚠️  $file may need verification"
    fi
done
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "📋 DEPLOYMENT CHECKLIST"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Before deploying to Vercel:"
echo ""
echo "LOCAL TESTING:"
echo "  [ ] npm run dev (start development server)"
echo "  [ ] Test upload document → check topics extracted"
echo "  [ ] Test mock paper generation → verify questions from doc"
echo "  [ ] Test flashcard generation → check relevant cards"
echo "  [ ] Monitor browser console for errors"
echo ""
echo "VERCEL ENVIRONMENT:"
echo "  [ ] Remove OPENAI_API_KEY from Vercel (if present)"
echo "  [ ] Ensure OPENROUTER_API_KEY is set in Vercel"
echo "  [ ] Ensure NEXT_PUBLIC_APP_URL is correct"
echo "  [ ] Ensure MONGODB_URI is set"
echo "  [ ] Ensure JWT_SECRET is set"
echo ""
echo "GIT COMMIT:"
echo "  [ ] git add ."
echo "  [ ] git commit -m 'Optimize AI: Switch to free Llama 3 70B model with 6000 char context'"
echo "  [ ] git push origin main"
echo ""
echo "POST-DEPLOYMENT:"
echo "  [ ] Check Vercel deployment logs"
echo "  [ ] Test in production URL"
echo "  [ ] Monitor OpenRouter usage (should remain $0.00)"
echo "  [ ] Monitor Sentry for any errors"
echo ""
echo "═══════════════════════════════════════════════════════════"
