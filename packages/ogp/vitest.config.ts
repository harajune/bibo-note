import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
})
