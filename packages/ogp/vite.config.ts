import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    copyPublicDir: false,
    lib: {
      entry: 'src/index.tsx',
      formats: ['cjs'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['@aws-sdk/client-s3', 'react', '@vercel/og'],
    },
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
})
