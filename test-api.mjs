// Test OpenRouter API connection
async function testOpenRouterAPI() {
  const apiKey = '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';
  const apiUrl = 'https://openrouter.ai/api/v1';
  const model = 'meta-llama/llama-3.3-70b-instruct';

  console.log('🔍 Testing OpenRouter API Connection...');
  console.log(`API Key: ${apiKey.substring(0, 20)}...`);
  console.log(`Model: ${model}`);
  console.log(`URL: ${apiUrl}`);

  try {
    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant.'
          },
          {
            role: 'user',
            content: 'Say "API works!" if you can read this.'
          }
        ],
        temperature: 0.3,
        max_tokens: 100
      })
    });

    console.log(`\n📊 Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorData = await response.text();
      console.log('❌ Error Response:', errorData);
      return false;
    }

    const data = await response.json();
    console.log('✅ Success! API Response:');
    console.log(data.choices[0]?.message?.content || 'No content');
    return true;

  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

testOpenRouterAPI().then(success => {
  if (success) {
    console.log('\n✨ API is working correctly!');
  } else {
    console.log('\n⚠️ API test failed - check your key and model name');
  }
  process.exit(success ? 0 : 1);
});
