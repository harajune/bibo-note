import { defineConfig } from 'vite'
import build from '@hono/vite-build/aws-lambda'
import devServer from '@hono/vite-dev-server'

export default defineConfig({
  build: {
    copyPublicDir: false,
/*    lib: {
      entry: 'src/index.tsx',
      formats: ['cjs'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['@aws-sdk/client-s3', '@vercel/og', 'node:fs', 'node:path', 'smol-toml', 'uuid', 'react'],
    },*/
  },
  plugins: [
    devServer({
      entry: 'src/index.tsx',
    }),
    build({
      outputDir: 'dist/worker',
      entry: 'src/index.tsx',
    })
  ],
})
