import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  plugins: [],
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["node_modules", ".next", "tests/setup.ts"],
    },
    // Increase timeout for slow tests (e.g., PDF extraction)
    testTimeout: 15000,
    hookTimeout: 10000,
  },
})
