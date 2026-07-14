import "@testing-library/jest-dom/vitest"

// Mock environment variables for tests
process.env.JWT_SECRET = "test-secret-key-for-testing-only-32chars!!"
process.env.MONGODB_URI = "mongodb://localhost:27017/test"
process.env.AI_API_KEY = "test-api-key"
process.env.OPENROUTER_API_KEY = "test-api-key"
process.env.AI_API_URL = "https://openrouter.ai/api/v1"
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000"
