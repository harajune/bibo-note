import { defineConfig } from 'vite'
import build from '@hono/vite-build/aws-lambda'
import devServer from '@hono/vite-dev-server'

export default defineConfig({
  build: {
    copyPublicDir: false,
  },
  plugins: [
    devServer({
      entry: 'src/index.ts',
    }),
    build({
      outputDir: 'dist/worker',
      entry: 'src/index.ts',
      minify: true,
    })
  ],
})