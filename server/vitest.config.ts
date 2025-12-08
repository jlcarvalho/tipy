import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    testTimeout: 120000, // 120 seconds for LLM evaluation tests (increased due to timeout issues)
    hookTimeout: 120000,
  },
});
