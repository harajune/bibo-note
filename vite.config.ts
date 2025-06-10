import build from '@hono/vite-build/aws-lambda'
import honox from 'honox/vite'
import devServer, { defaultOptions } from '@hono/vite-dev-server'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    copyPublicDir: false
  },
  plugins: [
    devServer({
      entry: 'app/server.ts',
      exclude: [/.*\.svg$/, ...defaultOptions.exclude],
    }),
    honox({
      client: {
        input: ['/app/global.css'],
      }
    }), 
    build({
      outputDir: 'dist/worker',
    })
  ]
} as any)
