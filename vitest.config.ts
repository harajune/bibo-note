import { defineConfig } from 'vitest/config'

//TODO: don't forget to merge with vite.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  }
});
